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
  publishTodayStories,
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
