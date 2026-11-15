'use strict';

/** Registry of extraction sources, in recommended run order. */
const SOURCES = {
  hsn: () => require('./hsn'),
  'hsn-overrides': () => require('./hsn-overrides'),
  'shopify-taxonomy': () => require('./shopify-taxonomy'),
  'ondc-taxonomy': () => require('./ondc-taxonomy'),
  'curated-taxonomy': () => require('./curated-taxonomy'),
};

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
