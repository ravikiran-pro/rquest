# Rquest catalog pipeline

Extracts open product/tax data, cleans it, and bulk-loads it into a **separate `catalog`
Postgres schema**. It is fully isolated from the app:

| Guarantee | How |
|---|---|
| No app code touched | Own `package.json` / `node_modules`; nothing imports from `src/`, and `src/` never imports this. Not included in `npm run build`. |
| No app tables touched | Writes only `catalog.*` (schema-qualified everywhere). Linking catalog rows to `public.products` is a separate, explicit step that is **not** part of this folder. |
| Dev server not disturbed | Raw downloads go to `~/.cache/rquest-catalog` (outside the repo); snapshots are `.ndjson.gz`, which nodemon ignores. (Editing pipeline `.js` files still restarts `npm run dev`, like any `.js` in the repo.) |
| Own credentials | Reads `catalog/.env.catalog` → `CATALOG_DATABASE_URL`, never the app's `DB_*`. |

## Quick start

```bash
cd catalog
npm install
cp .env.catalog.example .env.catalog   # set CATALOG_DATABASE_URL
npm run migrate                        # create/upgrade the catalog schema
node cli.js run hsn --dry-run          # full load inside a transaction, then ROLLBACK
node cli.js run hsn                    # real load
node cli.js run hsn-overrides          # apply verified GST rates from seeds/
npm run status                         # last runs, row counts, open review items
```

Behind an HTTPS proxy, Node's built-in `fetch` needs `NODE_USE_ENV_PROXY=1` (Node ≥ 22.21).

## How a run works (clean, bulk, transactional)

`node cli.js run <source>` does, in order:

1. **Lock** – a Postgres advisory lock per source; a second concurrent run fails fast.
2. **Extract** – download into the cache (pinned version, integrity-checked).
3. **Skip check** – if the input hash and transform version equal the **latest** successful
   run, nothing happens (`--force` overrides).
4. **Transform** – pure JS: normalise, validate, dedupe. Bad rows go to `rejects`, things a
   human must decide go to `review`. Aborts if rejects exceed the source's threshold.
5. **Load – one transaction for everything:**
   - `COPY` each entity into a temp staging table (bulk, not row-by-row inserts);
   - abort if a natural key appears twice in the batch;
   - `INSERT … ON CONFLICT DO UPDATE` **only where `content_hash` changed** — an identical
     re-load writes zero rows;
   - rows the source no longer provides are **soft-deactivated** (`is_active = false`), never
     deleted; abort if more than the entity's threshold would be deactivated (`--allow-shrink`);
   - rejects logged, review queue synced (re-runs never duplicate items; items whose issue is
     gone are auto-resolved);
   - `--dry-run` → `ROLLBACK` and print what *would* change.
6. **Snapshot** – after `COMMIT`, a sorted, diff-friendly copy of the clean data is written to
   `snapshots/<source>/` (commit it; it is the reviewable record of what was loaded).

Every run is recorded in `catalog.import_runs` with its stats.

## HSN / SAC: how duplicates are prevented

- **One identity per code.** `hsn_codes.code` is the primary key in canonical form: digits only,
  zero-padded to an even length (2/4/6/8). `catalog.normalize_hsn()` (SQL) and `lib/hsn.js` (JS)
  implement the same rule and are tested to agree. This fixes the main duplicate trap: sources
  drop the leading zero of chapters 01–09 (`1011010` vs `01011010`).
- **Constraints, not conventions.** The database rejects: malformed codes, SAC outside
  chapter 99, a parent that is not the code's own prefix, orphans (FK), 12%/28% rates dated on or
  after 22 Sep 2025 (GST 2.0), and two active rates for the same code on the same day
  (exclusion constraint).
- **Several sources, one code.** Each source's wording goes to `hsn_source_descriptions`
  (`PRIMARY KEY (code, source)`), never a new code.
- **Rates are versioned.** A change is a new `(code, effective_from)` row. A rate on a short code
  covers all longer codes beneath it unless a more specific one exists:
  `SELECT * FROM catalog.gst_rate('0402 10', current_date)`.
- **Verified beats automated.** Rows from `seeds/hsn_rate_overrides.csv` are `verified = true`;
  automated sources cannot overwrite or deactivate them while active.

### What the `hsn` source fixes in `hsn-code-package@3.0.0`

| Defect in the package | Handling |
|---|---|
| 877 codes lost their leading zero | zero-padded |
| Only 8-digit rows | chapter titles from `seeds/hsn_chapters.csv`; headings/subheadings derived bottom-up from their direct children's shared wording, one vote per child (`description_basis = 'derived'`) |
| 68 codes with description `-` (mostly alcoholic beverages, outside GST) | kept as `placeholder`, their rate ignored, review item `hsn_description_missing` |
| One guessed rate per chapter, including abolished 12%/28% | collapsed to 98 unverified chapter/heading rows; 34 groups (1,473 codes) at 12%/28% go to review as `rate_invalid_slab` — **not loaded** |
| Heading 0407 (eggs in shell) missing | added from `seeds/hsn_supplement.csv`; gets no inherited rate |

**The package rates are suggestions, not tax advice.** They are per chapter (e.g. chapter 04
is 0%, but butter/ghee/cheese are not). Put verified rates in `seeds/hsn_rate_overrides.csv`.

## Sources (run in this order)

| Source | Data | License | Pinned to |
|---|---|---|---|
| `hsn` | 13,101 HSN/SAC codes → 20,077 with built parents; chapter/heading rate suggestions | ISC (hsn-code-package) | npm `3.0.0` + SRI integrity |
| `hsn-overrides` | verified GST rates — `seeds/hsn_rate_overrides.csv` | internal | file hash |
| `shopify-taxonomy` | 14,188 product categories + 8,272 attributes (418 excluded) | MIT | commit `2ea7266` (tag v2026-10) + sha256 |
| `ondc-taxonomy` | 14 ONDC retail domains + 96 Indian grocery categories | ONDC spec (no LICENSE file; codes used as identifiers) | commit `aa74e5d` (release-2.0.2) + sha256 |
| `curated-taxonomy` | 57 Rquest shop types in 12 groups, 62 cross-scheme mappings, 49 default HSN per category | internal | file hash |

`curated-taxonomy` refuses to load if a mapping or default points to a node or HSN code that is
not active — run it last.

### Seeds you maintain (all CSV, reviewed via git)

| File | Purpose |
|---|---|
| `hsn_chapters.csv`, `hsn_headings.csv` | official titles for chapters/headings the source cannot label (`hsn_description_fallback` review items list what is missing) |
| `hsn_supplement.csv` | tariff codes missing from the package (e.g. `0407` eggs in shell) |
| `hsn_rate_overrides.csv` | verified GST rates — they always win |
| `taxonomy_exclusions.csv` | subtrees kept out of the catalog, with the legal reason (cannabis, e-cigarettes, alcohol, hunting, mature) |
| `shop_types.csv` | Rquest shop types → OSM tags, ONDC domains, app form template, listing type |
| `taxonomy_mappings.csv` | ONDC ↔ Shopify links |
| `taxonomy_hsn_defaults.csv` | suggested HSN per category (`exact` / `broad`) |

**Not yet loaded:** the FSSAI Food Category System (its official PDF host is not reachable from
the pipeline's network and the codes could not be verified).

## Working the review queue

```sql
SELECT kind, count(*) FROM catalog.review_queue WHERE status = 'open' GROUP BY 1;
```

| Kind | Fix |
|---|---|
| `rate_invalid_slab` | add the correct rate(s) to `hsn_rate_overrides.csv` |
| `hsn_description_missing` / `hsn_description_fallback` | add the title to `hsn_headings.csv` (or supplement) |
| `hsn_supplement_redundant` | delete the line from `hsn_supplement.csv` |
| `taxonomy_duplicate_sibling_name` | rename or map the nodes |

Items close automatically on the next run once the cause is gone; `status = 'dismissed'` marks a
deliberate "won't fix".

## Adding a source

Create `sources/<name>/index.js` exporting `meta`, `entities` (loader specs), `extract(ctx)`
and `transform(extracted)`, register it in `sources/index.js`, add a migration in
`db/schema.js` if it needs new tables (append-only — never edit an applied migration), and
bump `meta.transformVersion` whenever the transform's output would change.

## Tests

```bash
npm test                                   # unit tests
CATALOG_TEST_DATABASE_URL=postgres://user:pass@localhost:5432/rquest_catalog_it_test npm test
```

The integration suite **drops and recreates schema `catalog`**, so it refuses to run unless
the database name ends in `_test`.

## Database isolation (shared databases)

To make "never writes app tables" physically true rather than a convention, run the pipeline
as a role that owns only the `catalog` schema:

```sql
CREATE ROLE catalog_writer LOGIN PASSWORD '…';
CREATE SCHEMA catalog AUTHORIZATION catalog_writer;
-- once, as a superuser / database owner:
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA catalog;
CREATE EXTENSION IF NOT EXISTS pg_trgm    WITH SCHEMA catalog;
CREATE EXTENSION IF NOT EXISTS unaccent   WITH SCHEMA catalog;
-- grant nothing on public: the role cannot modify app tables.
```
