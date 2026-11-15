'use strict';

/** Source: Open Food Facts — packaged food & beverages sold in India (ODbL). */
const { makeOpenFactsSource } = require('../_openfacts');

module.exports = makeOpenFactsSource({
  name: 'off-india',
  host: 'world.openfoodfacts.org',
  siteName: 'Open Food Facts',
  title: 'Open Food Facts — products sold in India',
});
