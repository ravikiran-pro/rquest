'use strict';

/**
 * robots.txt for collectors that crawl web pages (scraper.access === 'crawl').
 *
 * Rules (RFC 9309): the group for our product token wins over '*'; the longest matching
 * Allow/Disallow path wins (Allow on a tie); '*' and '$' wildcards are supported. A missing
 * robots.txt (4xx) allows everything; an unreachable one (5xx / network) disallows
 * everything until it can be read. Crawl-delay is honoured as a minimum interval.
 * Cached per host for 24 hours in the worker process.
 */

const TTL_MS = 24 * 3600 * 1000;
const cache = new Map();

function parseRobots(text, token) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [], delay: null };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === 'allow' || field === 'disallow') {
      if (value || field === 'allow') current.rules.push({ allow: field === 'allow', path: value });
    } else if (field === 'crawl-delay') {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.delay = n;
    }
  }
  const t = String(token || '').toLowerCase();
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && t.includes(a)));
  const chosen = mine.length ? mine : groups.filter((g) => g.agents.includes('*'));
  return {
    rules: chosen.flatMap((g) => g.rules),
    delaySeconds: chosen.map((g) => g.delay).filter((d) => d !== null)[0] ?? null,
  };
}

const toRegex = (p) =>
  new RegExp(
    '^' +
      p
        .split('*')
        .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')
        .replace(/\\\$$/, '$')
  );

/** Whether `pathWithQuery` may be fetched under parsed rules. */
function allowed(parsed, pathWithQuery) {
  let best = null;
  for (const r of parsed.rules) {
    if (!r.path) continue;
    if (!toRegex(r.path).test(pathWithQuery)) continue;
    const len = r.path.length;
    if (!best || len > best.len || (len === best.len && r.allow)) best = { len, allow: r.allow };
  }
  return best ? best.allow : true;
}

/**
 * { allowed: boolean, delaySeconds } for a URL. `fetchText(url)` returns
 * { status, text } and must not itself check robots.
 */
async function check(url, { token, fetchText }) {
  const u = new URL(url);
  const origin = `${u.protocol}//${u.host}`;
  let entry = cache.get(origin);
  if (!entry || entry.expires < Date.now()) {
    let parsed;
    try {
      const res = await fetchText(`${origin}/robots.txt`);
      if (res.status >= 200 && res.status < 300) parsed = parseRobots(res.text, token);
      else if (res.status >= 400 && res.status < 500) parsed = { rules: [], delaySeconds: null };
      else parsed = { rules: [{ allow: false, path: '/' }], delaySeconds: null, unreachable: true };
    } catch (err) {
      parsed = { rules: [{ allow: false, path: '/' }], delaySeconds: null, unreachable: true };
    }
    entry = { parsed, expires: Date.now() + (parsed.unreachable ? 10 * 60 * 1000 : TTL_MS) };
    cache.set(origin, entry);
  }
  return {
    allowed: allowed(entry.parsed, `${u.pathname}${u.search}`),
    delaySeconds: entry.parsed.delaySeconds,
    unreachable: Boolean(entry.parsed.unreachable),
  };
}

module.exports = { parseRobots, allowed, check };
