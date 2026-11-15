'use strict';

const ENTITIES = {
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
};

/**
 * Conservative clean-up shared by every source: strip tags/zero-width characters,
 * decode the common HTML entities, normalise whitespace and spacing around punctuation.
 * It never rewrites words — the raw value is always stored next to the cleaned one.
 */
function cleanText(value) {
  if (value === null || value === undefined) return null;
  let text = String(value).replaceAll('\u0000', '').normalize('NFC');
  text = text
    .replace(/<[^>]*>/g, ' ')
    .replace(
      /&(nbsp|#160|amp|quot|#39|apos|lt|gt);/gi,
      (m) => ENTITIES[m.toLowerCase()] || m
    )
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?%)\]])/g, '$1')
    .replace(/([([])\s+/g, '$1')
    .replace(/([,;:])(?=[^\s\d])/g, '$1 ')
    .trim();
  return text.length ? text : null;
}

/** Accent-, case- and punctuation-insensitive key used for matching and dedupe. */
function nameKey(value) {
  const text = cleanText(value);
  if (!text) return null;
  const key = text
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return key.length ? key : null;
}

module.exports = { cleanText, nameKey };
