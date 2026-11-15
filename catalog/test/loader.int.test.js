'use strict';

/**
 * Integration tests against a real Postgres. Opt-in:
 *   CATALOG_TEST_DATABASE_URL=postgres://.../<name>_test npm test
 * The database name MUST end in "_test" — the suite drops and recreates schema `catalog`.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { connect } = require('../lib/db');
const { migrate } = require('../db/schema');
const { upsertEntity, syncReview, LoadError } = require('../lib/loader');
const { runSource } = require('../lib/run');
const { normalizeHsn } = require('../lib/hsn');

const URL_ = process.env.CATALOG_TEST_DATABASE_URL;
const enabled =
  URL_ &&
  /_test(\?|$)/.test(new URL(URL_).pathname + (new URL(URL_).search || ''));
const opts = {
  skip: enabled
    ? false
    : 'set CATALOG_TEST_DATABASE_URL (db name ending in _test)',
};

const CODES = {
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
};
const RATES = {
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
  scope: "t.source = 'pkg'",
  protect: 'NOT t.verified',
};

const code = (
  c,
  description,
  parent = c.length > 2 ? c.slice(0, -2) : null
) => ({
  code: c,
  type: c.startsWith('99') ? 'SAC' : 'HSN',
  parent_code: parent,
  description,
  description_raw: description,
  description_basis: 'source',
});
const baseCodes = () => [
  code('04', 'Dairy'),
  code('0401', 'Milk'),
  code('040110', 'Milk, fat <=1%'),
  code('04011010', 'Milk, fat <=1%, in packs'),
  code('99', 'Services'),
];

let client;
let runSeq = 0;

async function newRun() {
  runSeq += 1;
  const r = await client.query(
    "INSERT INTO catalog.import_runs (source, status) VALUES ('test', 'running') RETURNING id"
  );
  return r.rows[0].id;
}

async function inTx(fn) {
  await client.query('BEGIN');
  try {
    const out = await fn();
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

test.before(async () => {
  if (!enabled) return;
  client = await connect(URL_);
  await client.query('DROP SCHEMA IF EXISTS catalog CASCADE');
  await migrate(client, { log: () => {} });
});
test.after(async () => client && client.end());

test(
  'bulk insert, then an identical re-load writes nothing',
  opts,
  async () => {
    const s1 = await inTx(async () =>
      upsertEntity(client, await newRun(), CODES, baseCodes())
    );
    assert.deepEqual(s1, {
      staged: 5,
      inserted: 5,
      updated: 0,
      unchanged: 0,
      deactivated: 0,
      skipped: 0,
    });

    const before = await client.query(
      'SELECT code, updated_at FROM catalog.hsn_codes ORDER BY code'
    );
    const s2 = await inTx(async () =>
      upsertEntity(client, await newRun(), CODES, baseCodes())
    );
    assert.deepEqual(s2, {
      staged: 5,
      inserted: 0,
      updated: 0,
      unchanged: 5,
      deactivated: 0,
      skipped: 0,
    });
    const after = await client.query(
      'SELECT code, updated_at FROM catalog.hsn_codes ORDER BY code'
    );
    assert.deepEqual(
      after.rows,
      before.rows,
      'unchanged rows are not touched at all'
    );
  }
);

test('only changed rows are updated', opts, async () => {
  const rows = baseCodes();
  rows[1].description = 'Milk and cream';
  const s = await inTx(async () =>
    upsertEntity(client, await newRun(), CODES, rows)
  );
  assert.equal(s.updated, 1);
  assert.equal(s.unchanged, 4);
});

test(
  'a row missing from the source is soft-deactivated, guarded by the shrink limit',
  opts,
  async () => {
    const rows = baseCodes().filter((r) => r.code !== '04011010');
    await assert.rejects(
      inTx(async () => upsertEntity(client, await newRun(), CODES, rows)),
      (err) =>
        err instanceof LoadError && /would deactivate 1 of 5/.test(err.message)
    );
    const still = await client.query(
      "SELECT is_active FROM catalog.hsn_codes WHERE code = '04011010'"
    );
    assert.equal(
      still.rows[0].is_active,
      true,
      'guardrail failure rolled everything back'
    );

    const s = await inTx(async () =>
      upsertEntity(client, await newRun(), CODES, rows, { allowShrink: true })
    );
    assert.equal(s.deactivated, 1);
    const row = await client.query(
      "SELECT is_active FROM catalog.hsn_codes WHERE code = '04011010'"
    );
    assert.equal(
      row.rows[0].is_active,
      false,
      'never deleted, only deactivated'
    );

    const back = await inTx(async () =>
      upsertEntity(client, await newRun(), CODES, baseCodes())
    );
    assert.equal(back.updated, 1, 'reappearing row is reactivated');
  }
);

test('duplicate keys in one batch abort the load', opts, async () => {
  const rows = [...baseCodes(), code('0401', 'Milk again')];
  await assert.rejects(
    inTx(async () => upsertEntity(client, await newRun(), CODES, rows)),
    (err) => err instanceof LoadError && /duplicate keys/.test(err.message)
  );
});

test(
  'database enforces HSN shape, SAC chapter and parent prefix',
  opts,
  async () => {
    const bad = [
      [code('4011010', 'odd length', '040110'), /hsn_codes_code_check/],
      [
        { ...code('0402', 'SAC in HSN chapter'), type: 'SAC' },
        /hsn_sac_is_chapter_99/,
      ],
      [code('0402', 'wrong parent', '05'), /hsn_parent_is_prefix/],
      [
        code('050199', 'orphan: parent 0501 does not exist'),
        /hsn_codes_parent_code_fkey/,
      ],
      [code('0403', 'valid new heading'), null], // control case last: it commits
    ];
    for (const [row, expected] of bad) {
      const attempt = inTx(async () =>
        upsertEntity(client, await newRun(), CODES, [...baseCodes(), row])
      );
      if (expected) await assert.rejects(attempt, expected);
      else await attempt; // control case: a valid new code loads fine
    }
  }
);

test(
  'GST 2.0 slabs and non-overlapping rate periods are enforced',
  opts,
  async () => {
    const rate = (c, from, igst, extra = {}) => ({
      code: c,
      effective_from: from,
      effective_to: null,
      igst_rate: igst,
      cess_rate: 0,
      basis: c.length === 2 ? 'chapter' : 'item',
      verified: false,
      source: 'pkg',
      notification_ref: 'test',
      ...extra,
    });
    await assert.rejects(
      inTx(async () =>
        upsertEntity(client, await newRun(), RATES, [
          rate('04', '2025-09-22', 12),
        ])
      ),
      /hsn_rates_gst2_slabs/
    );
    // Historic 12% is fine before GST 2.0, but its period must end before the new one starts.
    await assert.rejects(
      inTx(async () =>
        upsertEntity(client, await newRun(), RATES, [
          rate('04', '2017-07-01', 12),
          rate('04', '2025-09-22', 5),
        ])
      ),
      /hsn_rates_no_overlap/
    );
    const ok = await inTx(async () =>
      upsertEntity(client, await newRun(), RATES, [
        rate('04', '2017-07-01', 12, { effective_to: '2025-09-22' }),
        rate('04', '2025-09-22', 5),
        rate('04011010', '2025-09-22', 0),
      ])
    );
    assert.equal(ok.inserted, 3);

    const lookup = async (c, on) =>
      (await client.query('SELECT * FROM catalog.gst_rate($1, $2)', [c, on]))
        .rows[0];
    assert.equal(
      Number((await lookup('4011010', '2026-01-01')).igst_rate),
      0,
      'item beats chapter; 7-digit input normalised'
    );
    assert.equal((await lookup('0401', '2026-01-01')).matched_code, '04');
    assert.equal(
      Number((await lookup('0401', '2020-01-01')).igst_rate),
      12,
      'date-versioned'
    );
    assert.equal(await lookup('0501', '2026-01-01'), undefined);
  }
);

test(
  'verified (manual) rates are never overwritten or deactivated by a source',
  opts,
  async () => {
    await client.query(
      "UPDATE catalog.hsn_rates SET verified = true WHERE code = '04011010' AND effective_from = '2025-09-22'"
    );
    const s = await inTx(async () =>
      upsertEntity(
        client,
        await newRun(),
        RATES,
        [
          {
            code: '04011010',
            effective_from: '2025-09-22',
            effective_to: null,
            igst_rate: 5,
            cess_rate: 0,
            basis: 'item',
            verified: false,
            source: 'pkg',
            notification_ref: 'x',
          },
        ],
        { allowShrink: true }
      )
    );
    assert.equal(s.updated, 0);
    const r = await client.query(
      "SELECT igst_rate, is_active FROM catalog.hsn_rates WHERE code = '04011010'"
    );
    assert.equal(Number(r.rows[0].igst_rate), 0);
    assert.equal(r.rows[0].is_active, true);
  }
);

test('SQL normalize_hsn matches lib/hsn.js', opts, async () => {
  const inputs = [
    '1011010',
    '0101.10.10',
    '401',
    '4',
    '9954',
    '995411',
    '99541',
    '123456789',
    'abc',
    '',
    '07 13 10 00',
  ];
  for (const input of inputs) {
    const { rows } = await client.query(
      'SELECT catalog.normalize_hsn($1) AS c',
      [input]
    );
    assert.equal(
      rows[0].c,
      normalizeHsn(input),
      `input ${JSON.stringify(input)}`
    );
  }
});

test(
  'review queue: no duplicates on re-run, auto-resolves when the issue disappears',
  opts,
  async () => {
    const item = (k) => ({
      kind: 'rate_invalid_slab',
      entity: 'hsn_rate',
      entity_key: k,
      payload: { rate: 12 },
    });
    const r1 = await inTx(async () =>
      syncReview(client, await newRun(), 'test-src', [item('A'), item('B')])
    );
    assert.equal(r1.opened, 2);
    const r2 = await inTx(async () =>
      syncReview(client, await newRun(), 'test-src', [item('A'), item('B')])
    );
    assert.deepEqual([r2.opened, r2.refreshed, r2.auto_resolved], [0, 0, 0]);
    const r3 = await inTx(async () =>
      syncReview(client, await newRun(), 'test-src', [item('A')])
    );
    assert.equal(r3.auto_resolved, 1);
    const open = await client.query(
      "SELECT entity_key FROM catalog.review_queue WHERE source = 'test-src' AND status = 'open'"
    );
    assert.deepEqual(
      open.rows.map((r) => r.entity_key),
      ['A']
    );
  }
);

test(
  'runSource: dry run persists nothing; real run commits; unchanged input is skipped',
  opts,
  async () => {
    await client.query(
      "DELETE FROM catalog.hsn_rates; DELETE FROM catalog.hsn_codes WHERE code LIKE '07%'"
    );
    const fake = {
      meta: {
        name: 'fake',
        title: 'Fake',
        license: 'CC0',
        transformVersion: 1,
      },
      entities: [{ ...CODES, scope: "t.code LIKE '07%'" }],
      extract: async () => ({ version: '1.0.0', inputSha256: 'abc' }),
      transform: async () => ({
        entities: {
          hsn_codes: [code('07', 'Vegetables'), code('0701', 'Potatoes')],
        },
        rejects: [
          {
            entity: 'hsn_codes',
            source_key: 'x',
            reason: 'bad',
            raw: { a: 1 },
          },
        ],
        review: [],
        inputCount: 3,
        notes: {},
      }),
    };
    const snapshotDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-test-'));
    const quiet = {
      log: () => {},
      databaseUrl: URL_,
      allowRejects: true,
      snapshotDir,
    };
    const dry = await runSource(fake, { ...quiet, dryRun: true });
    assert.equal(dry.status, 'dry_run');
    assert.equal(dry.stats.hsn_codes.inserted, 2);
    const none = await client.query(
      "SELECT count(*)::int AS n FROM catalog.hsn_codes WHERE code LIKE '07%'"
    );
    assert.equal(none.rows[0].n, 0, 'dry run rolled back');

    const real = await runSource(fake, quiet);
    assert.equal(real.status, 'succeeded');
    const two = await client.query(
      "SELECT count(*)::int AS n FROM catalog.hsn_codes WHERE code LIKE '07%'"
    );
    assert.equal(two.rows[0].n, 2);
    const rej = await client.query(
      'SELECT count(*)::int AS n FROM catalog.rejects WHERE run_id = $1',
      [real.runId]
    );
    assert.equal(rej.rows[0].n, 1);

    const again = await runSource(fake, quiet);
    assert.equal(again.status, 'skipped');

    // Input A → B → A: the return to A must reload, not be skipped as "seen before".
    const withInput = (sha, rows) => ({
      ...fake,
      extract: async () => ({ version: '1.0.0', inputSha256: sha }),
      transform: async () => ({
        entities: { hsn_codes: rows },
        rejects: [],
        review: [],
        inputCount: rows.length,
      }),
    });
    const b = await runSource(
      withInput('def', [
        code('07', 'Vegetables (B)'),
        code('0701', 'Potatoes'),
      ]),
      quiet
    );
    assert.equal(b.stats.hsn_codes.updated, 1);
    const a2 = await runSource(
      withInput('abc', [code('07', 'Vegetables'), code('0701', 'Potatoes')]),
      quiet
    );
    assert.equal(a2.status, 'succeeded');
    assert.equal(a2.stats.hsn_codes.updated, 1);
    assert.ok(runSeq > 0);
  }
);

// ── product layer ─────────────────────────────────────────────────────────────────

const { itemEntities } = require('../lib/itemEntities');
const { findDuplicates, mergeItems, setItemStatus } = require('../lib/dedupe');
const { normalizeGtin } = require('../lib/gtin');

const [BRANDS, ITEMS, ITEM_SOURCES] = itemEntities('src-a');

async function seedTaxonomy() {
  await client.query(`
    INSERT INTO catalog.taxonomy_nodes (id, scheme, external_id, parent_id, name, full_path, level, content_hash)
    VALUES ('ondc:RET19', 'ondc', 'RET19', NULL, 'Pharma', 'Pharma', 0, 'x'),
           ('ondc:RET10', 'ondc', 'RET10', NULL, 'Grocery', 'Grocery', 0, 'x')
    ON CONFLICT DO NOTHING`);
}

const item = (over) => ({
  id: null,
  gtin: null,
  kind: 'product',
  name: 'Item',
  name_key: 'item',
  brand_key: 'acme',
  net_quantity: 10,
  unit: 'pc',
  quantity_text: '10 pc',
  taxonomy_node_id: 'ondc:RET19',
  classification_basis: 'curated',
  hsn_code: null,
  country_of_origin: null,
  manufacturer: null,
  image_url: null,
  attributes: {},
  dedupe_key: null,
  status: 'ready',
  quality_score: 90,
  primary_source: 'src-a',
  ...over,
});
const src = (itemId, sourceId) => ({
  source: 'src-a',
  source_id: sourceId,
  item_id: itemId,
  license: 'test',
  source_url: null,
  source_modified_at: null,
  raw: {},
});
async function loadItems(items, sources, options) {
  return inTx(async () => {
    const runId = await newRun();
    await upsertEntity(
      client,
      runId,
      BRANDS,
      [{ brand_key: 'acme', name: 'Acme', aliases: [], source: 'src-a' }],
      options
    );
    const s = await upsertEntity(client, runId, ITEMS, items, options);
    await upsertEntity(client, runId, ITEM_SOURCES, sources, options);
    return s;
  });
}

test(
  'database rejects a barcode with a bad check digit and a mismatched id',
  opts,
  async () => {
    await seedTaxonomy();
    const good = normalizeGtin('8901063010307').gtin;
    await assert.rejects(
      loadItems(
        [item({ id: 'gtin:08901063010308', gtin: '08901063010308' })],
        []
      ),
      /items_gtin_check/
    );
    await assert.rejects(
      loadItems([item({ id: `gtin:${good}`, gtin: null })], []),
      /items_gtin_id/
    );
  }
);

test(
  'products: deterministic ids, people’s decisions are final, duplicates found',
  opts,
  async () => {
    const pan = item({
      id: 'src:src-a:1',
      name: 'Pantoprazole 40mg and Levosulpiride 75mg Capsules',
      name_key: 'pantoprazole 40mg and levosulpiride 75mg capsules',
    });
    const eso = item({
      id: 'src:src-a:2',
      name: 'Esomeprazole 40mg and Levosulpiride 75mg Capsules',
      name_key: 'esomeprazole 40mg and levosulpiride 75mg capsules',
    });
    const n1 = item({
      id: 'src:src-a:3',
      name: 'Nachos, Cheese Jalapeno',
      name_key: 'nachos cheese jalapeno',
      taxonomy_node_id: 'ondc:RET10',
    });
    const n2 = item({
      id: 'src:src-a:4',
      name: 'Cheese Jalapeno Nachos',
      name_key: 'cheese jalapeno nachos',
      taxonomy_node_id: 'ondc:RET10',
    });
    const p650 = item({
      id: 'src:src-a:5',
      name: 'Paracetamol Tablets 650 mg',
      name_key: 'paracetamol tablets 650 mg',
    });
    const p500 = item({
      id: 'src:src-a:6',
      name: 'Paracetamol Tablets 500 mg',
      name_key: 'paracetamol tablets 500 mg',
    });
    const all = [pan, eso, n1, n2, p650, p500];
    const s = await loadItems(
      all,
      all.map((i, k) => src(i.id, String(k + 1)))
    );
    assert.equal(s.inserted, 6);

    const { candidates } = await findDuplicates(client, { log: () => {} });
    const pairs = candidates.map((c) => `${c.a_id}|${c.b_id}`);
    assert.deepEqual(
      pairs,
      ['src:src-a:3|src:src-a:4'],
      'only the word-order pair; not different medicines or strengths'
    );

    await mergeItems(client, 'src:src-a:3', 'src:src-a:4');
    await setItemStatus(client, 'src:src-a:1', 'verified');

    // The source re-sends everything with changed names: verified/rejected rows must not change.
    const changed = all.map((i) => ({ ...i, name: `${i.name} (new)` }));
    const again = await loadItems(
      changed,
      all.map((i, k) => src(i.id, String(k + 1)))
    );
    assert.equal(again.updated, 4, 'only the 4 undecided items update');
    const rows = await client.query(
      "SELECT id, status, name FROM catalog.items WHERE id IN ('src:src-a:1','src:src-a:4') ORDER BY id"
    );
    assert.equal(rows.rows[0].status, 'verified');
    assert.ok(!rows.rows[0].name.endsWith('(new)'));
    assert.equal(rows.rows[1].status, 'rejected');

    const after = await findDuplicates(client, { log: () => {} });
    assert.equal(
      after.candidates.length,
      0,
      'rejected items leave the duplicate queue'
    );
    const open = await client.query(
      "SELECT count(*)::int n FROM catalog.review_queue WHERE kind = 'item_possible_duplicate' AND status = 'open'"
    );
    assert.equal(open.rows[0].n, 0);
  }
);

test(
  'items_enriched resolves HSN through the nearest category default',
  opts,
  async () => {
    await client.query(`
    INSERT INTO catalog.hsn_codes (code, type, parent_code, description, content_hash) VALUES ('30', 'HSN', NULL, 'Pharma', 'x'), ('3004', 'HSN', '30', 'Medicaments', 'x')
    ON CONFLICT DO NOTHING;
    INSERT INTO catalog.taxonomy_hsn_defaults (node_id, hsn_code, confidence, source, content_hash)
    VALUES ('ondc:RET19', '3004', 'broad', 'test', 'x') ON CONFLICT DO NOTHING;`);
    const r = await client.query(
      "SELECT effective_hsn, hsn_basis FROM catalog.items_enriched WHERE id = 'src:src-a:6'"
    );
    assert.deepEqual(r.rows[0], {
      effective_hsn: '3004',
      hsn_basis: 'category_broad',
    });
  }
);
