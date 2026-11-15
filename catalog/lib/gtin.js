'use strict';

/**
 * GTIN (EAN/UPC barcode) normalisation. Canonical form: 14 digits, zero-padded, check digit
 * verified. GS1 defines every GTIN-8/12/13/14 as a 14-digit number, so the same product's
 * UPC-A ("012345678905") and EAN-13 ("0012345678905") collapse to one identity.
 * Mirrors SQL catalog.gtin_is_valid() — test/gtin.test.js checks both agree.
 */

function checkDigitOk(digits14) {
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    sum += Number(digits14[i]) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === Number(digits14[13]);
}

/**
 * GS1 ranges that are not globally unique (in-store weighed items, coupons, internal codes):
 * prefixes 020–029, 040–049, 200–299 (GTIN-13). Such codes cannot identify a product
 * across shops, so they are treated as "no GTIN".
 */
function isRestrictedCirculation(gtin14) {
  const g13 = gtin14.slice(1);
  if (gtin14[0] !== '0') return false; // GTIN-14 with an indicator digit: logistics unit
  const p3 = Number(g13.slice(0, 3));
  return (
    (p3 >= 20 && p3 <= 29) || (p3 >= 40 && p3 <= 49) || (p3 >= 200 && p3 <= 299)
  );
}

/**
 * @returns {{ gtin: string|null, reason: string|null }}
 *   gtin   canonical 14 digits, or null
 *   reason why it is null: empty | bad_length | bad_check_digit | restricted_circulation | all_zero
 */
function normalizeGtin(raw) {
  if (raw === null || raw === undefined) return { gtin: null, reason: 'empty' };
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return { gtin: null, reason: 'empty' };
  if (![8, 12, 13, 14].includes(digits.length))
    return { gtin: null, reason: 'bad_length' };
  const g14 = digits.padStart(14, '0');
  if (/^0+$/.test(g14)) return { gtin: null, reason: 'all_zero' };
  if (!checkDigitOk(g14)) return { gtin: null, reason: 'bad_check_digit' };
  // GTIN-8 sits in its own number space; only check restriction for 12/13-digit codes.
  if (digits.length !== 8 && isRestrictedCirculation(g14))
    return { gtin: null, reason: 'restricted_circulation' };
  return { gtin: g14, reason: null };
}

/** Short display form (strip the padding back to EAN-13 / EAN-8). */
function displayGtin(gtin14) {
  if (!gtin14) return null;
  if (gtin14.startsWith('000000')) return gtin14.slice(6); // GTIN-8
  return gtin14[0] === '0' ? gtin14.slice(1) : gtin14;
}

module.exports = { normalizeGtin, displayGtin, checkDigitOk };
