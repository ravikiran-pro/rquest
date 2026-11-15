'use strict';

/** Registry of extraction sources, in recommended run order. */
const SOURCES = {
  hsn: () => require('./hsn'),
  'hsn-overrides': () => require('./hsn-overrides'),
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
