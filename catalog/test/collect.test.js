'use strict';

/** Background collection: robots.txt rules, record hashing and the collector registry. */

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRobots, allowed, check } = require('../lib/collect/robots');
const { hashPayload } = require('../lib/collect/records');
const { listScrapers } = require('../lib/collect/registry');

const ROBOTS = `
User-agent: *
Disallow: /private/
Disallow: /*.pdf$
Allow: /private/public-page
Crawl-delay: 5

User-agent: RquestCatalog
Disallow: /search
`;

test('robots: our own group wins over *', () => {
  const mine = parseRobots(ROBOTS, 'RquestCatalog/0.1 (catalog-pipeline)');
  assert.equal(allowed(mine, '/search?q=x'), false);
  assert.equal(allowed(mine, '/private/x'), true, 'the * group does not apply once ours matched');
  const other = parseRobots(ROBOTS, 'SomeBot/1.0');
  assert.equal(allowed(other, '/search?q=x'), true);
});

test('robots: longest match wins, Allow on a tie, wildcards and $', () => {
  const rules = parseRobots(ROBOTS, 'SomeBot/1.0');
  assert.equal(allowed(rules, '/private/secret'), false);
  assert.equal(allowed(rules, '/private/public-page'), true);
  assert.equal(allowed(rules, '/docs/list.pdf'), false);
  assert.equal(allowed(rules, '/docs/list.pdf?x=1'), true, '$ anchors the end');
  assert.equal(rules.delaySeconds, 5);
});

test('robots: missing file allows, unreachable file disallows', async () => {
  const missing = await check('https://a.example/x', { token: 'T', fetchText: async () => ({ status: 404, text: '' }) });
  assert.equal(missing.allowed, true);
  const down = await check('https://b.example/x', {
    token: 'T',
    fetchText: async () => {
      throw new Error('ECONNRESET');
    },
  });
  assert.equal(down.allowed, false);
  assert.equal(down.unreachable, true);
});

test('records: payload hash ignores key order', () => {
  assert.equal(hashPayload({ a: 1, b: { c: 2, d: 3 } }), hashPayload({ b: { d: 3, c: 2 }, a: 1 }));
  assert.notEqual(hashPayload({ a: 1 }), hashPayload({ a: 2 }));
});

test('registry: every collector declares licence, terms, access and hosts', () => {
  const scrapers = listScrapers();
  assert.ok(scrapers.length >= 1);
  for (const s of scrapers) {
    assert.match(s.name, /^[a-z0-9][a-z0-9-]*$/);
    assert.ok(s.license && s.terms && s.hosts.length, `${s.name}: license, terms, hosts`);
    assert.ok(['api', 'crawl'].includes(s.access), `${s.name}: access`);
    assert.ok(Number(s.minIntervalMs || 2000) >= 500, `${s.name}: minIntervalMs`);
  }
});
