'use strict';

const { nameKey } = require('./text');

/**
 * Parse the ONDC enum YAML shape strictly:
 *   <rootKey>:
 *       - code: X
 *         description: Y
 *         reference: ...
 * Anything unexpected throws — a silent mis-parse would corrupt the taxonomy.
 */
function parseCodeList(text, rootKey) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `${rootKey}:`);
  if (start === -1) throw new Error(`YAML: key "${rootKey}:" not found`);
  const items = [];
  let current = null;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (/^\S/.test(line)) break; // next top-level key
    let m = line.match(/^\s+-\s+code:\s*(.+?)\s*$/);
    if (m) {
      current = { code: m[1], description: null };
      items.push(current);
      continue;
    }
    m = line.match(/^\s+(description|reference):\s*(.*?)\s*$/);
    if (m && current) {
      if (m[1] === 'description') current.description = m[2];
      continue;
    }
    throw new Error(`YAML: unexpected line ${i + 1}: ${line}`);
  }
  for (const it of items) {
    if (!it.description) throw new Error(`YAML: ${it.code} has no description`);
  }
  return items;
}

/** Review items for siblings whose names collide after normalisation (ambiguous for users). */
function siblingNameCollisions(nodes, source) {
  const groups = new Map();
  for (const n of nodes) {
    const key = `${n.parent_id || ''}\u0001${nameKey(n.name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }
  const review = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const ids = members.map((m) => m.id).sort();
    review.push({
      kind: 'taxonomy_duplicate_sibling_name',
      entity: 'taxonomy_node',
      entity_key: ids.join(','),
      payload: {
        source,
        parent_id: members[0].parent_id,
        name: members[0].name,
        ids,
        action:
          'Rename one node (display label) or merge them via taxonomy_mappings.',
      },
    });
  }
  return review;
}

module.exports = { parseCodeList, siblingNameCollisions };
