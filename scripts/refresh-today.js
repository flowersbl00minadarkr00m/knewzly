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
import { buildReviewQueueEntry, applyReviewedQueue } from './categorize-story.js';

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
const MAX_FEED_BYTES = 2 * 1024 * 1024;
const MAX_LINK_CHARS = 2048;

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
  const errors = validateContent({ anchors, todayStories });
  for (const [index, story] of (todayStories?.stories ?? []).entries()) {
    if (story?.source?.url && !normalizeHttpsUrl(story.source.url)) {
      errors.push(`todayStories.stories[${index}].source.url must be a public HTTPS URL`);
    }
  }
  return errors;
}

/**
 * Orchestrates steps 2-4 into the shape content/today-stories.json expects.
 * Pure: takes already-fetched raw items in, returns the candidate document
 * plus pipeline stats out. No network, no filesystem.
 *
 * @param {Array<{sourceId: string, sourceName: string, id: string, category: string, headline: string, dek?: string, url?: string, publishedDate?: string, traceToAnchors: string[], traceLabel?: string}>} rawItems - items that will actually render as stories (typically only human-reviewed/ready items)
 * @param {object} anchors - content/anchors.json shape, for traceToAnchors validation
 * @param {{
 *   now?: Date,
 *   thresholds?: object,
 *   freshnessSourceItems?: Array<object>,
 *   expectedSourceIds?: string[],
 * }} [opts] - `freshnessSourceItems` (2026-08-12 gauntlet-review fix): everything
 *   actually fetched this run, independent of review/ready status — design.md
 *   §6 step 3's fail-closed rule is about *sources*, not about which items a
 *   human has gotten to yet, so a source that fetched nothing (or failed to
 *   fetch at all) must still count toward `error`, even if `rawItems` (the
 *   story content) has nothing from it. Falls back to `rawItems` if omitted
 *   (old behavior, still correct when every fetched item is also a
 *   candidate story). `expectedSourceIds` (typically the allowlist's ids)
 *   additionally guarantees a source that returned *zero* items of any kind
 *   — not even a dropped/undated one — still resolves to `error` rather
 *   than being silently absent from the freshness computation entirely.
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

  // Freshness/source-coverage is computed from everything actually fetched
  // this run (freshnessSourceItems), not from `rawItems` alone — those may
  // be a human-reviewed subset that excludes an entire failed source. See
  // the opts doc above.
  const freshnessRaw = opts.freshnessSourceItems ?? rawItems;
  const freshnessGate = opts.freshnessSourceItems ? gatePubdates(freshnessRaw, { now }) : { kept, dropped };
  const freshnessBySource = new Map();
  for (const item of freshnessGate.kept) {
    if (!freshnessBySource.has(item.sourceId)) freshnessBySource.set(item.sourceId, []);
    freshnessBySource.get(item.sourceId).push(item);
  }

  // Fail closed for any allowlisted source that contributed zero kept
  // items: union of sources with kept items, sources present only in
  // dropped items, and (if the caller told us) every expected source id —
  // the last of these is what catches a source that returned literally
  // nothing at all, not even a droppable one.
  const allSourceIds = new Set([
    ...freshnessBySource.keys(),
    ...freshnessGate.dropped.map((d) => d.item?.sourceId).filter(Boolean),
    ...(opts.expectedSourceIds ?? []),
  ]);

  const perSourceFreshness = {};
  for (const sourceId of allSourceIds) {
    perSourceFreshness[sourceId] = computeSourceFreshness(freshnessBySource.get(sourceId) ?? [], {
      now,
      thresholds: opts.thresholds,
    });
  }

  const freshnessState = reduceFreshness(Object.values(perSourceFreshness));

  const stories = kept.map((item) => {
    const sourceUrl = normalizeHttpsUrl(item.url);
    return {
      id: item.id,
      category: item.category,
      headline: item.headline,
      ...(item.dek ? { dek: item.dek } : {}),
      source: {
        name: item.sourceName,
        ...(sourceUrl ? { url: sourceUrl } : {}),
        publishedDate: item.publishedDate.slice(0, 10),
      },
      traceToAnchors: item.traceToAnchors ?? [],
      ...(item.traceLabel ? { traceLabel: item.traceLabel } : {}),
    };
  });

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

// --- Review-queue merge (pure, testable — no filesystem) -------------------
//
// Closes the categorization gap named above: parseFeedItems() can't supply
// `category`/`traceToAnchors`, and validateForPublish correctly refuses to
// publish without them. Rather than leaving that entirely to a human
// writing JSON from scratch every run, buildReviewQueue keyword-matches
// each new item against content/category-keywords.json for a *suggestion*
// (still requires `reviewed: true` before it can publish — see
// applyReviewedQueue in categorize-story.js) and mergeReviewQueue folds new
// items into whatever's already sitting in the queue without touching
// entries a human already started reviewing.

/**
 * @param {Array<object>} rawItems - parseFeedItems()-shaped items
 * @param {object} keywordMap - content/category-keywords.json shape
 * @param {{ threshold?: number }} [opts]
 * @returns {object[]} review-queue entries
 */
export function buildReviewQueue(rawItems, keywordMap, opts = {}) {
  return (rawItems ?? []).map((item) => buildReviewQueueEntry(item, keywordMap, opts));
}

/**
 * Merges freshly fetched items into an existing review queue by `id`,
 * leaving any entry already present (reviewed or not) untouched — a new
 * fetch must never clobber a human's in-progress or completed review.
 *
 * @param {object[]} existingQueue
 * @param {object[]} rawItems
 * @param {object} keywordMap
 * @param {{ threshold?: number }} [opts]
 * @returns {object[]} merged queue
 */
export function mergeReviewQueue(existingQueue, rawItems, keywordMap, opts = {}) {
  const existingIds = new Set((existingQueue ?? []).map((e) => e.id));
  const newEntries = (rawItems ?? [])
    .filter((item) => !existingIds.has(item.id))
    .map((item) => buildReviewQueueEntry(item, keywordMap, opts));
  return [...(existingQueue ?? []), ...newEntries];
}

/**
 * Selects the queue state for this run. Local curation runs include newly
 * fetched candidates. The scheduled publisher deliberately processes only
 * the versioned queue so unreviewed network content cannot be committed to
 * the default branch and reviewed entries can be consumed exactly once.
 */
export function prepareReviewQueue(
  existingQueue,
  rawItems,
  keywordMap,
  { includeFetchedCandidates = true } = {}
) {
  return includeFetchedCandidates
    ? mergeReviewQueue(existingQueue, rawItems, keywordMap)
    : [...(existingQueue ?? [])];
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
 * Reads content/category-keywords.json. Missing file yields an empty map
 * rather than throwing — the pipeline still runs, it just produces
 * zero-confidence suggestions until the file exists.
 * @param {string} [path]
 */
export async function readKeywordMap(path = new URL('../content/category-keywords.json', import.meta.url)) {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return { categories: {}, anchors: {} };
    throw err;
  }
}

/**
 * Reads content/review-queue.json. Missing file yields an empty queue.
 * @param {string} [path]
 */
export async function readReviewQueue(path = new URL('../content/review-queue.json', import.meta.url)) {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

/**
 * @param {object[]} queue
 * @param {string} [path]
 */
export async function writeReviewQueue(
  queue,
  path = new URL('../content/review-queue.json', import.meta.url)
) {
  await writeFile(path, JSON.stringify(queue, null, 2) + '\n', 'utf-8');
  return path;
}

/**
 * @param {object} keywordMap
 * @param {string} [path]
 */
export async function writeKeywordMap(
  keywordMap,
  path = new URL('../content/category-keywords.json', import.meta.url)
) {
  await writeFile(path, JSON.stringify(keywordMap, null, 2) + '\n', 'utf-8');
  return path;
}

// --- Feed parsing (pure, testable — no network) ----------------------

/**
 * Minimal RSS 2.0 / Atom item extractor. No XML parser dependency
 * (TD-001's zero-new-dependency posture) — a small regex-based scanner,
 * good enough for well-formed wire-service/publication feeds. It does not
 * handle deeply nested CDATA, uncommon XML namespaces, or malformed-XML
 * recovery; a feed that doesn't match yields zero items rather than
 * throwing, so one malformed feed never takes the whole run down (see
 * fetchAllowlistedItems, which calls this per-source inside a try/catch).
 *
 * Honest, deliberate limitation carried over from this task's original
 * scope: this never assigns `category` or `traceToAnchors` — mapping a
 * headline to a historical anchor and a content category is an editorial
 * judgment call (design.md's content-review responsibility), not something
 * derivable from RSS metadata. Items returned here are incomplete against
 * REQUIRED_STORY_FIELDS on purpose; validateForPublish (already wired into
 * publishTodayStories) correctly refuses to publish them until a curation
 * step fills those two fields in. That refusal is the designed fail-closed
 * behavior (design.md §6 step 4/5), not a defect introduced here.
 *
 * @param {string} xml - raw feed body
 * @param {{id: string, name: string}} source - the allowlist source this feed belongs to
 * @returns {Array<{sourceId: string, sourceName: string, id: string, headline: string, url?: string, publishedDate?: string}>}
 */
export function parseFeedItems(xml, source) {
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
  const blockPattern = isAtom ? /<entry\b[\s\S]*?<\/entry>/gi : /<item\b[\s\S]*?<\/item>/gi;
  const blocks = xml.match(blockPattern) || [];

  const items = [];
  for (const block of blocks) {
    const title = extractTag(block, 'title');
    if (!title) continue; // no headline, nothing usable to show
    const rawLink = isAtom ? extractAtomLink(block) : extractTag(block, 'link');
    const link = normalizeHttpsUrl(rawLink);
    const pubRaw = extractTag(block, isAtom ? 'published' : 'pubDate') || extractTag(block, 'updated');
    const parsedPub = pubRaw ? new Date(pubRaw) : null;
    const publishedDate = parsedPub && !Number.isNaN(parsedPub.getTime()) ? parsedPub.toISOString() : undefined;
    const guid = extractTag(block, isAtom ? 'id' : 'guid')?.trim().slice(0, 512);
    const headline = decodeEntities(title.trim()).slice(0, 300);

    items.push({
      sourceId: source.id,
      sourceName: source.name,
      id: guid || link || `${source.id}-${items.length}`,
      headline,
      ...(link ? { url: link } : {}),
      ...(publishedDate ? { publishedDate } : {}),
    });
  }
  return items;
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  if (!m) return null;
  return m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1');
}

function extractAtomLink(block) {
  const withRelAlternate = block.match(/<link\b[^>]*\brel=["']?alternate["']?[^>]*\bhref=["']([^"']+)["']/i);
  if (withRelAlternate) return withRelAlternate[1];
  const anyHref = block.match(/<link\b[^>]*\bhref=["']([^"']+)["']/i);
  return anyHref ? anyHref[1] : null;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Returns a normalized public HTTPS URL or undefined for unsafe input. */
export function normalizeHttpsUrl(raw) {
  if (typeof raw !== 'string') return undefined;
  const candidate = decodeEntities(raw.trim());
  if (!candidate || candidate.length > MAX_LINK_CHARS) return undefined;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/**
 * Sorts items newest-first by publishedDate; items with no parseable date
 * sort last (undated is never "recent"). Pure, exported for testability.
 *
 * @param {Array<object>} items
 * @returns {Array<object>} a new, sorted array
 */
export function sortItemsByRecency(items) {
  return [...(items ?? [])].sort((a, b) => {
    const at = a.publishedDate ? new Date(a.publishedDate).getTime() : -Infinity;
    const bt = b.publishedDate ? new Date(b.publishedDate).getTime() : -Infinity;
    return bt - at;
  });
}

/**
 * Fetches raw items for every allowlisted source's feedUrl and parses them
 * with parseFeedItems. A per-source failure (network error, non-2xx,
 * timeout, unparseable body) is caught and logged, and that source
 * contributes zero items to this run rather than aborting the whole batch
 * — computeSourceFreshness already fails a zero-item source closed to
 * 'error' on its own, so this composes correctly with the rest of the
 * pipeline without special-casing here.
 *
 * 2026-08-14 addition (Henry direction, expanded allowlist): some real
 * feeds (official blog archives especially) return their full history, not
 * just recent posts — one source alone returning 1000+ items would flood
 * the human-review queue with stale backlog instead of current news.
 * `perSourceLimit`, if set, keeps only the `perSourceLimit` most recent
 * (by publishedDate) items per source, computed after parsing so it never
 * changes what counts as a valid item, only how much of a large feed's
 * history this run considers "current." Omitted/undefined preserves the
 * old unbounded behavior exactly (existing callers/tests are unaffected).
 *
 * @param {{sources: Array<{id: string, name: string, feedUrl?: string}>}} allowlist
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number, perSourceLimit?: number, maxFeedBytes?: number }} [opts]
 * @returns {Promise<Array<object>>}
 */
export async function fetchAllowlistedItems(
  allowlist,
  { fetchImpl = fetch, timeoutMs = 10000, perSourceLimit, maxFeedBytes = MAX_FEED_BYTES } = {}
) {
  const perSource = await Promise.all(
    (allowlist?.sources ?? []).map(async (source) => {
      if (!source.feedUrl) {
        console.warn(`refresh-today: ${source.id} has no feedUrl configured, skipping`);
        return [];
      }
      const feedUrl = normalizeHttpsUrl(source.feedUrl);
      if (!feedUrl) {
        console.warn(`refresh-today: ${source.id} has an invalid or non-HTTPS feedUrl, skipping`);
        return [];
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchImpl(feedUrl, { signal: controller.signal, redirect: 'error' });
        if (!res.ok) {
          console.warn(`refresh-today: ${source.id} returned HTTP ${res.status}, skipping this source for this run`);
          return [];
        }
        const declaredBytes = Number(res.headers?.get?.('content-length'));
        if (Number.isFinite(declaredBytes) && declaredBytes > maxFeedBytes) {
          console.warn(`refresh-today: ${source.id} feed exceeds the response limit, skipping`);
          return [];
        }
        const xml = await res.text();
        if (Buffer.byteLength(xml, 'utf8') > maxFeedBytes) {
          console.warn(`refresh-today: ${source.id} feed exceeds the response limit, skipping`);
          return [];
        }
        const items = parseFeedItems(xml, source);
        return perSourceLimit ? sortItemsByRecency(items).slice(0, perSourceLimit) : items;
      } catch (err) {
        console.warn(`refresh-today: ${source.id} fetch/parse failed (${err.message}), skipping this source for this run`);
        return [];
      } finally {
        clearTimeout(timer);
      }
    })
  );
  return perSource.flat();
}

/**
 * 2026-08-13 fix: `buildTodayStories`'s `stories` array only ever contains
 * *this run's* ready items — a real bug found live: a second run that
 * reviewed 3 different stories than the first run's 9 replaced the whole
 * published set down to 3, silently discarding the other 6 even though
 * nothing about them had become wrong or stale. FR-005's "bounded Today
 * panel" means bounded in count, not "only whatever was reviewed in the
 * single most recent run" — a learner opening Today between runs should
 * still see the stories from the last several runs, not just the latest.
 *
 * Pure: merges by id (a re-published story with the same id — e.g. a
 * correction — overwrites the old copy), sorts newest-first by the story's
 * own `source.publishedDate`, and caps at `cap` so the "bounded" part of
 * FR-005 still holds structurally rather than growing forever.
 *
 * @param {object[]} existingStories
 * @param {object[]} newStories
 * @param {{ cap?: number }} [opts]
 * @returns {object[]}
 */
export function mergePublishedStories(existingStories, newStories, { cap = 30 } = {}) {
  const byId = new Map();
  for (const s of existingStories ?? []) byId.set(s.id, s);
  for (const s of newStories ?? []) byId.set(s.id, s); // this run's copy wins on an id collision
  const merged = [...byId.values()];
  merged.sort((a, b) => new Date(b.source?.publishedDate ?? 0) - new Date(a.source?.publishedDate ?? 0));
  return merged.slice(0, cap);
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
  const publishReviewedOnly = process.argv.includes('--publish-reviewed-only');
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

  // Fetch + merge into the review queue. This never publishes a guess:
  // every item lands in content/review-queue.json, pre-filled with a
  // keyword suggestion where confidence allows, but still `reviewed:
  // false` until a human confirms it (design.md's content-review
  // responsibility; see categorize-story.js's module doc for why).
  const [rawItems, existingQueue, keywordMap] = await Promise.all([
    fetchAllowlistedItems(allowlist, { perSourceLimit: 8 }),
    readReviewQueue(),
    readKeywordMap(),
  ]);
  const mergedQueue = prepareReviewQueue(existingQueue, rawItems, keywordMap, {
    includeFetchedCandidates: !publishReviewedOnly,
  });

  // Anything already reviewed (from a prior run, edited by hand) gets
  // applied now: captured as a correction into the keyword map, then
  // handed to the normal validate-before-publish pipeline. Nothing here
  // bypasses validateForPublish — an incompletely reviewed entry simply
  // isn't "ready" and stays in the queue.
  const { readyItems, remainingQueue, keywordMap: updatedKeywordMap } = applyReviewedQueue(
    mergedQueue,
    keywordMap
  );

  await Promise.all([writeReviewQueue(remainingQueue), writeKeywordMap(updatedKeywordMap)]);

  if (readyItems.length === 0) {
    console.log(
      `refresh-today: fetched ${rawItems.length} item(s), queue now has ${remainingQueue.length} ` +
        `awaiting review, nothing ready to publish this run.`
    );
    return;
  }

  // 2026-08-12 gauntlet-review finding: freshness/source-coverage used to
  // be computed only from `readyItems` (whatever a human has reviewed so
  // far) — a source that fetched nothing at all (a dead feed URL, an HTTP
  // error) never appeared in that set and so never failed closed to
  // `error`, exactly the case design.md §6 step 3 is meant to catch. Pass
  // the full `rawItems` fetched this run, plus every allowlisted source id
  // (so a source that returned literally zero items, not even a droppable
  // one, still counts), independent of what's actually ready to publish.
  const result = buildTodayStories(readyItems, anchors, {
    freshnessSourceItems: rawItems,
    expectedSourceIds: allowlist.sources.map((s) => s.id),
  });
  if (result.errors.length > 0) {
    console.error(
      `refresh-today: ${readyItems.length} reviewed item(s) failed final validation, not publishing:\n` +
        result.errors.join('\n')
    );
    process.exitCode = 1;
    return;
  }

  // 2026-08-13 fix: merge this run's newly-ready stories with whatever was
  // already published, rather than replacing the whole file — see
  // mergePublishedStories's doc comment for the real bug this closes.
  const existingTodayRaw = await readFile(new URL('../content/today-stories.json', import.meta.url), 'utf-8').catch(
    () => null
  );
  const existingStories = existingTodayRaw ? (JSON.parse(existingTodayRaw).stories ?? []) : [];
  // 2026-08-14 (Henry direction, D-016): raised from the default cap of 30
  // to 60 alongside the source-allowlist expansion, so the panel can hold
  // >=50 current stories across categories — still a fixed bound (FR-005
  // stays "bounded"), just a larger one, not unbounded growth.
  const mergedStories = mergePublishedStories(existingStories, result.todayStories.stories, { cap: 60 });
  const finalTodayStories = { ...result.todayStories, stories: mergedStories };
  const finalErrors = validateForPublish(finalTodayStories, anchors);
  if (finalErrors.length > 0) {
    console.error(
      `refresh-today: merged story set failed final validation, not publishing:\n` + finalErrors.join('\n')
    );
    process.exitCode = 1;
    return;
  }
  await publishTodayStories({ todayStories: finalTodayStories, errors: [] });
  console.log(
    `refresh-today: published ${finalTodayStories.stories.length} stories (${result.todayStories.stories.length} new this run), ` +
      `freshnessState=${finalTodayStories.freshnessState}, dropped=${result.stats.droppedCount}, ` +
      `queue now has ${remainingQueue.length} awaiting review`
  );
}

// Only run when executed directly (`node scripts/refresh-today.js`), not when imported by tests.
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}` || process.argv[1]?.endsWith('refresh-today.js')) {
  main().catch((err) => {
    console.error('refresh-today: pipeline failed:', err.message);
    process.exitCode = 1;
  });
}
