'use strict';

const fs = require('fs');

/**
 * Minimal RFC 4180 CSV parser for the hand-curated seed files (quoted fields, "" escapes,
 * CRLF). Lines starting with # are comments. Returns objects keyed by the header row.
 */
function parseCsv(text) {
  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"' && field === '') inQuotes = true;
    else if (ch === ',') {
      record.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
    } else field += ch;
  }
  if (inQuotes) throw new Error('CSV: unterminated quoted field');
  if (field !== '' || record.length) {
    record.push(field);
    records.push(record);
  }
  const rows = records.filter(
    (r) => !(r.length === 1 && r[0].trim() === '') && !r[0].startsWith('#')
  );
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r, idx) => {
    if (r.length !== header.length) {
      throw new Error(
        `CSV row ${idx + 2}: expected ${header.length} fields, got ${r.length}`
      );
    }
    return Object.fromEntries(header.map((h, j) => [h, r[j].trim()]));
  });
}

const readCsv = (file) => parseCsv(fs.readFileSync(file, 'utf8'));

module.exports = { parseCsv, readCsv };
