'use strict';

/**
 * Source: GST HSN (goods) + SAC (services) codes and chapter-level GST rates from the
 * `hsn-code-package` npm package (ISC). Codes derive from CBIC / WCO nomenclature.
 *
 * Known defects in the package that this transform corrects (see README):
 *   - 877 codes of chapters 01–09 lost their leading zero      → zero-padded
 *   - only 8-digit rows; no chapter/heading/subheading rows    → parents built
 *   - one guessed rate per chapter, incl. abolished 12%/28%    → collapsed, unverified;
 *                                                                 12/28 go to review
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { fetchJson, fetchBuffer } = require('../../lib/http');
const { sha256, sha256File, verifyIntegrity } = require('../../lib/hash');
const { readCsv } = require('../../lib/csv');
const {
  normalizeHsnDetailed,
  hsnType,
  parentOf,
  basisFor,
  cleanDescription,
  deriveDescription,
  collapseByPrefix,
} = require('../../lib/hsn');

const SOURCE = 'hsn-code-package';
const GST2_EFFECTIVE = '2025-09-22';
const GST2_SLABS = new Set([0, 0.1, 0.25, 1.5, 3, 5, 18, 40]);

const meta = {
  name: 'hsn',
  title:
    'GST HSN/SAC codes + chapter-level GST rates (hsn-code-package, CBIC/WCO-derived)',
  license: 'ISC (package). HSN/SAC codes are statutory nomenclature (CBIC).',
  attribution:
    'HSN/SAC data via hsn-code-package (github.com/karthi-21/HSN-Code-Package), ISC.',
  package: 'hsn-code-package',
  version: '3.0.0',
  transformVersion: 2,
  maxRejectRatio: 0.01,
};

const entities = [
  {
    table: 'hsn_codes',
    key: ['code'],
    columns: [
      'code',
      'type',
      'parent_code',
      'description',
      'description_raw',
      'description_basis',
    ],
    maxDeactivateRatio: 0.02,
  },
  {
    table: 'hsn_source_descriptions',
    key: ['code', 'source'],
    columns: ['code', 'source', 'description'],
    scope: `t.source = '${SOURCE}'`,
  },
  {
    table: 'hsn_rates',
    key: ['code', 'effective_from'],
    columns: [
      'code',
      'effective_from',
      'effective_to',
      'igst_rate',
      'cess_rate',
      'basis',
      'verified',
      'source',
      'notification_ref',
    ],
    scope: `t.source = '${SOURCE}'`,
    // Active verified rows are untouchable; once an override is withdrawn (inactive),
    // the source may reclaim the row with its own (unverified) value.
    protect: 'NOT (t.verified AND t.is_active)',
    maxDeactivateRatio: 0.1,
    // A verified rate (e.g. from seeds/hsn_rate_overrides.csv) wins: drop staged package
    // rates that would overlap it, instead of failing on the exclusion constraint.
    beforeUpsert: async (client, staging) => {
      const res = await client.query(
        `DELETE FROM ${staging} s USING catalog.hsn_rates t
          WHERE t.code = s.code AND t.is_active AND t.verified AND t.source <> s.source
            AND daterange(t.effective_from, t.effective_to, '[)') && daterange(s.effective_from, s.effective_to, '[)')`
      );
      return res.rowCount;
    },
  },
];

async function extract(ctx) {
  const dir = path.join(ctx.cacheDir, meta.version);
  const tgz = path.join(dir, `${meta.package}-${meta.version}.tgz`);
  const integrityFile = `${tgz}.integrity`;
  if (!fs.existsSync(tgz) || !fs.existsSync(integrityFile)) {
    ctx.log(
      `  downloading ${meta.package}@${meta.version} from the npm registry`
    );
    const info = await fetchJson(
      `https://registry.npmjs.org/${meta.package}/${meta.version}`
    );
    const buffer = await fetchBuffer(info.dist.tarball);
    verifyIntegrity(buffer, info.dist.integrity);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tgz, buffer);
    fs.writeFileSync(integrityFile, info.dist.integrity);
  }
  // Re-verify the cached tarball every run; a corrupted cache must never be loaded.
  verifyIntegrity(
    fs.readFileSync(tgz),
    fs.readFileSync(integrityFile, 'utf8').trim()
  );

  const extracted = path.join(dir, 'package', 'data');
  if (!fs.existsSync(path.join(extracted, 'gst_rates.json'))) {
    // Only the data files are unpacked; none of the package's code is ever executed.
    execFileSync('tar', ['-xzf', tgz, '-C', dir, 'package/data']);
  }
  const read = (f) =>
    JSON.parse(fs.readFileSync(path.join(extracted, f), 'utf8'));

  const chaptersFile = path.join(ctx.config.seedDir, 'hsn_chapters.csv');
  const headingsFile = path.join(ctx.config.seedDir, 'hsn_headings.csv');
  const supplementFile = path.join(ctx.config.seedDir, 'hsn_supplement.csv');
  const shas = await Promise.all(
    [tgz, chaptersFile, headingsFile, supplementFile].map(sha256File)
  );
  return {
    version: `${meta.package}@${meta.version}`,
    inputSha256: sha256(shas.join(':')),
    hsn: read('hsn_codes.json'),
    sac: read('sac_codes.json'),
    rates: read('gst_rates.json'),
    packageMeta: read('metadata.json'),
    chapters: readCsv(chaptersFile),
    headings: readCsv(headingsFile),
    supplement: readCsv(supplementFile),
  };
}

function transform(input) {
  const rejects = [];
  const review = [];
  const reject = (entity, sourceKey, reason, raw) =>
    rejects.push({ entity, source_key: sourceKey, reason, raw });

  // 1. Source codes → canonical codes (dedupe by the normalised code, first wins).
  const sourceCodes = new Map();
  let zeroPadded = 0;
  const take = (rec, expectedType) => {
    const { code, padded, error } = normalizeHsnDetailed(rec.code);
    if (!code)
      return reject('hsn_codes', rec.code, `invalid_code:${error}`, rec);
    if (hsnType(code) !== expectedType)
      return reject(
        'hsn_codes',
        rec.code,
        `type_mismatch:expected_${expectedType}`,
        rec
      );
    if (sourceCodes.has(code))
      return reject('hsn_codes', rec.code, `duplicate_code:${code}`, rec);
    if (padded) zeroPadded += 1;
    const description = cleanDescription(rec.description);
    // A real code with no usable text (e.g. "-" for alcoholic beverages, which are outside
    // GST): keep the code so the hierarchy has no holes, but flag it and distrust its rate.
    sourceCodes.set(code, {
      type: expectedType,
      description: description || `Code ${code} (no description in source)`,
      raw: rec.description,
      placeholder: !description,
    });
    if (!description) {
      review.push({
        kind: 'hsn_description_missing',
        entity: 'hsn_code',
        entity_key: code,
        payload: {
          source: SOURCE,
          source_description: rec.description ?? null,
          action: 'Fill in from the CBIC tariff.',
        },
      });
    }
    return undefined;
  };
  input.hsn.forEach((r) => take(r, 'HSN'));
  input.sac.forEach((r) => take(r, 'SAC'));

  // 1b. Curated supplement: real tariff codes the package lacks.
  let supplemented = 0;
  for (const rec of input.supplement) {
    const { code, error } = normalizeHsnDetailed(rec.code);
    const description = cleanDescription(rec.description);
    if (!code || !description) {
      reject(
        'hsn_codes',
        rec.code,
        `invalid_supplement:${error || 'empty_description'}`,
        rec
      );
      continue;
    }
    if (sourceCodes.has(code)) {
      review.push({
        kind: 'hsn_supplement_redundant',
        entity: 'hsn_code',
        entity_key: code,
        payload: {
          source: SOURCE,
          action:
            'The package now has this code: delete it from seeds/hsn_supplement.csv.',
        },
      });
      continue;
    }
    sourceCodes.set(code, {
      type: hsnType(code),
      description,
      raw: null,
      placeholder: false,
      curated: true,
    });
    supplemented += 1;
  }

  // 2. Complete the hierarchy: every code needs its 2/4/6-digit ancestors.
  // Curated titles (chapters + selected headings) beat derived labels at any level.
  const curatedTitles = new Map();
  for (const c of [...input.chapters, ...input.headings]) {
    const code = normalizeHsnDetailed(c.code).code;
    const title = cleanDescription(c.title);
    if (!code || !title)
      reject('hsn_codes', c.code, 'invalid_curated_title', c);
    else curatedTitles.set(code, title);
  }
  // Missing ancestors and the direct children of every code.
  const missing = new Set();
  const children = new Map();
  for (const code of sourceCodes.keys()) {
    for (let c = code, p = parentOf(c); p; c = p, p = parentOf(p)) {
      if (!children.has(p)) children.set(p, new Set());
      children.get(p).add(c);
      if (!sourceCodes.has(p)) missing.add(p);
    }
  }
  const codeRows = [];
  const basisCount = {
    source: 0,
    placeholder: 0,
    curated: 0,
    derived: 0,
    fallback: 0,
  };
  for (const [code, rec] of sourceCodes) {
    const basis = rec.curated
      ? 'curated'
      : rec.placeholder
      ? 'placeholder'
      : 'source';
    codeRows.push({
      code,
      type: rec.type,
      parent_code: parentOf(code),
      description: rec.description,
      description_raw: rec.raw,
      description_basis: basis,
    });
    basisCount[basis] += 1;
  }
  // Bottom-up (6 → 4 → 2 digits), one vote per DIRECT child: a heading's label comes from
  // its subheadings, so one large subheading cannot impose its own wording on the heading.
  const labelFor = new Map(); // code -> usable description (null for placeholders/fallbacks)
  for (const [code, rec] of sourceCodes)
    labelFor.set(code, rec.placeholder ? null : rec.description);
  for (const code of [...missing].sort(
    (a, b) => b.length - a.length || (a < b ? -1 : 1)
  )) {
    let description = curatedTitles.get(code) || null;
    let basis = 'curated';
    if (!description) {
      basis = 'derived';
      const childLabels = [...children.get(code)]
        .sort()
        .map((c) => labelFor.get(c));
      description = deriveDescription(childLabels);
      if (!description) {
        basisCount.fallback += 1;
        description = `${
          { 2: 'Chapter', 4: 'Heading', 6: 'Subheading' }[code.length]
        } ${code}`;
        review.push({
          kind: 'hsn_description_fallback',
          entity: 'hsn_code',
          entity_key: code,
          payload: {
            source: SOURCE,
            action: 'Add the official title to seeds/hsn_headings.csv.',
          },
        });
      }
    }
    labelFor.set(
      code,
      basis === 'derived' &&
        /^(Chapter|Heading|Subheading) \d+$/.test(description)
        ? null
        : description
    );
    basisCount[basis] += 1;
    codeRows.push({
      code,
      type: hsnType(code),
      parent_code: parentOf(code),
      description,
      description_raw: null,
      description_basis: basis,
    });
  }

  const descriptionRows = [...sourceCodes]
    .filter(([, rec]) => !rec.placeholder && !rec.curated)
    .map(([code, rec]) => ({
      code,
      source: SOURCE,
      description: rec.description,
    }));

  // 3. Rates: validate per code, then collapse to the shortest prefix where all agree.
  const rateByCode = new Map();
  for (const rec of input.rates) {
    const { code } = normalizeHsnDetailed(rec.code);
    if (!code || !sourceCodes.has(code)) {
      reject('hsn_rates', rec.code, 'rate_for_unknown_code', rec);
      continue;
    }
    if (rateByCode.has(code)) {
      reject('hsn_rates', rec.code, 'duplicate_rate', rec);
      continue;
    }
    const igst = Number(rec.igstRate);
    const cess = Number(rec.cessRate || 0);
    if (
      !Number.isFinite(igst) ||
      igst < 0 ||
      !Number.isFinite(cess) ||
      cess < 0
    ) {
      reject('hsn_rates', rec.code, 'rate_not_a_number', rec);
      continue;
    }
    if (Math.abs(Number(rec.cgstRate) + Number(rec.sgstRate) - igst) > 1e-9) {
      reject('hsn_rates', rec.code, 'cgst_plus_sgst_not_igst', rec);
      continue;
    }
    if (rec.effectiveFrom !== GST2_EFFECTIVE) {
      reject(
        'hsn_rates',
        rec.code,
        `unexpected_effective_from:${rec.effectiveFrom}`,
        rec
      );
      continue;
    }
    rateByCode.set(code, {
      igst,
      cess,
      notification: rec.notificationRef || null,
    });
  }

  // Every HSN source code takes part — codes without a rate block a prefix from
  // collapsing, so a chapter rate never covers a code the source did not rate.
  const leafKeys = new Map();
  for (const [code, rec] of sourceCodes) {
    if (rec.type !== 'HSN') continue;
    const r = rec.placeholder || rec.curated ? null : rateByCode.get(code);
    if (!r) leafKeys.set(code, 'NONE');
    else {
      const valid = GST2_SLABS.has(r.igst);
      leafKeys.set(
        code,
        `${valid ? 'OK' : 'INVALID'}|${r.igst}|${r.cess}|${r.notification}`
      );
    }
  }
  const rateRows = [];
  const leavesUnder = (prefix) =>
    [...leafKeys.keys()].filter((c) => c.startsWith(prefix)).length;
  for (const { code, key } of collapseByPrefix(leafKeys)) {
    if (key === 'NONE') continue;
    const [status, igst, cess, notification] = key.split('|');
    if (status === 'INVALID') {
      review.push({
        kind: 'rate_invalid_slab',
        entity: 'hsn_rate',
        entity_key: code,
        payload: {
          source: SOURCE,
          source_igst_rate: Number(igst),
          codes_covered: leavesUnder(code),
          effective_from: GST2_EFFECTIVE,
          reason:
            'GST 2.0 (22 Sep 2025) abolished the 12% and 28% slabs; this rate cannot be right.',
          action:
            'Add the correct rate(s) to seeds/hsn_rate_overrides.csv from the CBIC schedule.',
        },
      });
      continue;
    }
    rateRows.push({
      code,
      effective_from: GST2_EFFECTIVE,
      effective_to: null,
      igst_rate: Number(igst),
      cess_rate: Number(cess),
      basis: basisFor(code),
      verified: false,
      source: SOURCE,
      notification_ref: notification === 'null' ? null : notification,
    });
  }

  return {
    entities: {
      hsn_codes: codeRows,
      hsn_source_descriptions: descriptionRows,
      hsn_rates: rateRows,
    },
    rejects,
    review,
    inputCount: input.hsn.length + input.sac.length + input.rates.length,
    notes: {
      package_reported_version: input.packageMeta.version,
      source_codes: sourceCodes.size,
      zero_padded_codes: zeroPadded,
      supplemented_codes: supplemented,
      description_basis: basisCount,
      rate_rows_after_collapse: rateRows.length,
      rate_groups_sent_to_review: review.filter(
        (r) => r.kind === 'rate_invalid_slab'
      ).length,
      codes_missing_description: review.filter(
        (r) => r.kind === 'hsn_description_missing'
      ).length,
    },
  };
}

module.exports = { meta, entities, extract, transform };
