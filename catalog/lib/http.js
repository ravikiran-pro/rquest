'use strict';

const { config } = require('./env');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch() with a User-Agent, timeout and retry/backoff on network errors, 429 and 5xx.
 * Note: behind an HTTPS proxy, Node's built-in fetch needs NODE_USE_ENV_PROXY=1 (Node ≥ 22.21).
 */
async function fetchWithRetry(
  url,
  { retries = 4, timeoutMs = 60000, headers = {}, ...init } = {}
) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': config().userAgent, ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after')) || 0;
        lastErr = new Error(`HTTP ${res.status} for ${url}`);
        if (attempt < retries) {
          await sleep(Math.max(retryAfter * 1000, 2000 * 2 ** attempt));
          continue;
        }
        throw lastErr;
      }
      if (!res.ok)
        throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), {
          fatal: true,
        });
      return res;
    } catch (err) {
      if (err.fatal) throw err;
      lastErr = err;
      if (attempt < retries) {
        await sleep(2000 * 2 ** attempt);
        continue;
      }
    }
  }
  const hint =
    process.env.HTTPS_PROXY && process.env.NODE_USE_ENV_PROXY !== '1'
      ? ' (an HTTPS proxy is configured: run with NODE_USE_ENV_PROXY=1)'
      : '';
  throw new Error(`${lastErr && lastErr.message}${hint}`);
}

async function fetchJson(url, opts) {
  const res = await fetchWithRetry(url, {
    ...opts,
    headers: { Accept: 'application/json', ...(opts && opts.headers) },
  });
  return res.json();
}

async function fetchBuffer(url, opts) {
  const res = await fetchWithRetry(url, opts);
  return Buffer.from(await res.arrayBuffer());
}

module.exports = { fetchWithRetry, fetchJson, fetchBuffer, sleep };
