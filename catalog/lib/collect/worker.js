'use strict';

const os = require('os');
const { connect } = require('../db');
const { config } = require('../env');
const { createFetcher } = require('./fetcher');
const queue = require('./queue');
const { saveRecords } = require('./records');
const { listScrapers, getScraper } = require('./registry');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Background collector. Claims due jobs (FOR UPDATE SKIP LOCKED, so several workers can
 * share the queue), runs the scraper's handle(), and in one transaction stores the records,
 * queues follow-up jobs and marks the job done. Errors back off and retry; fatal ones fail.
 *
 *   once     drain what is due, then exit (cron style)
 *   maxJobs  stop after this many jobs
 *   idleMs   how long to wait when nothing is due (long-running mode)
 * SIGINT / SIGTERM finish the current job, then exit.
 */
async function runWorker({ scrapers, once = false, maxJobs = Infinity, idleMs = 60000, log = console.log } = {}) {
  const names = scrapers && scrapers.length ? scrapers : listScrapers().map((s) => s.name);
  if (!names.length) {
    log('no scrapers to run');
    return { jobs: 0 };
  }
  names.forEach(getScraper);
  const workerId = `${os.hostname()}:${process.pid}`;
  const fetcher = createFetcher({ log });
  const client = await connect();
  let stopping = false;
  const stop = () => {
    if (!stopping) log('stopping after the current job…');
    stopping = true;
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  const totals = { jobs: 0, failed: 0, records: 0, queued: 0 };
  log(`worker ${workerId}: ${names.join(', ')}${once ? ' (once)' : ''}`);
  try {
    while (!stopping && totals.jobs < maxJobs) {
      const job = await queue.claim(client, { scrapers: names, workerId });
      if (!job) {
        if (once) break;
        await sleep(idleMs);
        continue;
      }
      const scraper = getScraper(job.scraper);
      const ctx = {
        job,
        params: job.params || {},
        log: (m) => log(`  [${job.scraper}] ${m}`),
        config: config(),
        fetch: (url, opts) => fetcher.request(scraper, url, opts),
        json: (url, opts) => fetcher.json(scraper, url, opts),
        text: (url, opts) => fetcher.text(scraper, url, opts),
      };
      totals.jobs += 1;
      try {
        const result = (await scraper.handle(job, ctx)) || {};
        await client.query('BEGIN');
        const saved = await saveRecords(client, job.scraper, job.id, result.records || []);
        const added = await queue.enqueue(client, job.scraper, result.jobs || []);
        await queue.complete(client, job, { records: (result.records || []).length });
        await client.query('COMMIT');
        totals.records += (result.records || []).length;
        totals.queued += added;
        log(
          `${job.scraper} ${job.job_key}: ${(result.records || []).length} records ` +
            `(+${saved.inserted} new, ${saved.changed} changed), +${added} jobs`
        );
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        const gaveUp = await queue.fail(client, job, err);
        totals.failed += 1;
        log(`${job.scraper} ${job.job_key}: ${gaveUp ? 'FAILED' : 'retry later'} — ${err.message}`);
      }
    }
  } finally {
    await client.end();
  }
  log(`worker done: ${totals.jobs} jobs, ${totals.records} records, ${totals.queued} new jobs, ${totals.failed} errors`);
  return totals;
}

/** Queue a scraper's seed jobs (idempotent). */
async function seed(name, { log = console.log } = {}) {
  const scraper = getScraper(name);
  const jobs = await scraper.seed({ config: config(), log });
  const client = await connect();
  try {
    const added = await queue.enqueue(client, name, jobs);
    log(`${name}: ${jobs.length} seed jobs, ${added} new`);
    return added;
  } finally {
    await client.end();
  }
}

module.exports = { runWorker, seed };
