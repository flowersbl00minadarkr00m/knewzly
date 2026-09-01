import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { assertValidWeeklyLedger, buildWeeklyLedger, clusterTodayStories, eligibleTodayStories } from '../src/weekly-momentum.js';
import { fetchGdeltEvidence, fetchHackerNewsEvidence } from '../src/popularity-providers.js';

function outputPathValue(path) {
  return path instanceof URL ? fileURLToPath(path) : path;
}

async function readPreviousLastSuccessfulAt(path) {
  try {
    const existing = JSON.parse(await readFile(path, 'utf8'));
    return typeof existing?.lastSuccessfulAt === 'string' ? existing.lastSuccessfulAt : undefined;
  } catch {
    return undefined;
  }
}

function providerState(result, countField) {
  return result?.status === 'ok'
    ? { status: 'ok', sampledAt: result.sampledAt, [countField]: result[countField] ?? 0 }
    : { status: 'unavailable' };
}

function summarize({ document, gdelt, hackerNews, todayStories }) {
  const eligible = eligibleTodayStories(todayStories, { now: document.windowEnd });
  const clusters = clusterTodayStories(eligible);
  return {
    status: document.status,
    candidates: eligible.length,
    clusters: clusters.length,
    selected: document.entries.length,
    gdelt: {
      status: gdelt.status,
      articles: gdelt.itemStates?.accepted ?? gdelt.articles?.length ?? 0,
      attemptedQueries: gdelt.attemptedQueries ?? gdelt.queryCount ?? 0,
      successfulQueries: gdelt.successfulQueries ?? gdelt.queryCount ?? 0,
    },
    hackerNews: {
      status: hackerNews.status,
      items: hackerNews.itemStates?.accepted ?? hackerNews.items?.length ?? 0,
      attemptedItems: hackerNews.sampledIds ?? 0,
      successfulItems: hackerNews.successfulItemRequests ?? hackerNews.sampledIds ?? 0,
      dropped: Object.entries(hackerNews.itemStates ?? {}).filter(([key]) => key !== 'accepted').reduce((total, [, value]) => total + value, 0),
    },
  };
}

export function formatProviderSummary(summary) {
  return `popular-week: status=${summary.status} candidates=${summary.candidates} clusters=${summary.clusters} selected=${summary.selected}\n` +
    `gdelt=${summary.gdelt.status} articles=${summary.gdelt.articles} queries=${summary.gdelt.successfulQueries}/${summary.gdelt.attemptedQueries} ` +
    `hn=${summary.hackerNews.status} items=${summary.hackerNews.items} requests=${summary.hackerNews.successfulItems}/${summary.hackerNews.attemptedItems} dropped=${summary.hackerNews.dropped}`;
}

/** Validates first, then writes a same-directory temporary file and atomically renames it into place. */
export async function publishWeeklyLedger({
  document,
  todayStories,
  outPath = new URL('../content/popular-this-week.json', import.meta.url),
  writeFileImpl = writeFile,
  renameImpl = rename,
} = {}) {
  assertValidWeeklyLedger(document, todayStories);
  const target = outputPathValue(outPath);
  const tempPath = join(dirname(target), `.${basename(target)}.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFileImpl(tempPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    await renameImpl(tempPath, target);
    return target;
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

/** Builds the evidence-only weekly candidate; dry-run intentionally does not invoke publication. */
export async function refreshPopularThisWeek({
  todayStories,
  now = new Date(),
  outputPath = new URL('../content/popular-this-week.json', import.meta.url),
  dryRun = false,
  providerResults,
  fetchImpl = fetch,
} = {}) {
  if (!todayStories || typeof todayStories !== 'object') throw new TypeError('todayStories is required');
  const [gdelt, hackerNews] = providerResults
    ? [providerResults.gdelt, providerResults.hackerNews]
    : await Promise.all([fetchGdeltEvidence({ fetchImpl, now }), fetchHackerNewsEvidence({ fetchImpl, now })]);
  const previousLastSuccessfulAt = await readPreviousLastSuccessfulAt(outputPath);
  const document = buildWeeklyLedger({
    todayStories,
    gdeltResults: gdelt?.articles ?? [],
    hackerNewsItems: hackerNews?.items ?? [],
    providerStates: {
      gdelt: providerState(gdelt, 'queryCount'),
      hackerNews: providerState(hackerNews, 'itemCount'),
      bluesky: { status: 'not_configured' },
    },
    now,
    previousLastSuccessfulAt,
  });
  const summary = summarize({ document, gdelt: gdelt ?? {}, hackerNews: hackerNews ?? {}, todayStories });
  if (!dryRun) await publishWeeklyLedger({ document, todayStories, outPath: outputPath });
  return { document, summary, dryRun };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const todayStories = JSON.parse(await readFile(new URL('../content/today-stories.json', import.meta.url), 'utf8'));
  const result = await refreshPopularThisWeek({ todayStories, dryRun });
  console.log(formatProviderSummary(result.summary));
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('refresh-popular-this-week.js')) {
  main().catch((error) => {
    console.error(`popular-week: failed ${error.message}`);
    process.exitCode = 1;
  });
}
