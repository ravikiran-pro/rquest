'use strict';

/**
 * Open Beauty Facts — cosmetics and personal care sold in India. Reference collector for
 * catalog/scrapers (see scrapers/README.md): a documented public API, paginated jobs,
 * records turned into items by the shared Open Facts transform.
 */
const { makeOpenFactsCollector } = require('../_shared/openfacts');

module.exports = makeOpenFactsCollector({
  name: 'obf-india',
  host: 'world.openbeautyfacts.org',
  siteName: 'Open Beauty Facts',
  title: 'Open Beauty Facts — products sold in India',
  shopType: 'cosmetics',
  feeds: ['cosmetics', 'beauty_parlour', 'salon', 'pharmacy'],
  maxPages: 10,
});
