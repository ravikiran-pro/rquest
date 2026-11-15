'use strict';

const path = require('path');
const { readCsv } = require('./csv');

/** Exclusion rules for one scheme from seeds/taxonomy_exclusions.csv: Map external_id → reason. */
function loadExclusions(seedDir, scheme) {
  const rows = readCsv(path.join(seedDir, 'taxonomy_exclusions.csv'));
  return new Map(
    rows
      .filter((r) => r.scheme === scheme)
      .map((r) => [r.external_id, r.reason])
  );
}

/**
 * Returns the exclusion reason if the node or any ancestor is excluded, else null.
 * `ancestorIds` must be ordered nearest-first or root-first; any order works.
 */
function excludedBy(exclusions, externalId, ancestorIds) {
  for (const id of [externalId, ...ancestorIds]) {
    if (exclusions.has(id)) return { root: id, reason: exclusions.get(id) };
  }
  return null;
}

module.exports = { loadExclusions, excludedBy };
