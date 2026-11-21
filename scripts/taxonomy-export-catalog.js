#!/usr/bin/env node
/**
 * Write catalog/seeds/shop_types.csv from src/api/data/taxonomy.js, so the catalog's
 * shop-type taxonomy always matches the app's categories (groups) and sub-categories (types).
 *
 *   npm run taxonomy:export-catalog            # write the file
 *   npm run taxonomy:export-catalog -- --check # exit 1 if the file is out of date
 *
 * The catalog pipeline stays isolated: it reads the CSV and never imports app code.
 * After writing, load it with: cd catalog && node cli.js run curated-taxonomy
 */
const fs = require('fs');
const path = require('path');
const { validateTaxonomy, CATEGORIES, SUB_CATEGORIES } = require('../src/api/services/taxonomy');

const OUT = path.join(__dirname, '..', 'catalog', 'seeds', 'shop_types.csv');

const HEADER = `# Rquest shop types (scheme "shop_type"). Rows with an empty parent are groups.
# GENERATED from src/api/data/taxonomy.js by \`npm run taxonomy:export-catalog\` — edit that file, not this one.
#  groups        the app's 8 categories; types are its sub-categories (same keys)
#  osm_tags      OpenStreetMap tags for this kind of business (";"-separated), for map imports
#  ondc_domains  ONDC retail domains the shop typically sells in (";"-separated)
#  form_template key of the app's listing form template (src/api/services/formSchema.js)
#  listing_type  product | food | service | rental (matches shop_listings.listing_type)
key,name,parent,osm_tags,ondc_domains,form_template,listing_type
`;

const cell = (value) => {
  const text = String(value === undefined || value === null ? '' : value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const problems = validateTaxonomy();
SUB_CATEGORIES.forEach((s) =>
  (s.osm || []).forEach((tag) => {
    if (!/^[a-z_]+=[a-z_]+$/.test(tag)) problems.push(`${s.key}: OSM tag "${tag}" is not key=value in [a-z_]`);
  })
);
if (problems.length) {
  console.error(`Taxonomy data is invalid:\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}

const lines = [];
CATEGORIES.forEach((c) => {
  lines.push([c.key, c.name, '', '', '', '', ''].map(cell).join(','));
  SUB_CATEGORIES.filter((s) => s.category === c.key).forEach((s) => {
    lines.push(
      [s.key, s.name, c.key, (s.osm || []).join(';'), (s.ondc || []).join(';'), s.template, s.listing_type]
        .map(cell)
        .join(',')
    );
  });
});
const content = `${HEADER}${lines.join('\n')}\n`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== content) {
    console.error(`${path.relative(process.cwd(), OUT)} is out of date. Run: npm run taxonomy:export-catalog`);
    process.exit(1);
  }
  console.log('catalog shop types are up to date');
} else {
  fs.writeFileSync(OUT, content);
  console.log(`Wrote ${path.relative(process.cwd(), OUT)}: ${CATEGORIES.length} groups, ${SUB_CATEGORIES.length} types`);
}
