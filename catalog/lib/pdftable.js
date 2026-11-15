'use strict';

/**
 * Read a text-based PDF as positioned lines (pure JS via pdf.js — no system tools).
 * Each page → lines (grouped by baseline y) → items sorted by x. Table parsers then assign
 * items to columns by x position, which survives wrapped cells far better than splitting
 * flattened text on whitespace.
 */
async function pdfLines(buffer, { yTolerance = 2.5 } = {}) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  });
  const doc = await task.promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter((i) => i.str && i.str.trim())
      .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5] }))
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    for (const it of items) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - it.y) <= yTolerance) last.items.push(it);
      else lines.push({ y: it.y, items: [it] });
    }
    for (const l of lines) l.items.sort((a, b) => a.x - b.x);
    pages.push({ number: p, lines });
    page.cleanup();
  }
  await task.destroy();
  return pages;
}

const lineText = (line) =>
  line.items
    .map((i) => i.str)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

module.exports = { pdfLines, lineText };
