// test/categorize-story.test.js — coverage for scripts/categorize-story.js,
// the keyword-suggestion + human-correction write-back loop that closes
// T10's category/traceToAnchors gap (see that module's doc comment).
//
// Honesty note matching the module: this is lexical substring matching,
// not NLP/ML. These tests prove the matching, threshold, and feedback-loop
// bookkeeping behave as documented — not that the keyword seed list is
// linguistically complete.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  suggestCategory,
  suggestAnchors,
  suggestCategorization,
  buildReviewQueueEntry,
  captureCorrection,
  applyReviewedQueue,
} from '../scripts/categorize-story.js';

const KEYWORD_MAP = {
  categories: {
    labor: ['gig worker', 'content moderation'],
    research: ['paper', 'benchmark'],
  },
  anchors: {
    kenyalabor: ['kenya', 'content moderation'],
    transformer: ['transformer', 'large language model'],
  },
};

test('suggestCategory', async (t) => {
  await t.test('picks the category with the most keyword hits', () => {
    const result = suggestCategory('kenyan gig workers push back on content moderation contracts', KEYWORD_MAP.categories);
    assert.equal(result.category, 'labor');
    assert.equal(result.confidence, 2);
    assert.deepEqual(result.matched.sort(), ['content moderation', 'gig worker']);
  });

  await t.test('returns null/0 confidence when nothing matches', () => {
    const result = suggestCategory('a totally unrelated headline about weather', KEYWORD_MAP.categories);
    assert.equal(result.category, null);
    assert.equal(result.confidence, 0);
  });
});

test('suggestAnchors', async (t) => {
  await t.test('returns every anchor with at least one hit, ranked by score', () => {
    const result = suggestAnchors('kenyan workers flag content moderation for a new large language model', KEYWORD_MAP.anchors);
    assert.deepEqual(result.traceToAnchors, ['kenyalabor', 'transformer']);
    assert.equal(result.confidence, 2, 'top-ranked anchor (kenyalabor) matched 2 keywords');
  });

  await t.test('empty array, 0 confidence when nothing matches', () => {
    const result = suggestAnchors('nothing relevant here', KEYWORD_MAP.anchors);
    assert.deepEqual(result.traceToAnchors, []);
    assert.equal(result.confidence, 0);
  });
});

test('suggestCategorization / buildReviewQueueEntry', async (t) => {
  const confidentItem = { id: 'a', headline: 'Kenyan gig workers escalate content moderation dispute' };
  const vagueItem = { id: 'b', headline: 'Tech company announces quarterly update' };

  await t.test('a confident match pre-fills category and traceToAnchors', () => {
    const entry = buildReviewQueueEntry(confidentItem, KEYWORD_MAP, { threshold: 1 });
    assert.equal(entry.category, 'labor');
    assert.deepEqual(entry.traceToAnchors, ['kenyalabor']);
    assert.equal(entry.needsReview, false);
    assert.equal(entry.reviewed, false, 'a suggestion is never auto-marked reviewed');
  });

  await t.test('a low-confidence/no match leaves category null and traceToAnchors empty, not a guess', () => {
    const entry = buildReviewQueueEntry(vagueItem, KEYWORD_MAP, { threshold: 1 });
    assert.equal(entry.category, null);
    assert.deepEqual(entry.traceToAnchors, []);
    assert.equal(entry.needsReview, true);
    assert.equal(entry.reviewed, false);
  });

  await t.test('a stricter threshold demotes an otherwise-confident single-keyword match to needing review', () => {
    const entry = buildReviewQueueEntry(confidentItem, KEYWORD_MAP, { threshold: 3 });
    assert.equal(entry.needsReview, true);
    assert.equal(entry.category, null, 'confidence 2 < threshold 3, so no pre-fill even though something matched');
  });

  await t.test('regression (2026-08-12, found by independent gauntlet review): a lone single-word keyword hit is never confident enough to pre-fill, even at the default threshold', () => {
    // Live-reproduced real harm: content/category-keywords.json once had
    // generic single-word captures ("agents", "cheat", "reach") from a
    // human correction, and a *completely unrelated* headline
    // ("Nvidia shares reach record high after chip deal") auto-traced
    // confidently to the agentic-loop anchor purely off matching "reach".
    // A single generic word is weak evidence; a multi-word phrase or two
    // independent hits is much stronger. This proves the gate now requires
    // more than one weak single-word match before pre-filling — the exact
    // shape of keyword map that caused the real incident.
    const weakMap = {
      categories: { 'safety-governance': ['reach'] },
      anchors: { 'agentic-loop': ['reach'] },
    };
    const unrelatedItem = { id: 'z', headline: 'Nvidia shares reach record high after chip deal' };
    const entry = buildReviewQueueEntry(unrelatedItem, weakMap, { threshold: 1 });
    assert.equal(entry.category, null, 'a lone single-word match must not confidently pre-fill the category');
    assert.deepEqual(entry.traceToAnchors, [], 'a lone single-word match must not confidently pre-fill traceToAnchors');
    assert.equal(entry.needsReview, true);
  });

  await t.test('a multi-word phrase match still pre-fills confidently at the default threshold (stronger evidence than a bare word)', () => {
    const phraseMap = {
      categories: { labor: ['content moderation'] },
      anchors: { kenyalabor: ['content moderation'] },
    };
    const item = { id: 'y', headline: 'New content moderation rules announced' };
    const entry = buildReviewQueueEntry(item, phraseMap, { threshold: 1 });
    assert.equal(entry.category, 'labor');
    assert.deepEqual(entry.traceToAnchors, ['kenyalabor']);
    assert.equal(entry.needsReview, false);
  });
});

test('captureCorrection', async (t) => {
  await t.test('a low-confidence human correction adds new keywords to the category and each confirmed anchor', () => {
    const entry = {
      headline: 'Nairobi contractors sue over unpaid annotation work',
      category: 'labor',
      categoryConfidence: 0,
      traceToAnchors: ['kenyalabor'],
      anchorConfidence: 0,
      threshold: 1,
      reviewed: true,
    };
    const { keywordMap: updated, added } = captureCorrection(entry, KEYWORD_MAP);
    assert.ok(added.category.length > 0, 'should extract at least one new keyword for the category');
    assert.ok(updated.categories.labor.length > KEYWORD_MAP.categories.labor.length);
    assert.ok(added.anchors.kenyalabor?.length > 0);
    assert.ok(updated.anchors.kenyalabor.length > KEYWORD_MAP.anchors.kenyalabor.length);
    // Original map must be untouched (pure function).
    assert.equal(KEYWORD_MAP.categories.labor.length, 2);
  });

  await t.test('a confident correction (confidence already >= threshold) adds nothing new', () => {
    const entry = {
      headline: 'Kenyan gig workers escalate content moderation dispute',
      category: 'labor',
      categoryConfidence: 2,
      traceToAnchors: ['kenyalabor'],
      anchorConfidence: 2,
      threshold: 1,
      reviewed: true,
    };
    const { added } = captureCorrection(entry, KEYWORD_MAP);
    assert.deepEqual(added.category, []);
    assert.deepEqual(added.anchors, {});
  });

  await t.test('stopwords and already-known keywords are never re-added', () => {
    const entry = {
      headline: 'The new content moderation policy amid worker anger',
      category: 'labor',
      categoryConfidence: 0,
      traceToAnchors: [],
      anchorConfidence: 0,
      threshold: 1,
      reviewed: true,
    };
    const { added } = captureCorrection(entry, KEYWORD_MAP);
    assert.ok(!added.category.includes('content'), 'the multi-word phrase "content moderation" is already known verbatim');
    assert.ok(!added.category.some((w) => ['the', 'new', 'amid'].includes(w)), 'stopwords must never be captured');
  });

  await t.test('regression (2026-08-12 live dry-run, fixed 2026-08-12 second follow-up): near-universal function words — including their possessive/contracted forms — are never captured', () => {
    // A real fetched headline ("Here's why AI agents lie and cheat to reach
    // their goals") slipped "here" into a captured correction before the
    // STOPWORDS list was widened. The first fix widened STOPWORDS but was
    // insufficient on its own: the tokenizer regex (/[a-z][a-z'-]{3,}/g)
    // keeps the apostrophe, so the real token extracted from this exact
    // headline is "here's", not "here" — STOPWORDS.has("here's") stays
    // false no matter how many bare words are added, and with cap=4 the
    // loop fills up on "here's"/"agents"/"cheat"/"reach" before ever
    // reaching "their". This test asserts the exact real leaking token
    // directly (not just a set of bare words that were never actually
    // produced by this input) — it would have caught the incomplete first
    // fix and must keep passing after the second (possessive-stripping) fix.
    const entry = {
      headline: "Here's why AI agents lie and cheat to reach their goals",
      category: 'safety-governance',
      categoryConfidence: 0,
      traceToAnchors: ['agentic-loop'],
      anchorConfidence: 0,
      threshold: 1,
      reviewed: true,
    };
    const { added } = captureCorrection(entry, KEYWORD_MAP);
    const all = [...added.category, ...(added.anchors['agentic-loop'] ?? [])];
    assert.ok(
      !all.includes("here's"),
      `the exact leaking token from the real headline must never be captured, got: ${JSON.stringify(all)}`
    );
    assert.ok(
      !all.some((w) => ['here', 'there', 'their', 'they'].includes(w)),
      `common function words must never be captured, got: ${JSON.stringify(all)}`
    );
  });
});

test('applyReviewedQueue', async (t) => {
  await t.test('splits complete, reviewed entries into readyItems and leaves the rest queued', () => {
    const queue = [
      { id: 'ready-1', headline: 'Kenyan gig workers dispute', category: 'labor', traceToAnchors: ['kenyalabor'], categoryConfidence: 2, anchorConfidence: 2, reviewed: true },
      { id: 'unreviewed-1', headline: 'Something new', category: null, traceToAnchors: [], reviewed: false },
      { id: 'reviewed-but-incomplete', headline: 'Missing fields', category: null, traceToAnchors: [], reviewed: true },
    ];
    const { readyItems, remainingQueue } = applyReviewedQueue(queue, KEYWORD_MAP);
    assert.deepEqual(readyItems.map((i) => i.id), ['ready-1']);
    assert.deepEqual(remainingQueue.map((i) => i.id), ['unreviewed-1', 'reviewed-but-incomplete']);
  });

  await t.test('requires literal Boolean true for manual publication eligibility', () => {
    const nonApprovals = [false, 'false', 'true', 1, null, undefined];
    const queue = [
      ...nonApprovals.map((reviewed, index) => ({
        id: `not-approved-${index}`,
        headline: 'Categorized but not literally reviewed',
        category: 'labor',
        traceToAnchors: [],
        ...(reviewed === undefined ? {} : { reviewed }),
      })),
      {
        id: 'literal-true',
        headline: 'Literally reviewed and categorized',
        category: 'labor',
        traceToAnchors: [],
        reviewed: true,
      },
    ];

    const { readyItems, remainingQueue } = applyReviewedQueue(queue, KEYWORD_MAP);
    assert.deepEqual(readyItems.map((item) => item.id), ['literal-true']);
    assert.deepEqual(
      remainingQueue.map((item) => item.id),
      nonApprovals.map((_, index) => `not-approved-${index}`)
    );
  });

  await t.test('folds every ready item\'s correction into one accumulated keyword map', () => {
    const queue = [
      { id: '1', headline: 'gig worker dispute over payment terms', category: 'labor', traceToAnchors: ['kenyalabor'], categoryConfidence: 1, anchorConfidence: 1, threshold: 1, reviewed: true },
    ];
    const { keywordMap } = applyReviewedQueue(queue, KEYWORD_MAP);
    assert.notEqual(keywordMap, KEYWORD_MAP, 'must return a new object, not mutate the input');
  });

  await t.test('an empty queue is a no-op, not an error', () => {
    const { readyItems, remainingQueue, keywordMap } = applyReviewedQueue([], KEYWORD_MAP);
    assert.deepEqual(readyItems, []);
    assert.deepEqual(remainingQueue, []);
    assert.deepEqual(keywordMap, KEYWORD_MAP);
  });

  await t.test('regression (2026-08-13): a reviewed entry with a category but no anchor trace is ready to publish — an honest "no connection" is not incomplete', () => {
    // Previously required traceToAnchors.length > 0 to ever be "ready" —
    // stricter than the schema needs and stricter than FR-005/FR-006
    // actually mandate, and it silently blocked most real human-reviewed
    // content from ever publishing (found live: 6 of 9 honestly-reviewed
    // stories never appeared in Today because they genuinely had no
    // historical anchor connection to report).
    const queue = [
      { id: 'no-trace', headline: 'A story with no anchor connection', category: 'research', traceToAnchors: [], reviewed: true },
    ];
    const { readyItems, remainingQueue } = applyReviewedQueue(queue, KEYWORD_MAP);
    assert.deepEqual(readyItems.map((i) => i.id), ['no-trace'], 'reviewed + categorized is enough to be ready, even with an empty trace');
    assert.deepEqual(remainingQueue, []);
  });
});
