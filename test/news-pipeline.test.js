// test/news-pipeline.test.js — T10 acceptance-criteria tests for the pure
// pipeline functions in scripts/refresh-today.js. No live network call;
// all fixture/fake source data (tasks.md T10 Verification).

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile as readFileFs, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  gatePubdates,
  computeSourceFreshness,
  reduceFreshness,
  validateForPublish,
  buildTodayStories,
  mergePublishedStories,
  publishTodayStories,
  parseFeedItems,
  fetchAllowlistedItems,
  sortItemsByRecency,
  buildReviewQueue,
  mergeReviewQueue,
  normalizeHttpsUrl,
  prepareReviewQueue,
  selectAutoPublishableItems,
} from '../scripts/refresh-today.js';

const NOW = new Date('2026-08-10T12:00:00.000Z');

const FIXTURE_ANCHORS = {
  anchors: [
    { id: 'anchor-a', title: 'Anchor A', date: '1950-01-01', lane: 'philosophy', story: 's', claimType: 'documented', confidence: 'high', source: { label: 'x', accessedDate: '2026-01-01' } },
    { id: 'anchor-b', title: 'Anchor B', date: '1960-01-01', lane: 'philosophy', story: 's', claimType: 'documented', confidence: 'high', source: { label: 'x', accessedDate: '2026-01-01' } },
  ],
};

function makeItem(overrides = {}) {
  return {
    id: 'story-1',
    sourceId: 'src-1',
    sourceName: 'Fixture Source',
    category: 'ai-policy',
    headline: 'Fixture headline',
    publishedDate: '2026-08-10T06:00:00.000Z', // 6h before NOW -> fresh
    traceToAnchors: ['anchor-a'],
    ...overrides,
  };
}

// --- Step 2: pubdate gate ------------------------------------------------

test('gatePubdates: drops an item with no parseable date, and counts the drop', () => {
  const items = [
    makeItem({ id: 'undated', publishedDate: undefined }),
    makeItem({ id: 'garbage-date', publishedDate: 'not-a-date' }),
    makeItem({ id: 'valid' }),
  ];
  const { kept, dropped, droppedCount } = gatePubdates(items, { now: NOW });

  assert.equal(kept.length, 1);
  assert.equal(kept[0].id, 'valid');
  assert.equal(droppedCount, 2);
  assert.ok(dropped.some((d) => d.item.id === 'undated'));
  assert.ok(dropped.some((d) => d.item.id === 'garbage-date'));
  // Deliberately undated test item is dropped, not included (T10 acceptance criterion).
  assert.ok(!kept.some((k) => k.id === 'undated'));
});

test('gatePubdates: drops a future-dated item, and counts the drop', () => {
  const items = [
    makeItem({ id: 'future', publishedDate: '2099-01-01T00:00:00.000Z' }),
    makeItem({ id: 'valid' }),
  ];
  const { kept, dropped, droppedCount } = gatePubdates(items, { now: NOW });

  assert.equal(kept.length, 1);
  assert.equal(kept[0].id, 'valid');
  assert.equal(droppedCount, 1);
  assert.equal(dropped[0].reason, 'future-dated publish date');
});

test('gatePubdates: keeps a validly-dated, past item untouched', () => {
  const items = [makeItem({ id: 'valid' })];
  const { kept, droppedCount } = gatePubdates(items, { now: NOW });
  assert.equal(droppedCount, 0);
  assert.equal(kept.length, 1);
});

// --- Step 3a: per-source freshness --------------------------------------

test('computeSourceFreshness: recent item (within 24h) -> fresh', () => {
  const state = computeSourceFreshness(
    [makeItem({ publishedDate: '2026-08-10T06:00:00.000Z' })], // 6h old
    { now: NOW }
  );
  assert.equal(state, 'fresh');
});

test('computeSourceFreshness: item older than 24h but within 72h -> stale', () => {
  const state = computeSourceFreshness(
    [makeItem({ publishedDate: '2026-08-08T12:00:00.000Z' })], // 48h old
    { now: NOW }
  );
  assert.equal(state, 'stale');
});

test('computeSourceFreshness: item older than 72h -> very_stale', () => {
  const state = computeSourceFreshness(
    [makeItem({ publishedDate: '2026-08-01T12:00:00.000Z' })], // ~9 days old
    { now: NOW }
  );
  assert.equal(state, 'very_stale');
});

test('computeSourceFreshness: no kept items (undatable source) fails closed to error, never fresh', () => {
  const state = computeSourceFreshness([], { now: NOW });
  assert.equal(state, 'error');
  assert.notEqual(state, 'fresh');
});

// --- Step 3b: min()-reduction --------------------------------------------

test('reduceFreshness: a deliberately stale-only source set produces stale, never fresh', () => {
  const state = reduceFreshness(['stale', 'stale']);
  assert.equal(state, 'stale');
  assert.notEqual(state, 'fresh');
});

test('reduceFreshness: a deliberately stale-only source set can produce very_stale, never fresh', () => {
  const state = reduceFreshness(['very_stale', 'stale']);
  assert.equal(state, 'very_stale');
  assert.notEqual(state, 'fresh');
});

test('reduceFreshness: the worst (least fresh) source wins across a mixed set', () => {
  assert.equal(reduceFreshness(['fresh', 'stale']), 'stale');
  assert.equal(reduceFreshness(['fresh', 'very_stale']), 'very_stale');
  assert.equal(reduceFreshness(['fresh', 'error']), 'error');
  assert.equal(reduceFreshness(['fresh', 'no_data']), 'no_data');
});

test('reduceFreshness: one undatable source fails the whole slice closed to error, never fresh', () => {
  const state = reduceFreshness(['fresh', 'fresh', 'error']);
  assert.equal(state, 'error');
  assert.notEqual(state, 'fresh');
});

test('reduceFreshness: empty source set is no_data, not fresh', () => {
  assert.equal(reduceFreshness([]), 'no_data');
});

test('reduceFreshness: all-fresh sources reduce to fresh', () => {
  assert.equal(reduceFreshness(['fresh', 'fresh']), 'fresh');
});

// --- Step 4: schema validation before publish -----------------------------

test('validateForPublish: a valid today-stories candidate passes with zero errors', () => {
  const candidate = {
    lastUpdated: NOW.toISOString(),
    freshnessState: 'fresh',
    stories: [
      {
        id: 'story-1',
        category: 'ai-policy',
        headline: 'Valid headline',
        source: { name: 'Fixture Source', publishedDate: '2026-08-10' },
        traceToAnchors: ['anchor-a'],
      },
    ],
  };
  const errors = validateForPublish(candidate, FIXTURE_ANCHORS);
  assert.deepEqual(errors, []);
});

test('validateForPublish: blocks a candidate with an invalid freshnessState', () => {
  const candidate = {
    lastUpdated: NOW.toISOString(),
    freshnessState: 'super-fresh', // not in the taxonomy
    stories: [],
  };
  const errors = validateForPublish(candidate, FIXTURE_ANCHORS);
  assert.ok(errors.length > 0);
  assert.ok(errors.some((e) => e.includes('freshnessState')));
});

test('validateForPublish: blocks a candidate with a story missing required fields', () => {
  const candidate = {
    lastUpdated: NOW.toISOString(),
    freshnessState: 'fresh',
    stories: [{ id: 'broken' /* missing category, headline, source, traceToAnchors */ }],
  };
  const errors = validateForPublish(candidate, FIXTURE_ANCHORS);
  assert.ok(errors.length > 0);
});

test('validateForPublish: blocks a candidate whose traceToAnchors references a nonexistent anchor', () => {
  const candidate = {
    lastUpdated: NOW.toISOString(),
    freshnessState: 'fresh',
    stories: [
      {
        id: 'story-1',
        category: 'ai-policy',
        headline: 'Headline',
        source: { name: 'Fixture Source', publishedDate: '2026-08-10' },
        traceToAnchors: ['does-not-exist'],
      },
    ],
  };
  const errors = validateForPublish(candidate, FIXTURE_ANCHORS);
  assert.ok(errors.some((e) => e.includes('does-not-exist')));
});

// --- End-to-end pure pipeline: buildTodayStories --------------------------

test('buildTodayStories: a publish that would fail schema validation is blocked (errors non-empty), not shipped', () => {
  const items = [
    makeItem({ id: 'story-1', traceToAnchors: ['nonexistent-anchor'] }), // dangling reference -> validation failure
  ];
  const { todayStories, errors } = buildTodayStories(items, FIXTURE_ANCHORS, { now: NOW });

  assert.ok(errors.length > 0, 'expected validation errors for a dangling traceToAnchors reference');
  // The candidate document is still returned for inspection/logging, but a
  // caller (publishTodayStories) must refuse to write it — proven separately below.
  assert.equal(todayStories.stories[0].traceToAnchors[0], 'nonexistent-anchor');
});

test('buildTodayStories: end-to-end happy path produces a valid, freshness-correct document', () => {
  const items = [
    makeItem({ id: 'story-1', sourceId: 'src-1', publishedDate: '2026-08-10T06:00:00.000Z' }), // fresh
    makeItem({ id: 'story-2', sourceId: 'src-2', publishedDate: '2026-08-08T06:00:00.000Z' }), // stale
    makeItem({ id: 'story-undated', sourceId: 'src-1', publishedDate: undefined }), // dropped by gate
  ];
  const { todayStories, errors, stats } = buildTodayStories(items, FIXTURE_ANCHORS, { now: NOW });

  assert.deepEqual(errors, []);
  assert.equal(stats.droppedCount, 1);
  assert.equal(todayStories.stories.length, 2);
  // min() across a fresh source and a stale source must reduce to stale, not fresh.
  assert.equal(todayStories.freshnessState, 'stale');
});

test('buildTodayStories: an undatable source (all its items dropped) fails the whole slice closed, not fresh', () => {
  const items = [
    makeItem({ id: 'story-1', sourceId: 'src-1', publishedDate: '2026-08-10T06:00:00.000Z' }), // fresh
    makeItem({ id: 'story-2', sourceId: 'src-2', publishedDate: 'not-a-date' }), // src-2 contributes nothing datable
  ];
  const { todayStories } = buildTodayStories(items, FIXTURE_ANCHORS, { now: NOW });
  assert.equal(todayStories.freshnessState, 'error');
  assert.notEqual(todayStories.freshnessState, 'fresh');
});

test('buildTodayStories: regression (2026-08-12, found by independent gauntlet review) — a source that produced zero of the READY (published) items must still fail closed, not be silently absent from freshness', () => {
  // Real live-run scenario this reproduces: refresh-today.js's main() only
  // passed `readyItems` (human-reviewed items) into buildTodayStories.
  // reuters-tech returned an HTTP 401 (zero items, not even a droppable
  // one) and ap-news-ai's feedUrl parsed zero items — neither ever produced
  // anything a human could review, so neither ever appeared in readyItems,
  // so the freshness computation never even knew those sources existed,
  // let alone that they'd failed. Only mit-tech-review-ai (which DID
  // produce a reviewed, ready, fresh item) determined the whole slice's
  // freshness — a real source failure went completely unrepresented.
  const readyItems = [makeItem({ id: 'ready-1', sourceId: 'src-fresh', publishedDate: '2026-08-10T06:00:00.000Z' })]; // fresh on its own
  // Simulates fetchAllowlistedItems()'s real output: the fresh source's
  // items, PLUS nothing at all from two failed sources (not present here
  // as items — that's the point, they contributed literally zero output).
  const allFetchedThisRun = [...readyItems];

  const readyOnly = buildTodayStories(readyItems, FIXTURE_ANCHORS, { now: NOW });
  assert.equal(readyOnly.todayStories.freshnessState, 'fresh', 'sanity: without the fix, only the one fresh source is ever considered');

  const fixed = buildTodayStories(readyItems, FIXTURE_ANCHORS, {
    now: NOW,
    freshnessSourceItems: allFetchedThisRun,
    expectedSourceIds: ['src-fresh', 'src-failed-401', 'src-failed-unparseable'],
  });
  assert.equal(fixed.stats.perSourceFreshness['src-failed-401'], 'error', 'a source with zero fetched items must fail closed');
  assert.equal(fixed.stats.perSourceFreshness['src-failed-unparseable'], 'error');
  assert.equal(fixed.todayStories.freshnessState, 'error', 'the whole slice must fail closed when any expected source produced nothing, not just report the one working source as fresh');
  // The published stories themselves are untouched by this — still exactly
  // the ready/reviewed items, freshness computation is additive-only.
  assert.deepEqual(fixed.todayStories.stories.map((s) => s.id), ['ready-1']);
});

// --- mergePublishedStories: accumulate across runs, don't replace ---------

test('mergePublishedStories: regression (2026-08-13) — new stories are added to, not replacing, previously published ones', () => {
  // Real bug found live: a run that published 9 stories, followed by a run
  // that only had 3 different stories ready, wiped the file down to 3 —
  // silently discarding 6 stories that were never wrong or stale, just not
  // part of the second run's ready set. FR-005's "bounded" panel means
  // bounded in count, not "only whatever the single most recent run had."
  const existing = [
    { id: 'a', source: { publishedDate: '2026-08-10' } },
    { id: 'b', source: { publishedDate: '2026-08-11' } },
  ];
  const fresh = [{ id: 'c', source: { publishedDate: '2026-08-13' } }];
  const merged = mergePublishedStories(existing, fresh);
  assert.deepEqual(merged.map((s) => s.id).sort(), ['a', 'b', 'c']);
});

test('mergePublishedStories: a re-published story with the same id overwrites the old copy, not duplicates it', () => {
  const existing = [{ id: 'a', category: 'old-category', source: { publishedDate: '2026-08-10' } }];
  const fresh = [{ id: 'a', category: 'corrected-category', source: { publishedDate: '2026-08-10' } }];
  const merged = mergePublishedStories(existing, fresh);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].category, 'corrected-category');
});

test('mergePublishedStories: sorts newest-first and caps at the given bound', () => {
  const existing = [
    { id: 'old', source: { publishedDate: '2026-01-01' } },
    { id: 'mid', source: { publishedDate: '2026-06-01' } },
  ];
  const fresh = [{ id: 'new', source: { publishedDate: '2026-08-13' } }];
  const merged = mergePublishedStories(existing, fresh, { cap: 2 });
  assert.deepEqual(merged.map((s) => s.id), ['new', 'mid'], 'newest-first, oldest dropped once over the cap');
});

// --- publishTodayStories: the actual "blocked, not shipped" write gate ----

test('publishTodayStories: refuses to write a candidate that failed validation (blocked, not shipped)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'knewzly-t10-'));
  const outPath = join(dir, 'today-stories.json');
  const failingResult = { todayStories: { lastUpdated: NOW.toISOString(), freshnessState: 'fresh', stories: [] }, errors: ['fixture validation error'] };

  await assert.rejects(() => publishTodayStories(failingResult, outPath), /refusing to publish/);
  await assert.rejects(() => readFileFs(outPath), /ENOENT/);

  await rm(dir, { recursive: true, force: true });
});

test('publishTodayStories: writes a valid candidate to disk', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'knewzly-t10-'));
  const outPath = join(dir, 'today-stories.json');
  const items = [makeItem({ id: 'story-1', publishedDate: '2026-08-10T06:00:00.000Z' })];
  const result = buildTodayStories(items, FIXTURE_ANCHORS, { now: NOW });

  await publishTodayStories(result, outPath);
  const written = JSON.parse(await readFileFs(outPath, 'utf-8'));
  assert.equal(written.freshnessState, 'fresh');
  assert.equal(written.stories.length, 1);

  await rm(dir, { recursive: true, force: true });
});

// --- parseFeedItems: pure RSS/Atom extraction, no network -----------------
// Closes the other real gap the T9-T12 gauntlet review flagged: T10's
// fetchAllowlistedItems used to be an unconditional throw. It's now a real
// per-source fetch+parse; this section tests the pure parsing logic
// directly against fixture feed bodies (no network).

const RSS_FIXTURE = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Fixture Wire</title>
  <item>
    <title>AI lab ships new model &amp; benchmark</title>
    <link>https://example.com/story-1</link>
    <guid>https://example.com/story-1</guid>
    <pubDate>Mon, 10 Aug 2026 06:00:00 GMT</pubDate>
  </item>
  <item>
    <title><![CDATA[CDATA-wrapped headline with <em>markup</em>]]></title>
    <link>https://example.com/story-2</link>
    <pubDate>Tue, 11 Aug 2026 06:00:00 GMT</pubDate>
  </item>
  <item>
    <link>https://example.com/story-untitled</link>
    <pubDate>Tue, 11 Aug 2026 06:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

const ATOM_FIXTURE = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Fixture Atom Feed</title>
  <entry>
    <title>Atom-format headline</title>
    <id>tag:example.com,2026:story-3</id>
    <link rel="alternate" href="https://example.com/story-3"/>
    <published>2026-08-10T06:00:00Z</published>
  </entry>
</feed>`;

test('parseFeedItems: RSS 2.0 — extracts title/link/pubDate per item, decodes entities and CDATA', () => {
  const items = parseFeedItems(RSS_FIXTURE, { id: 'fixture-wire', name: 'Fixture Wire' });
  // The fixture has 3 <item> blocks; the 3rd has no <title> and must be
  // dropped (see the next test), so 2 items are expected here.
  assert.equal(items.length, 2);

  assert.equal(items[0].headline, 'AI lab ships new model & benchmark');
  assert.equal(items[0].url, 'https://example.com/story-1');
  assert.equal(items[0].id, 'https://example.com/story-1'); // guid preferred
  assert.equal(items[0].publishedDate, new Date('Mon, 10 Aug 2026 06:00:00 GMT').toISOString());
  assert.equal(items[0].sourceId, 'fixture-wire');
  assert.equal(items[0].sourceName, 'Fixture Wire');

  assert.equal(items[1].headline, 'CDATA-wrapped headline with <em>markup</em>', 'CDATA must be unwrapped, not left as a literal CDATA string');
  assert.equal(items[1].id, 'https://example.com/story-2', 'falls back to link when no guid tag present');
});

test('parseFeedItems: an item with no <title> is dropped, not emitted as a blank headline', () => {
  const items = parseFeedItems(RSS_FIXTURE, { id: 'fixture-wire', name: 'Fixture Wire' });
  assert.equal(items.length, 2, 'only 2 of the fixture\'s 3 <item> blocks have a <title>');
  assert.ok(items.every((i) => i.headline && i.headline.length > 0), 'every returned item has a non-empty headline (the untitled 3rd <item> block was silently skipped)');
  assert.ok(!items.some((i) => i.url === 'https://example.com/story-untitled'), 'the untitled item never appears in the output at all');
});

test('parseFeedItems: Atom — extracts title/id/rel=alternate link/published', () => {
  const items = parseFeedItems(ATOM_FIXTURE, { id: 'fixture-atom', name: 'Fixture Atom Feed' });
  assert.equal(items.length, 1);
  assert.equal(items[0].headline, 'Atom-format headline');
  assert.equal(items[0].url, 'https://example.com/story-3');
  assert.equal(items[0].id, 'tag:example.com,2026:story-3');
  assert.equal(items[0].publishedDate, '2026-08-10T06:00:00.000Z');
});

test('parseFeedItems: malformed/empty XML yields zero items, never throws', () => {
  assert.doesNotThrow(() => parseFeedItems('not xml at all', { id: 'x', name: 'X' }));
  assert.deepEqual(parseFeedItems('not xml at all', { id: 'x', name: 'X' }), []);
  assert.deepEqual(parseFeedItems('', { id: 'x', name: 'X' }), []);
});

test('parseFeedItems: returned items never carry category or traceToAnchors — editorial curation stays a separate step', () => {
  const items = parseFeedItems(RSS_FIXTURE, { id: 'fixture-wire', name: 'Fixture Wire' });
  for (const item of items) {
    assert.equal('category' in item, false, 'category must not be guessed from feed data');
    assert.equal('traceToAnchors' in item, false, 'traceToAnchors must not be guessed from feed data');
  }
});

test('parseFeedItems: unsafe or non-HTTPS story links are omitted rather than rendered as anchors', () => {
  const unsafeFeed = `<rss><channel>
    <item><title>Script link</title><link>javascript:alert(1)</link><pubDate>Mon, 10 Aug 2026 06:00:00 GMT</pubDate></item>
    <item><title>Plain HTTP link</title><link>http://example.com/story</link><pubDate>Mon, 10 Aug 2026 06:00:00 GMT</pubDate></item>
  </channel></rss>`;
  const items = parseFeedItems(unsafeFeed, { id: 'unsafe', name: 'Unsafe Fixture' });
  assert.equal(items.length, 2);
  assert.ok(items.every((item) => !('url' in item)));
  assert.equal(normalizeHttpsUrl('https://example.com/story?a=1&amp;b=2'), 'https://example.com/story?a=1&b=2');
  assert.equal(normalizeHttpsUrl('https://user:pass@example.com/story'), undefined);
});

test('buildTodayStories and validateForPublish enforce HTTPS even for manually reviewed queue data', () => {
  const unsafe = makeItem({ url: 'javascript:alert(1)' });
  const built = buildTodayStories([unsafe], FIXTURE_ANCHORS, { now: NOW });
  assert.equal('url' in built.todayStories.stories[0].source, false);

  const manuallyEdited = structuredClone(built.todayStories);
  manuallyEdited.stories[0].source.url = 'http://example.com/story';
  assert.ok(validateForPublish(manuallyEdited, FIXTURE_ANCHORS).some((error) => error.includes('public HTTPS URL')));
});

// --- fetchAllowlistedItems: real fetch+parse, per-source failure isolation
// (fake fetchImpl only — no real network call in tests)

test('fetchAllowlistedItems: aggregates parsed items across sources that succeed', async () => {
  const allowlist = {
    sources: [
      { id: 'a', name: 'Source A', feedUrl: 'https://a.example.com/feed' },
      { id: 'b', name: 'Source B', feedUrl: 'https://b.example.com/feed' },
    ],
  };
  const fetchImpl = async (url) => ({
    ok: true,
    text: async () => (url.includes('a.example.com') ? RSS_FIXTURE : ATOM_FIXTURE),
  });

  const items = await fetchAllowlistedItems(allowlist, { fetchImpl });
  assert.equal(items.length, 3); // 2 from RSS fixture (untitled 3rd item dropped) + 1 from Atom fixture
  assert.ok(items.some((i) => i.sourceId === 'a'));
  assert.ok(items.some((i) => i.sourceId === 'b'));
});

test('fetchAllowlistedItems: one source failing (network error, non-2xx) does not abort the others or throw', async () => {
  const allowlist = {
    sources: [
      { id: 'broken-network', name: 'Broken', feedUrl: 'https://broken.example.com/feed' },
      { id: 'broken-http', name: 'Broken HTTP', feedUrl: 'https://http-fail.example.com/feed' },
      { id: 'good', name: 'Good Source', feedUrl: 'https://good.example.com/feed' },
      { id: 'no-feed-url', name: 'No Feed URL Configured' },
    ],
  };
  const fetchImpl = async (url) => {
    if (url.includes('broken.example.com')) throw new Error('simulated network failure');
    if (url.includes('http-fail.example.com')) return { ok: false, status: 503, text: async () => '' };
    return { ok: true, text: async () => RSS_FIXTURE };
  };

  const items = await fetchAllowlistedItems(allowlist, { fetchImpl });
  assert.equal(items.length, 2, 'only the good source contributes items (untitled 3rd item dropped); the others degrade to zero, not a thrown error');
  assert.ok(items.every((i) => i.sourceId === 'good'));
});

test('fetchAllowlistedItems: an empty allowlist resolves to an empty array, not an error', async () => {
  const items = await fetchAllowlistedItems({ sources: [] }, { fetchImpl: async () => ({ ok: true, text: async () => '' }) });
  assert.deepEqual(items, []);
});

test('fetchAllowlistedItems: rejects non-HTTPS sources, redirects, and oversized feed bodies', async () => {
  const calls = [];
  const allowlist = {
    sources: [
      { id: 'insecure', name: 'Insecure', feedUrl: 'http://example.com/feed' },
      { id: 'oversized', name: 'Oversized', feedUrl: 'https://large.example.com/feed' },
    ],
  };
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, text: async () => RSS_FIXTURE + 'x'.repeat(100) };
  };

  const items = await fetchAllowlistedItems(allowlist, { fetchImpl, maxFeedBytes: 10 });
  assert.deepEqual(items, []);
  assert.equal(calls.length, 1, 'the non-HTTPS feed is rejected before fetch');
  assert.equal(calls[0].options.redirect, 'error');
});

// 2026-08-14: real allowlist expansion surfaced feeds (official blog
// archives especially) that return hundreds+ of items, not just recent
// posts — perSourceLimit keeps a run's review queue to genuinely current
// news instead of a source's full history.
const MANY_DATED_ITEMS_FEED = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Prolific Archive Feed</title>
  <item><title>Oldest post</title><link>https://example.com/p1</link><pubDate>Mon, 01 Jan 2024 06:00:00 GMT</pubDate></item>
  <item><title>Middle post</title><link>https://example.com/p2</link><pubDate>Mon, 01 Jan 2025 06:00:00 GMT</pubDate></item>
  <item><title>Newest post</title><link>https://example.com/p3</link><pubDate>Mon, 10 Aug 2026 06:00:00 GMT</pubDate></item>
  <item><title>Second newest post</title><link>https://example.com/p4</link><pubDate>Tue, 09 Aug 2026 06:00:00 GMT</pubDate></item>
  <item><title>Undated post</title><link>https://example.com/p5</link></item>
</channel></rss>`;

test('fetchAllowlistedItems: perSourceLimit keeps only the N most recent items per source, undated last', async () => {
  const allowlist = { sources: [{ id: 'prolific', name: 'Prolific', feedUrl: 'https://prolific.example.com/feed' }] };
  const fetchImpl = async () => ({ ok: true, text: async () => MANY_DATED_ITEMS_FEED });

  const uncapped = await fetchAllowlistedItems(allowlist, { fetchImpl });
  assert.equal(uncapped.length, 5, 'sanity: the fixture really does have 5 items when uncapped');

  const capped = await fetchAllowlistedItems(allowlist, { fetchImpl, perSourceLimit: 2 });
  assert.equal(capped.length, 2);
  assert.deepEqual(capped.map((i) => i.headline), ['Newest post', 'Second newest post']);
});

test('fetchAllowlistedItems: perSourceLimit applies independently per source', async () => {
  const allowlist = {
    sources: [
      { id: 'prolific', name: 'Prolific', feedUrl: 'https://prolific.example.com/feed' },
      { id: 'sparse', name: 'Sparse', feedUrl: 'https://sparse.example.com/feed' },
    ],
  };
  const fetchImpl = async (url) => ({
    ok: true,
    text: async () => (url.includes('prolific') ? MANY_DATED_ITEMS_FEED : RSS_FIXTURE),
  });

  const items = await fetchAllowlistedItems(allowlist, { fetchImpl, perSourceLimit: 2 });
  assert.equal(items.filter((i) => i.sourceId === 'prolific').length, 2);
  assert.equal(items.filter((i) => i.sourceId === 'sparse').length, 2, 'RSS_FIXTURE only has 2 titled items, so the cap is a no-op here');
});

test('sortItemsByRecency: newest first, undated items sort last', () => {
  const items = [
    { headline: 'old', publishedDate: '2024-01-01T00:00:00.000Z' },
    { headline: 'undated' },
    { headline: 'newest', publishedDate: '2026-08-10T00:00:00.000Z' },
    { headline: 'mid', publishedDate: '2025-06-01T00:00:00.000Z' },
  ];
  const sorted = sortItemsByRecency(items);
  assert.deepEqual(sorted.map((i) => i.headline), ['newest', 'mid', 'old', 'undated']);
  assert.notEqual(sorted, items, 'returns a new array, does not mutate the input order');
});

// --- buildReviewQueue / mergeReviewQueue -----------------------------------
// The categorization gap named in parseFeedItems' doc comment doesn't get
// solved by pretending it isn't there. These two functions turn raw fetched
// items into a reviewable, keyword-pre-filled queue instead — see
// scripts/categorize-story.js and test/categorize-story.test.js for the
// suggestion/confidence/correction-capture logic itself; these tests only
// cover the merge/no-clobber contract that's specific to refresh-today.js.

const KEYWORD_MAP = {
  categories: { labor: ['gig worker'] },
  anchors: { 'kenyalabor': ['kenya'] },
};

test('buildReviewQueue: every raw item becomes an unreviewed queue entry', () => {
  const raw = [
    { id: 'a', headline: 'Kenyan gig worker dispute' },
    { id: 'b', headline: 'Unrelated headline' },
  ];
  const queue = buildReviewQueue(raw, KEYWORD_MAP);
  assert.equal(queue.length, 2);
  assert.ok(queue.every((e) => e.reviewed === false));
  assert.equal(queue[0].category, 'labor', 'confident keyword match pre-fills the category');
  assert.equal(queue[1].category, null, 'no match leaves category null rather than guessing');
});

test('mergeReviewQueue: new items are appended; items already in the queue are left untouched', () => {
  const existing = [
    { id: 'a', headline: 'Already in queue', category: 'labor', traceToAnchors: ['kenyalabor'], reviewed: true },
  ];
  const raw = [
    { id: 'a', headline: 'A refetched copy of the same story, different wording' }, // same id — must not clobber
    { id: 'c', headline: 'A brand new story' },
  ];
  const merged = mergeReviewQueue(existing, raw, KEYWORD_MAP);
  assert.equal(merged.length, 2, 'id "a" is not duplicated');
  const a = merged.find((e) => e.id === 'a');
  assert.equal(a.reviewed, true, 'the already-reviewed entry must survive a re-fetch untouched');
  assert.equal(a.headline, 'Already in queue', 'not overwritten by the refetched wording');
  assert.ok(merged.some((e) => e.id === 'c' && e.reviewed === false));
});

test('mergeReviewQueue: an empty existing queue just becomes the fresh entries', () => {
  const raw = [{ id: 'x', headline: 'Kenyan gig worker dispute' }];
  const merged = mergeReviewQueue([], raw, KEYWORD_MAP);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'x');
});

test('prepareReviewQueue: scheduled publication consumes only the versioned human-reviewed queue', () => {
  const existing = [
    { id: 'reviewed', headline: 'Approved story', category: 'labor', traceToAnchors: [], reviewed: true },
  ];
  const fetched = [{ id: 'network-candidate', headline: 'Unreviewed network content' }];
  const prepared = prepareReviewQueue(existing, fetched, KEYWORD_MAP, {
    includeFetchedCandidates: false,
  });

  assert.deepEqual(prepared, existing);
  assert.notEqual(prepared, existing, 'the caller receives an independent queue array');
  assert.equal(prepared.some((entry) => entry.id === 'network-candidate'), false);
});

test('selectAutoPublishableItems: approved-source automation publishes only recent, confidently categorized stories', () => {
  const now = new Date('2026-08-31T20:00:00.000Z');
  const raw = [
    {
      id: 'recent-confident',
      sourceId: 'approved-source',
      sourceName: 'Approved Source',
      headline: 'Kenyan gig worker dispute',
      publishedDate: '2026-08-31T18:00:00.000Z',
      url: 'https://example.com/recent',
    },
    {
      id: 'recent-unclassified',
      sourceId: 'approved-source',
      sourceName: 'Approved Source',
      headline: 'Unrelated headline',
      publishedDate: '2026-08-31T17:00:00.000Z',
      url: 'https://example.com/unclassified',
    },
    {
      id: 'old-confident',
      sourceId: 'approved-source',
      sourceName: 'Approved Source',
      headline: 'Kenyan gig worker dispute',
      publishedDate: '2026-08-30T08:00:00.000Z',
      url: 'https://example.com/old',
    },
    {
      id: 'future-confident',
      sourceId: 'approved-source',
      sourceName: 'Approved Source',
      headline: 'Kenyan gig worker dispute',
      publishedDate: '2026-09-01T18:00:00.000Z',
      url: 'https://example.com/future',
    },
  ];

  const result = selectAutoPublishableItems(raw, KEYWORD_MAP, { now });

  assert.deepEqual(result.readyItems.map((item) => item.id), ['recent-confident']);
  assert.equal(result.readyItems[0].category, 'labor');
  assert.deepEqual(result.readyItems[0].traceToAnchors, [], 'automation must not invent a historical trace');
  assert.equal(result.stats.fetchedCount, 4);
  assert.equal(result.stats.publishableCount, 1);
  assert.equal(result.stats.tooOldCount, 1);
  assert.equal(result.stats.unclassifiedCount, 1);
  assert.equal(result.stats.invalidDateCount, 1);
});
