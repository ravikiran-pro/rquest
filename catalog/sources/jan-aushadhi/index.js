'use strict';

/**
 * Source: the official list of generic medicines under Pradhan Mantri Bhartiya Janaushadhi
 * Pariyojana (PMBJP), published by the Press Information Bureau as an annexure to a Lok Sabha
 * reply. Pinned by URL + sha256; parsed by column position (see parse.js).
 *
 * Scope note: the list does not state drug schedules (H / H1 / X). Every item carries
 * attributes.prescription_status = 'unknown' so the app can keep prescription-only medicines
 * out of open listings until a pharmacist has classified them.
 */

const fs = require('fs');
const { downloadPinned } = require('../../lib/pinned');
const { pdfLines } = require('../../lib/pdftable');
const { cleanText, nameKey } = require('../../lib/text');
const { parseQuantity, formatQuantity } = require('../../lib/quantity');
const { itemEntities } = require('../../lib/itemEntities');
const { LoadError } = require('../../lib/loader');
const P = require('../../lib/product');
const { parseAnnexure } = require('./parse');

const NAME = 'jan-aushadhi';
const URL_ =
  'https://static.pib.gov.in/WriteReadData/specificdocs/documents/2026/feb/doc202626781701.pdf';
const SHA256 =
  'f54a140d9dc82880dcbb7672c18942417e8c9fe904376c742b6319665cdf9a08';
const LICENSE =
  'Government of India public document (Press Information Bureau)';
const BRAND = { key: 'jan aushadhi', display: 'Jan Aushadhi' };
const KNOWN_FOOTER = /(Union Minister|written reply|^\*+$|^PC\/PM$)/i;

const meta = {
  name: NAME,
  title:
    'PMBJP (Jan Aushadhi) generic medicines list — PIB annexure, as of 31.12.2025',
  license: LICENSE,
  attribution:
    'Generic medicines: Pradhan Mantri Bhartiya Janaushadhi Pariyojana, via the Press Information Bureau (pib.gov.in).',
  transformVersion: 1,
  maxRejectRatio: 0.01,
};

const DOSAGE_FORMS = [
  ['tablet', /\b(tablets?|tabs?)\b/i],
  ['capsule', /\b(capsules?|caps?)\b/i],
  ['injection', /\b(injections?|inj)\b/i],
  ['syrup', /\bsyrup\b/i],
  ['suspension', /\bsuspension\b/i],
  ['drops', /\bdrops\b/i],
  ['cream', /\bcream\b/i],
  ['ointment', /\bointment\b/i],
  ['gel', /\bgel\b/i],
  ['inhaler', /\b(inhaler|mdi|rotacaps?)\b/i],
  ['powder', /\bpowder\b/i],
  ['solution', /\bsolution\b/i],
  ['lotion', /\blotion\b/i],
  ['spray', /\bspray\b/i],
  ['sachet', /\bsachets?\b/i],
];
const dosageForm = (name) =>
  (DOSAGE_FORMS.find(([, re]) => re.test(name)) || [null])[0];

/** "10's" / "120's bottle" → count; otherwise the generic quantity parser ("30 ml", "10 gms tube"). */
function unitQuantity(unit) {
  const count = String(unit).match(/^(\d+)\s*['’]?\s*s\b/i);
  if (count && Number(count[1]) > 0)
    return { value: Number(count[1]), unit: 'pc', packCount: null };
  return parseQuantity(unit);
}

async function extract(ctx) {
  const file = await downloadPinned(ctx, {
    url: URL_,
    file: `${SHA256.slice(0, 16)}.pdf`,
    sha256: SHA256,
  });
  const parsed = parseAnnexure(await pdfLines(fs.readFileSync(file)));
  if (parsed.errors.length)
    throw new LoadError(
      'jan-aushadhi: annexure did not parse cleanly',
      parsed.errors.slice(0, 10)
    );
  return {
    version: `pib-annexure-${parsed.asOf}`,
    inputSha256: SHA256,
    parsed,
  };
}

function transform(input) {
  const { parsed } = input;
  const rejects = [];
  const review = [];
  const items = [];
  const itemSources = [];
  const forms = {};
  const seenCodes = new Set();

  for (const row of parsed.rows) {
    const name = cleanText(row.name);
    if (!name || !/^\d+$/.test(row.code)) {
      rejects.push({
        entity: 'items',
        source_key: row.code,
        reason: !name ? 'no_name' : 'bad_drug_code',
        raw: row,
      });
      continue;
    }
    if (seenCodes.has(row.code)) {
      rejects.push({
        entity: 'items',
        source_key: row.code,
        reason: 'duplicate_drug_code',
        raw: row,
      });
      continue;
    }
    seenCodes.add(row.code);
    const quantity = unitQuantity(row.unit);
    const form = dosageForm(name);
    forms[form || 'other'] = (forms[form || 'other'] || 0) + 1;
    const quality = P.qualityOf({
      name,
      brand: BRAND,
      quantity,
      category: 'ondc:RET19',
      gtin: null,
      image: null,
      diet: null,
    });
    // The PMBJP drug code is the stable identifier: pack-size changes keep the same item.
    const id = `src:${NAME}:${row.code}`;
    items.push({
      id,
      gtin: null,
      kind: 'product',
      name,
      name_key: nameKey(name),
      brand_key: BRAND.key,
      net_quantity: quantity ? quantity.value : null,
      unit: quantity ? quantity.unit : null,
      quantity_text: quantity ? formatQuantity(quantity) : null,
      taxonomy_node_id: 'ondc:RET19',
      classification_basis: 'curated',
      hsn_code: null,
      country_of_origin: null,
      manufacturer: null,
      image_url: null,
      attributes: {
        drug_code: row.code,
        unit_size: cleanText(row.unit),
        dosage_form: form,
        generic: true,
        prescription_status: 'unknown',
        prescription_note:
          'Drug schedule (H/H1/X) is not in the source list: classify before open sale.',
        list_as_of: parsed.asOf,
      },
      dedupe_key: null,
      status: quality.status,
      quality_score: quality.score,
      primary_source: NAME,
    });
    itemSources.push({
      source: NAME,
      source_id: row.code,
      item_id: id,
      license: LICENSE,
      source_url: URL_,
      source_modified_at: null,
      raw: row,
    });
  }

  for (const extra of parsed.extras) {
    review.push({
      kind: 'source_row_outside_stated_count',
      entity: 'item_source',
      entity_key: `${NAME}:${extra.code}`,
      payload: {
        serial: extra.sno,
        stated_count: parsed.expected,
        name: extra.name,
        page: extra.page,
        note: 'Loaded; confirm it belongs in the list.',
      },
    });
  }
  for (const p of parsed.problems.filter((x) => !KNOWN_FOOTER.test(x.text))) {
    review.push({
      kind: 'source_unparsed_line',
      entity: 'source',
      entity_key: `${NAME}:p${p.page}:${p.text.slice(0, 40)}`,
      payload: p,
    });
  }

  return {
    entities: {
      brands: [
        {
          brand_key: BRAND.key,
          name: BRAND.display,
          aliases: ['Janaushadhi', 'PMBJP'],
          source: NAME,
        },
      ],
      items,
      item_sources: itemSources,
    },
    rejects,
    review,
    inputCount: parsed.rows.length,
    notes: {
      stated_count: parsed.expected,
      parsed_rows: parsed.rows.length,
      extras: parsed.extras.length,
      dosage_forms: forms,
      as_of: parsed.asOf,
    },
  };
}

module.exports = { meta, entities: itemEntities(NAME), extract, transform };
