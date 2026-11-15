'use strict';

const { from: copyFrom } = require('pg-copy-streams');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

const CHUNK_BYTES = 1 << 16;

function quoteIdent(name) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

/**
 * Encode one value for COPY ... FROM STDIN (text format).
 * NUL bytes are dropped: Postgres text/jsonb cannot store them and they never carry meaning
 * in catalog data (they show up in scraped/open-data dumps as corruption).
 */
function encodeValue(value) {
  if (value === null || value === undefined) return '\\N';
  if (typeof value === 'boolean') return value ? 't' : 'f';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite number cannot be copied: ${value}`);
    }
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  let text =
    typeof value === 'object'
      ? JSON.stringify(value).replace(/\\u0000/g, '')
      : String(value);
  text = text.replaceAll('\u0000', '');
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function encodeRow(row, columns) {
  return columns.map((c) => encodeValue(row[c])).join('\t') + '\n';
}

function* chunks(rows, columns) {
  let buffer = [];
  let size = 0;
  for (const row of rows) {
    const line = encodeRow(row, columns);
    buffer.push(line);
    size += line.length;
    if (size >= CHUNK_BYTES) {
      yield buffer.join('');
      buffer = [];
      size = 0;
    }
  }
  if (buffer.length) yield buffer.join('');
}

/** Stream rows into `table` with a single COPY — the bulk path for every load. */
async function copyRows(client, table, columns, rows) {
  if (!rows.length) return 0;
  const columnList = columns.map(quoteIdent).join(', ');
  const sink = client.query(
    copyFrom(`COPY ${table} (${columnList}) FROM STDIN`)
  );
  await pipeline(Readable.from(chunks(rows, columns)), sink);
  return rows.length;
}

module.exports = { copyRows, quoteIdent, encodeValue, encodeRow };
