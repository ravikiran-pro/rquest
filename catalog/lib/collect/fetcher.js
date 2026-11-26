'use strict';

const fs = require('fs');
const path = require('path');
const { config } = require('../env');
const { sha256 } = require('../hash');
const robots = require('./robots');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Polite HTTP for collectors. One fetcher per worker process, shared by every scraper so
 * the per-host limits hold across them.
 *
 *   - Only hosts the scraper declares (scraper.hosts) can be fetched.
 *   - access 'crawl': robots.txt is obeyed (lib/collect/robots.js), including Crawl-delay.
 *     access 'api': the host's documented API, used under its published terms (scraper.terms).
 *   - At most one request per host every max(scraper.minIntervalMs, crawl-delay) ms.
 *   - 429 / 5xx / network errors: retried with exponential backoff (Retry-After honoured).
 *   - Optional disk cache (cacheTtlMs) under <cacheDir>/collect/<host>/ so a re-run or a
 *     transform fix does not hit the site again.
 *   - Identifies itself with CATALOG_USER_AGENT.
 */
function createFetcher({ log = () => {} } = {}) {
  const cfg = config();
  const userAgent = cfg.userAgent;
  const nextSlot = new Map();

  const rawFetch = async (url, { headers = {}, timeoutMs = 60000, method = 'GET', body } = {}) => {
    const res = await fetch(url, {
      method,
      body,
      headers: { 'User-Agent': userAgent, ...headers },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });
    return res;
  };

  const waitForHost = async (host, intervalMs) => {
    const now = Date.now();
    const at = Math.max(now, nextSlot.get(host) || 0);
    nextSlot.set(host, at + intervalMs);
    if (at > now) await sleep(at - now);
  };

  /**
   * GET (or POST) for a scraper. Returns { status, url, headers, text, json, fromCache }.
   * Throws err.fatal for 4xx (other than 429) and robots refusals; err.retryable otherwise.
   */
  async function request(scraper, url, opts = {}) {
    const { as = 'text', cacheTtlMs = 0, retries = 3, headers = {}, method = 'GET', body } = opts;
    const u = new URL(url);
    if (!(scraper.hosts || []).includes(u.host)) {
      throw Object.assign(new Error(`${scraper.name}: host ${u.host} is not in scraper.hosts`), { fatal: true });
    }
    const cacheFile =
      cacheTtlMs > 0
        ? path.join(cfg.cacheDir, 'collect', u.host, `${sha256(`${method} ${url} ${body || ''}`).slice(0, 32)}.json`)
        : null;
    if (cacheFile && fs.existsSync(cacheFile)) {
      const hit = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (Date.now() - hit.fetchedAt < cacheTtlMs) {
        return { ...hit.response, json: as === 'json' ? JSON.parse(hit.response.text) : undefined, fromCache: true };
      }
    }

    let interval = Math.max(Number(scraper.minIntervalMs) || 2000, 500);
    if (scraper.access === 'crawl') {
      const verdict = await robots.check(url, {
        token: userAgent,
        fetchText: async (robotsUrl) => {
          await waitForHost(u.host, interval);
          const r = await rawFetch(robotsUrl, { timeoutMs: 20000 });
          return { status: r.status, text: await r.text() };
        },
      });
      if (!verdict.allowed) {
        throw Object.assign(
          new Error(`robots.txt ${verdict.unreachable ? 'unreachable' : 'disallows'} ${u.pathname} on ${u.host}`),
          { fatal: !verdict.unreachable, retryable: verdict.unreachable }
        );
      }
      if (verdict.delaySeconds) interval = Math.max(interval, verdict.delaySeconds * 1000);
    }

    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      await waitForHost(u.host, interval);
      try {
        const res = await rawFetch(url, {
          method,
          body,
          headers: { ...(as === 'json' ? { Accept: 'application/json' } : {}), ...headers },
          timeoutMs: opts.timeoutMs || 60000,
        });
        if (res.status === 429 || res.status >= 500) {
          const retryAfter = Number(res.headers.get('retry-after')) || 0;
          lastErr = Object.assign(new Error(`HTTP ${res.status} for ${url}`), { retryable: true });
          if (attempt < retries) {
            const wait = Math.max(retryAfter * 1000, 3000 * 2 ** attempt);
            log(`  ${scraper.name}: ${res.status} from ${u.host}, retry in ${Math.round(wait / 1000)}s`);
            nextSlot.set(u.host, Date.now() + wait);
            continue;
          }
          throw lastErr;
        }
        const text = await res.text();
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { fatal: true, status: res.status });
        const response = { status: res.status, url: res.url || url, headers: Object.fromEntries(res.headers), text };
        if (cacheFile) {
          fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
          fs.writeFileSync(cacheFile, JSON.stringify({ fetchedAt: Date.now(), response }));
        }
        let json;
        if (as === 'json') {
          try {
            json = JSON.parse(text);
          } catch (err) {
            throw Object.assign(new Error(`Not JSON from ${url}: ${text.slice(0, 120)}`), { retryable: true });
          }
        }
        return { ...response, json, fromCache: false };
      } catch (err) {
        if (err.fatal) throw err;
        lastErr = Object.assign(err, { retryable: true });
        if (attempt < retries) continue;
      }
    }
    const hint =
      process.env.HTTPS_PROXY && process.env.NODE_USE_ENV_PROXY !== '1'
        ? ' (an HTTPS proxy is configured: run with NODE_USE_ENV_PROXY=1)'
        : '';
    throw Object.assign(new Error(`${lastErr && lastErr.message}${hint}`), { retryable: true });
  }

  return {
    request,
    json: (scraper, url, opts) => request(scraper, url, { ...opts, as: 'json' }).then((r) => r.json),
    text: (scraper, url, opts) => request(scraper, url, { ...opts, as: 'text' }).then((r) => r.text),
  };
}

module.exports = { createFetcher };
