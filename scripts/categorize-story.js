// scripts/categorize-story.js — keyword-suggestion + human-correction
// capture for T10's category/traceToAnchors gap.
//
// Context (tasks.md T10, .ai/sdd/specs/001-global-history-atlas/tasks.md):
// parseFeedItems() in scripts/refresh-today.js deliberately never sets
// `category` or `traceToAnchors` — an RSS feed has no way to know a
// headline connects to a historical anchor. validateForPublish correctly
// fail-closes on that. This module does NOT remove that gate. It exists to
// make the human step faster (pre-filled suggestions instead of a blank
// form) and, over time, better (accepted/corrected suggestions get folded
// back into the keyword map) — never to auto-publish a guess.
//
// Deliberately NOT a topic-taxonomy or ML system (requirements.md scopes
// topic-taxonomy design Out of Scope, D-007; TD-001 forbids a new
// dependency for this). It is plain substring/keyword matching over a
// small, hand-seeded, human-correctable JSON file
// (content/category-keywords.json). Every suggestion carries a numeric
// confidence and every item — regardless of confidence — still requires a
// human to set `reviewed: true` before `applyReviewedQueue` (this file,
// below) will let it anywhere near publish. Corrected 2026-08-12: an
// earlier version of this comment named a `scripts/apply-review-
// corrections.js` file that was never actually created — the enforcement
// has always lived in `applyReviewedQueue` here and `refresh-today.js`'s
// `main()`, which calls it directly.

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'as', 'at', 'by', 'from', 'this', 'that',
  'it', 'its', 'new', 'says', 'after', 'over', 'into', 'amid', 'how', 'why',
  // 2026-08-12 follow-up: a live dry-run against a real fetched headline
  // ("Here's why AI agents lie and cheat...") proved this list wasn't
  // exhaustive enough — "here" slipped through into a captured correction
  // (a near-universal word that would false-positive-match almost any
  // future headline). Adding the rest of the common short function words
  // this project's actual live content has already shown are missing,
  // not a guess at a "complete" stopword list.
  'here', 'there', 'their', 'they', 'these', 'those', 'about', 'than',
  'when', 'what', 'who', 'which', 'not', 'can', 'will', 'has', 'have', 'had',
]);

function normalize(text) {
  return (text ?? '').toLowerCase();
}

/**
 * Counts how many entries of `keywordList` appear as substrings of `text`.
 * Substring matching, not word-boundary matching — deliberately simple
 * (TD-001), and multi-word phrases ("data labeling") work without a
 * tokenizer.
 *
 * @param {string} text - already-lowercased
 * @param {string[]} keywordList
 * @returns {{ score: number, matched: string[] }}
 */
function scoreKeywords(text, keywordList) {
  const matched = (keywordList ?? []).filter((kw) => kw && text.includes(kw.toLowerCase()));
  return { score: matched.length, matched };
}

/**
 * 2026-08-12 gauntlet-review finding: a single generic single-word keyword
 * match (e.g. a captured correction like "agents" or "reach") was being
 * treated as confident enough to silently pre-fill category/traceToAnchors
 * — reproduced live: an unrelated "Nvidia shares reach record high" chip
 * story auto-traced to the agentic-loop anchor. A single-word match on a
 * common word is much weaker evidence than a multi-word phrase match
 * ("content moderation") or two independent keyword hits, so this gates
 * "confident enough to pre-fill" on more than a raw score >= threshold:
 * either the score already clears 2, or at least one matched keyword is a
 * multi-word phrase (a much more specific, much less accidental signal).
 * `confidence`/`score` themselves are untouched (still a plain count) —
 * only the pre-fill decision changed, so no `matched`/`confidence` value
 * anywhere in this module's public API changed meaning.
 *
 * @param {number} confidence
 * @param {string[]} matched
 * @param {number} threshold
 */
function isConfidentEnoughToPrefill(confidence, matched, threshold) {
  if (confidence < threshold) return false;
  return confidence >= 2 || (matched ?? []).some((kw) => kw.includes(' '));
}

/**
 * @param {string} text - item headline (+ dek), already lowercased
 * @param {Record<string, string[]>} categoryKeywords - keywordMap.categories
 * @returns {{ category: string|null, confidence: number, matched: string[] }}
 */
export function suggestCategory(text, categoryKeywords) {
  let best = { category: null, confidence: 0, matched: [] };
  for (const [category, keywords] of Object.entries(categoryKeywords ?? {})) {
    const { score, matched } = scoreKeywords(text, keywords);
    if (score > best.confidence) {
      best = { category, confidence: score, matched };
    }
  }
  return best;
}

/**
 * Unlike category (one winner), a story can legitimately trace to more than
 * one anchor, so every anchor with at least one keyword hit is returned,
 * ranked by score.
 *
 * @param {string} text - already lowercased
 * @param {Record<string, string[]>} anchorKeywords - keywordMap.anchors
 * @returns {{ traceToAnchors: string[], confidence: number, matchesById: Record<string, string[]> }}
 */
export function suggestAnchors(text, anchorKeywords) {
  const hits = [];
  const matchesById = {};
  for (const [anchorId, keywords] of Object.entries(anchorKeywords ?? {})) {
    const { score, matched } = scoreKeywords(text, keywords);
    if (score > 0) {
      hits.push({ anchorId, score });
      matchesById[anchorId] = matched;
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return {
    traceToAnchors: hits.map((h) => h.anchorId),
    confidence: hits[0]?.score ?? 0,
    matchesById,
  };
}

/**
 * Combines suggestCategory + suggestAnchors for one fetched item.
 *
 * @param {{headline: string, dek?: string}} item
 * @param {{categories: Record<string,string[]>, anchors: Record<string,string[]>}} keywordMap
 * @param {{ threshold?: number }} [opts] - confidence below this is treated as "not good enough to pre-fill"
 * @returns {object} suggestion fields, merged onto the item by buildReviewQueueEntry
 */
export function suggestCategorization(item, keywordMap, { threshold = 1 } = {}) {
  const text = normalize(`${item.headline ?? ''} ${item.dek ?? ''}`);
  const categoryResult = suggestCategory(text, keywordMap?.categories);
  const anchorResult = suggestAnchors(text, keywordMap?.anchors);
  const topAnchorId = anchorResult.traceToAnchors[0];
  const topAnchorMatched = topAnchorId ? anchorResult.matchesById[topAnchorId] : [];

  const categoryConfident = isConfidentEnoughToPrefill(categoryResult.confidence, categoryResult.matched, threshold);
  const anchorConfident = isConfidentEnoughToPrefill(anchorResult.confidence, topAnchorMatched, threshold);

  return {
    suggestedCategory: categoryResult.category,
    categoryConfidence: categoryResult.confidence,
    categoryConfident,
    suggestedTraceToAnchors: anchorResult.traceToAnchors,
    anchorConfidence: anchorResult.confidence,
    anchorConfident,
    needsReview: !categoryConfident || !anchorConfident,
  };
}

/**
 * Builds one content/review-queue.json entry from a raw parsed feed item.
 * Confident suggestions (per `isConfidentEnoughToPrefill` above) are
 * pre-filled into `category` / `traceToAnchors` so a human only has to
 * confirm; low-confidence items are left blank (`null` / `[]`) so a human
 * fills them from scratch — a blank field is never treated as "no trace
 * exists," only "not yet reviewed." `reviewed` starts false either way:
 * pre-filled or not, nothing here is publishable until a human sets it to
 * true — `applyReviewedQueue` in this same file is what enforces that, not
 * this function.
 *
 * @param {object} item - a parseFeedItems()-shaped raw item
 * @param {object} keywordMap
 * @param {{ threshold?: number }} [opts]
 */
export function buildReviewQueueEntry(item, keywordMap, opts = {}) {
  const suggestion = suggestCategorization(item, keywordMap, opts);
  return {
    ...item,
    ...suggestion,
    category: suggestion.categoryConfident ? suggestion.suggestedCategory : null,
    traceToAnchors: suggestion.anchorConfident ? suggestion.suggestedTraceToAnchors : [],
    reviewed: false,
  };
}

/**
 * Extracts a small number of candidate keywords from `text` that aren't
 * already present in `existingKeywords` — stopword-filtered, length > 3,
 * capped, so one correction can't flood the keyword list.
 *
 * @param {string} text - already lowercased
 * @param {string[]} existingKeywords
 * @param {number} [cap]
 * @returns {string[]}
 */
function extractCandidateKeywords(text, existingKeywords, cap = 4) {
  const existingLower = (existingKeywords ?? []).map((k) => k.toLowerCase());
  const already = new Set(existingLower);
  // Also exclude any word that's already covered as part of an existing
  // multi-word keyword ("content" is already implied by "content
  // moderation") — otherwise every correction would re-add fragments of
  // phrases that already match just fine.
  const coveredFragment = (w) => existingLower.some((kw) => kw.includes(w));
  const words = text.match(/[a-z][a-z'-]{3,}/g) ?? [];
  const candidates = [];
  for (const w of words) {
    // 2026-08-12 second follow-up (found by independent code review, not
    // the live dry-run itself): the real live-fetched headline used a
    // curly/typographic apostrophe ("Here's"), which the tokenizer regex's
    // straight-apostrophe-only character class doesn't treat as part of a
    // word — it split into "here" (caught by the first STOPWORDS fix) and a
    // dropped 1-char "s". But a headline using a plain ASCII apostrophe
    // instead (equally plausible from a different feed) produces the token
    // "here's" as one piece, and STOPWORDS.has("here's") is false even with
    // "here" in the list — that contracted/possessive form would still leak
    // through untouched. Strip a trailing 's before every check (and store
    // the stripped form), so STOPWORDS's existing bare-word entries cover
    // their contracted forms too, instead of needing every "'s" variant
    // enumerated separately.
    const normalized = w.replace(/'s$/, '');
    if (
      STOPWORDS.has(w) || STOPWORDS.has(normalized) ||
      already.has(w) || already.has(normalized) ||
      coveredFragment(w) || coveredFragment(normalized) ||
      candidates.includes(normalized)
    ) continue;
    candidates.push(normalized);
    if (candidates.length >= cap) break;
  }
  return candidates;
}

/**
 * The feedback-capture step the reviewer asked for: when a human reviews a
 * queue entry, whatever they actually confirmed becomes new keyword data —
 * but ONLY where the original suggestion needed help (confidence was below
 * threshold), so accepting an already-confident suggestion doesn't add
 * redundant keywords, and only for the category/anchors the human actually
 * confirmed (never the rejected suggestion).
 *
 * Pure: returns a new keywordMap rather than mutating the input, so the
 * caller (apply-review-corrections.js) controls when/whether to persist it.
 *
 * @param {object} entry - a review-queue entry with reviewed:true and a human-set category/traceToAnchors
 * @param {object} keywordMap
 * @returns {{ keywordMap: object, added: {category: string[], anchors: Record<string,string[]>} }}
 */
export function captureCorrection(entry, keywordMap) {
  const text = normalize(`${entry.headline ?? ''} ${entry.dek ?? ''}`);
  const nextCategories = { ...(keywordMap?.categories ?? {}) };
  const nextAnchors = { ...(keywordMap?.anchors ?? {}) };
  const added = { category: [], anchors: {} };

  if (entry.category && (entry.categoryConfidence ?? 0) < (entry.threshold ?? 1)) {
    const existing = nextCategories[entry.category] ?? [];
    const newTerms = extractCandidateKeywords(text, existing);
    if (newTerms.length > 0) {
      nextCategories[entry.category] = [...existing, ...newTerms];
      added.category = newTerms;
    }
  }

  if ((entry.anchorConfidence ?? 0) < (entry.threshold ?? 1)) {
    for (const anchorId of entry.traceToAnchors ?? []) {
      const existing = nextAnchors[anchorId] ?? [];
      const newTerms = extractCandidateKeywords(text, existing);
      if (newTerms.length > 0) {
        nextAnchors[anchorId] = [...existing, ...newTerms];
        added.anchors[anchorId] = newTerms;
      }
    }
  }

  return {
    keywordMap: { ...keywordMap, categories: nextCategories, anchors: nextAnchors },
    added,
  };
}

/**
 * Splits a review queue into what's ready to publish vs. what's still
 * waiting on a human, and folds every ready entry's confirmed
 * category/anchors back into the keyword map via captureCorrection — this
 * is the write-back loop: a low-confidence item a human corrects today
 * pre-fills correctly next time the same wording shows up.
 *
 * An entry marked `reviewed: true` but missing `category` is NOT treated as
 * ready — a human ticking "reviewed" without actually filling the category
 * is a content bug, not a green light, so it stays in the queue rather than
 * silently vanishing.
 *
 * 2026-08-13 correction: this used to also require a non-empty
 * `traceToAnchors` before treating anything as ready — stricter than the
 * schema actually needs (content/today-stories.schema.json's REQUIRED_STORY_FIELDS
 * requires the field to exist, not be non-empty) and stricter than FR-005/
 * FR-006 actually mandate (FR-006 describes trace-to-origin as a behavior
 * for stories that HAVE a trace, not a requirement that every Today story
 * have one). An honestly-reviewed story that genuinely has no historical
 * connection is not a guess — leaving traceToAnchors empty is the correct,
 * honest answer, not an incomplete one, and was blocking most real
 * reviewed content from ever publishing.
 *
 * @param {object[]} queueEntries
 * @param {object} keywordMap
 * @returns {{ readyItems: object[], remainingQueue: object[], keywordMap: object }}
 */
export function applyReviewedQueue(queueEntries, keywordMap) {
  let nextKeywordMap = keywordMap;
  const readyItems = [];
  const remainingQueue = [];

  for (const entry of queueEntries ?? []) {
    const isComplete = entry.reviewed && entry.category;
    if (!isComplete) {
      remainingQueue.push(entry);
      continue;
    }
    const { keywordMap: updated } = captureCorrection(entry, nextKeywordMap);
    nextKeywordMap = updated;
    readyItems.push(entry);
  }

  return { readyItems, remainingQueue, keywordMap: nextKeywordMap };
}
