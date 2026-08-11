// scripts/refresh-today.js — the T10 scheduled news-refresh pipeline.
// design.md §6 (API/Integration Contract) + §13 TD-003/TD-004.
//
// Scope boundary (TD-003/TD-004): this is a scheduled script that publishes a
// static JSON file. It borrows World Monitor's *data-quality patterns*
// (freshness taxonomy, pubdate-required gate, min()-reduction across
// sources, fail-closed-on-undatable-source) — never its infrastructure.
// No Edge Functions, no Redis, no relay service, no running server.
//
// Every pipeline step below is a pure, named, exported function so it is
// unit-testable (test/news-pipeline.test.js) without a live network call.
// The only impure parts are `fetchAllowlistedItems` (network) and
// `publishTodayStories` (filesystem write), both thin and untested here;
// everything they call is pure.

import { readFile, writeFile } from 'node:fs/promises';
import { validateContent } from '../src/content-loader.js';

// --- Freshness taxonomy (design.md §5/§6, TD-004) ----------------------
// World Monitor's named states, adopted as a convention. Exact thresholds
// are a design/ops decision D-008 explicitly leaves open ("not fixed
// here") — these are this task's concrete, documented starting values.
export const FRESHNESS_STATES = ['fresh', 'stale', 'very_stale', 'no_data', 'error'];

// Hours-old boundaries for a *datable* source's most recent kept item.
export const FRESHNESS_THRESHOLDS_HOURS = {
  fresh: 24, // <= 24h old -> fresh
  stale: 72, // <= 72h old -> stale; older -> very_stale
};

// Numeric rank used for the min() reduction: higher = fresher. min() across
// sources means the *lowest* rank wins, i.e. the whole slice is only as
// fresh as its stalest/most-broken included source (design.md §6 step 3).
const FRESHNESS_RANK = {
  fresh: 3,
  stale: 2,
  very_stale: 1,
  no_data: 0,
  error: -1,
};

/**
 * Step 2: pubdate-required gate (design.md §6 step 2).
 * Drops items with no parseable publish date, or a future-dated timestamp.
 * Counts drops instead of silently discarding them.
 *
 * @param {Array<{id?: string, sourceId: string, publishedDate?: string}>} items
 * @param {{ now?: Date }} [opts]
 * @returns {{ kept: Array<object>, dropped: Array<{item: object, reason: string}>, droppedCount: number }}
 */
export function gatePubdates(items, { now = new Date() } = {}) {
  const kept = [];
  const dropped = [];

  for (const item of items) {
    const raw = item?.publishedDate;
    const parsed = raw ? new Date(raw) : null;
    const isParseable = parsed instanceof Date && !Number.isNaN(parsed.getTime());

    if (!isParseable) {
      dropped.push({ item, reason: 'no parseable publish date' });
      continue;
    }
    if (parsed.getTime() > now.getTime()) {
      dropped.push({ item, reason: 'future-dated publish date' });
      continue;
    }
    kept.push(item);
  }

  return { kept, dropped, droppedCount: dropped.length };
}

/**
 * Step 3a: per-source freshness computation (design.md §6 step 3).
 * A source's freshness is derived from the most recent *kept* (gated) item
 * attributed to it. A source with zero kept items — because it had none to
 * begin with, or because the gate dropped everything it offered — is
 * undatable and fails closed to "error", never silently to "fresh".
 *
 * @param {Array<object>} keptItemsForSource - items already passed through gatePubdates, filtered to one source
 * @param {{ now?: Date, thresholds?: {fresh: number, stale: number} }} [opts]
 * @returns {'fresh'|'stale'|'very_stale'|'error'}
 */
export function computeSourceFreshness(
  keptItemsForSource,
  { now = new Date(), thresholds = FRESHNESS_THRESHOLDS_HOURS } = {}
) {
  if (!keptItemsForSource || keptItemsForSource.length === 0) {
    return 'error'; // fail-closed on an undatable/empty source (design.md §6 step 3)
  }

  const mostRecentMs = Math.max(
    ...keptItemsForSource.map((item) => new Date(item.publishedDate).getTime())
  );
  const ageHours = (now.getTime() - mostRecentMs) / (1000 * 60 * 60);

  if (ageHours <= thresholds.fresh) return 'fresh';
  if (ageHours <= thresholds.stale) return 'stale';
  return 'very_stale';
}

/**
 * Step 3b: min()-reduction across all included sources' freshness states
 * (design.md §6 step 3) — "the whole slice is only as fresh as its
 * stalest included source." An empty source set has no basis for a
 * freshness claim and fails closed to "no_data", not "fresh".
 *
 * @param {Array<'fresh'|'stale'|'very_stale'|'no_data'|'error'>} sourceFreshnessStates
 * @returns {'fresh'|'stale'|'very_stale'|'no_data'|'error'}
 */
export function reduceFreshness(sourceFreshnessStates) {
  if (!sourceFreshnessStates || sourceFreshnessStates.length === 0) {
    return 'no_data';
  }

  let worst = null;
  for (const state of sourceFreshnessStates) {
    const rank = FRESHNESS_RANK[state];
    if (rank === undefined) {
      throw new Error(`reduceFreshness: unknown freshness state "${state}"`);
    }
    if (worst === null || rank < FRESHNESS_RANK[worst]) {
      worst = state;
    }
  }
  return worst;
}

/**
 * Step 4: schema/content validation before publish (design.md §6 step 4).
 * Adapts src/content-loader.js's validateContent (T1) rather than
 * duplicating validation logic — this IS "reuse T1's validator or an
 * equivalent check" per tasks.md T10 Work item.
 *
 * @param {object} todayStories - candidate content/today-stories.json shape
 * @param {object} anchors - the real content/anchors.json shape ({ anchors: [...] }), needed to check traceToAnchors resolves
 * @returns {string[]} errors; empty array means the candidate is publishable
 */
export function validateForPublish(todayStories, anchors) {
  return validateContent({ anchors, todayStories });
}

/**
 * Orchestrates steps 2-4 into the shape content/today-stories.json expects.
 * Pure: takes already-fetched raw items in, returns the candidate document
 * plus pipeline stats out. No network, no filesystem.
 *
 * @param {Array<{sourceId: string, sourceName: string, id: string, category: string, headline: string, dek?: string, url?: string, publishedDate?: string, traceToAnchors: string[], traceLabel?: string}>} rawItems
 * @param {object} anchors - content/anchors.json shape, for traceToAnchors validation
 * @param {{ now?: Date, thresholds?: object }} [opts]
 * @returns {{ todayStories: object, errors: string[], stats: { droppedCount: number, dropped: Array<object>, perSourceFreshness: Record<string,string> } }}
 */
export function buildTodayStories(rawItems, anchors, opts = {}) {
  const now = opts.now ?? new Date();
  const { kept, dropped, droppedCount } = gatePubdates(rawItems, { now });

  const bySource = new Map();
  for (const item of kept) {
    if (!bySource.has(item.sourceId)) bySource.set(item.sourceId, []);
    bySource.get(item.sourceId).push(item);
  }

  // Fail closed for any allowlisted source that contributed zero kept items,
  // if the caller told us which sources were expected via rawItems' sourceIds
  // union with any sources present only in dropped items.
  const allSourceIds = new Set([
    ...bySource.keys(),
    ...dropped.map((d) => d.item?.sourceId).filter(Boolean),
  ]);

  const perSourceFreshness = {};
  for (const sourceId of allSourceIds) {
    perSourceFreshness[sourceId] = computeSourceFreshness(bySource.get(sourceId) ?? [], {
      now,
      thresholds: opts.thresholds,
    });
  }

  const freshnessState = reduceFreshness(Object.values(perSourceFreshness));

  const stories = kept.map((item) => ({
    id: item.id,
    category: item.category,
    headline: item.headline,
    ...(item.dek ? { dek: item.dek } : {}),
    source: {
      name: item.sourceName,
      ...(item.url ? { url: item.url } : {}),
      publishedDate: item.publishedDate.slice(0, 10),
    },
    traceToAnchors: item.traceToAnchors ?? [],
    ...(item.traceLabel ? { traceLabel: item.traceLabel } : {}),
  }));

  const todayStories = {
    lastUpdated: now.toISOString(),
    freshnessState,
    stories,
  };

  const errors = validateForPublish(todayStories, anchors);

  return {
    todayStories,
    errors,
    stats: { droppedCount, dropped, perSourceFreshness },
  };
}

// --- Impure edges (not covered by node:test; require network/filesystem) --

/**
 * Reads the reviewed source allowlist (design.md §6 step 1).
 * @param {string} [path]
 */
export async function readAllowlist(path = new URL('../content/source-allowlist.json', import.meta.url)) {
  const raw = await readFile(path, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Fetches raw items for every allowlisted source. Left as a stub with a
 * clear extension point: real fetch/parse (RSS, API, HTML) per source is a
 * follow-up implementation detail once an actual source integration is
 * chosen — deliberately not built against live sources in this task (see
 * task report: no reliable live dry-run inside this sandbox).
 *
 * @param {object} allowlist
 * @returns {Promise<Array<object>>}
 */
export async function fetchAllowlistedItems(allowlist) {
  throw new Error(
    'fetchAllowlistedItems is not implemented — no live source integration was built in T10 ' +
      '(see task report). Provide items directly to buildTodayStories() for CI/testing, or ' +
      'implement a real per-source fetch/parse here before enabling the live cron workflow.'
  );
}

/**
 * Publishes the candidate document only if it is error-free (design.md §6
 * step 4/5: validate before publish, fail the job rather than shipping
 * malformed data).
 *
 * @param {{ todayStories: object, errors: string[] }} result
 * @param {string} [outPath]
 */
export async function publishTodayStories(
  result,
  outPath = new URL('../content/today-stories.json', import.meta.url)
) {
  if (result.errors.length > 0) {
    throw new Error(
      `publishTodayStories: refusing to publish, ${result.errors.length} validation error(s):\n` +
        result.errors.join('\n')
    );
  }
  await writeFile(outPath, JSON.stringify(result.todayStories, null, 2) + '\n', 'utf-8');
  return outPath;
}

// --- CLI entry point ------------------------------------------------------

async function main() {
  const allowlist = await readAllowlist();
  const anchorsRaw = await readFile(new URL('../content/anchors.json', import.meta.url), 'utf-8').catch(
    () => null
  );
  if (!anchorsRaw) {
    console.error('refresh-today: content/anchors.json not found — run after T2 lands. Aborting.');
    process.exitCode = 1;
    return;
  }
  const anchors = JSON.parse(anchorsRaw);

  const rawItems = await fetchAllowlistedItems(allowlist);
  const result = buildTodayStories(rawItems, anchors);
  await publishTodayStories(result);
  console.log(
    `refresh-today: published ${result.todayStories.stories.length} stories, ` +
      `freshnessState=${result.todayStories.freshnessState}, dropped=${result.stats.droppedCount}`
  );
}

// Only run when executed directly (`node scripts/refresh-today.js`), not when imported by tests.
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('refresh-today.js')) {
  main().catch((err) => {
    console.error('refresh-today: pipeline failed:', err.message);
    process.exitCode = 1;
  });
}
