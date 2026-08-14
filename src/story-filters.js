// src/story-filters.js — Today panel category filters (FR-014, promoted
// from Could Have/untasked to Should Have per requirements.md D-013).
//
// Deliberately NOT a new topic taxonomy (requirements.md D-007 still scopes
// that Out of Scope, TD-001 forbids a new dependency) — filtering is plain
// exact-match over each story's existing `category` field (the same field
// scripts/categorize-story.js already writes, seeded from
// content/category-keywords.json's `categories` vocabulary). "Models" and
// "AI Lifecycle" (Henry's named examples, D-013) map onto that same
// vocabulary as two new category ids (`models`, `ai-lifecycle`) rather than
// a parallel filter-only taxonomy, so a filtered story and its on-card
// category label always agree.
//
// Pure logic only — no DOM here (see src/section-nav.js for the DOM
// component that uses this).

export const ALL_CATEGORIES_ID = 'all';

// Known category ids -> display label, in the fixed shortcut order Henry
// asked for ("shortcut filters for Models, AI Lifecycle, etc."). This list
// intentionally matches content/category-keywords.json's `categories` keys
// exactly, so a filter chip and the real seed vocabulary can never drift
// apart silently — see test/story-filters.test.js's cross-check.
export const CATEGORY_LABELS = {
  models: 'Models',
  'ai-lifecycle': 'AI Lifecycle',
  'compute-energy': 'Compute & Energy',
  labor: 'Labor',
  'safety-governance': 'Safety & Governance',
  research: 'Research',
};

/**
 * Builds the filter chip list: "All" first, then only the categories that
 * actually appear in `stories` (never a category with zero matching
 * stories — an empty chip would be a dead end, not a real filter).
 *
 * @param {Array<{category?: string}>} stories
 * @returns {Array<{id: string, label: string}>}
 */
export function getAvailableCategories(stories) {
  const present = new Set((stories ?? []).map((s) => s?.category).filter(Boolean));
  const known = Object.keys(CATEGORY_LABELS).filter((id) => present.has(id));
  const unknown = [...present].filter((id) => !CATEGORY_LABELS[id]).sort();

  return [
    { id: ALL_CATEGORIES_ID, label: 'All' },
    ...known.map((id) => ({ id, label: CATEGORY_LABELS[id] })),
    ...unknown.map((id) => ({ id, label: id })),
  ];
}

/**
 * @param {Array<{category?: string}>} stories
 * @param {string} categoryId
 * @returns {Array<object>} the matching stories, or all of them for 'all'
 */
export function filterStoriesByCategory(stories, categoryId) {
  const list = stories ?? [];
  if (!categoryId || categoryId === ALL_CATEGORIES_ID) return list;
  return list.filter((s) => s?.category === categoryId);
}
