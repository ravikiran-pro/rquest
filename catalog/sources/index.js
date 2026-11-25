'use strict';

/** Registry of extraction sources, in recommended run order. */
const SOURCES = {
  hsn: () => require('./hsn'),
  'hsn-overrides': () => require('./hsn-overrides'),
  'shopify-taxonomy': () => require('./shopify-taxonomy'),
  'ondc-taxonomy': () => require('./ondc-taxonomy'),
  'curated-taxonomy': () => require('./curated-taxonomy'),
  'attribute-sets': () => require('./attribute-sets'),
  'off-india': () => require('./off-india'),
  'jan-aushadhi': () => require('./jan-aushadhi'),
  'curated-items': () => require('./curated-items'),
};

// Sources shipped by collectors (catalog/scrapers/<name>), after the built-in ones: they
// read collected records and may reference any taxonomy or brand the built-ins load.
Object.assign(SOURCES, require('../lib/collect/registry').scraperSources());

function getSource(name) {
  const load = SOURCES[name];
  if (!load) {
    throw new Error(
      `Unknown source "${name}". Available: ${Object.keys(SOURCES).join(', ')}`
    );
  }
  return load();
}

module.exports = { SOURCES, getSource };
