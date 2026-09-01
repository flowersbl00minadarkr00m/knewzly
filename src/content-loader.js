// ContentLoader — the one module every other component depends on to reach
// content/anchors.json, content/relationships.json, and content/today-stories.json.
// design.md §4/§5. No framework, no bundler (TD-001/TD-002) — plain ESM.
//
// Runtime note: today-stories.json is written ONLY by the scheduled CI job
// (T10, design.md §6). Nothing in this module or anywhere else in the
// frontend ever writes to it — ContentLoader only reads.

/**
 * Default reader for browser use: fetch() against a relative/absolute path.
 * @param {string} path
 */
export async function fetchReader(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`ContentLoader: failed to fetch ${path} (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Loads all three content files through an injectable reader, so tests can
 * substitute a filesystem-based reader instead of requiring a running
 * dev server (see test/content-schema.test.js).
 *
 * @param {object} [opts]
 * @param {string} [opts.basePath] - directory prefix, defaults to "content/"
 * @param {(path: string) => Promise<any>} [opts.reader] - defaults to fetchReader
 * @returns {Promise<{anchors: object, relationships: object, todayStories: object}>}
 */
export async function loadContent({ basePath = 'content/', reader = fetchReader } = {}) {
  const [anchors, relationships, todayStories] = await Promise.all([
    reader(`${basePath}anchors.json`),
    reader(`${basePath}relationships.json`),
    reader(`${basePath}today-stories.json`),
  ]);
  return { anchors, relationships, todayStories };
}

// --- Validation -------------------------------------------------------
// Anchor and relationship checks remain local; Today validation delegates to
// the executable JSON Schema in today-stories-validator.js.

const REQUIRED_ANCHOR_FIELDS = ['id', 'title', 'date', 'lane', 'story', 'claimType', 'confidence', 'source'];
const REQUIRED_RELATIONSHIP_FIELDS = ['id', 'from', 'to', 'type', 'confidence', 'claimType', 'label'];

/**
 * @param {{anchors: {anchors: any[]}, relationships?: {relationships: any[]}, todayStories?: {stories: any[]}}} content
 * @param {{validateToday?: (todayStories: object, anchors: object) => string[]}} [opts]
 * @returns {string[]} error messages; empty array means valid
 */
export function validateContent({ anchors, relationships, todayStories }, { validateToday } = {}) {
  const errors = [];
  const anchorList = anchors?.anchors ?? [];
  const anchorIds = new Set(anchorList.map((a) => a.id));

  for (const anchor of anchorList) {
    for (const field of REQUIRED_ANCHOR_FIELDS) {
      if (anchor[field] === undefined || anchor[field] === null || anchor[field] === '') {
        errors.push(`anchor "${anchor.id ?? '(no id)'}" is missing required field "${field}"`);
      }
    }
    if (anchor.source && (!anchor.source.label || !anchor.source.accessedDate)) {
      errors.push(`anchor "${anchor.id ?? '(no id)'}" has an incomplete source (needs label + accessedDate)`);
    }
  }

  const relationshipList = relationships?.relationships ?? [];
  for (const rel of relationshipList) {
    for (const field of REQUIRED_RELATIONSHIP_FIELDS) {
      if (rel[field] === undefined || rel[field] === null || rel[field] === '') {
        errors.push(`relationship "${rel.id ?? '(no id)'}" is missing required field "${field}"`);
      }
    }
    if (rel.from && !anchorIds.has(rel.from)) {
      errors.push(`relationship "${rel.id}" has "from: ${rel.from}" which does not resolve to any anchor id`);
    }
    if (rel.to && !anchorIds.has(rel.to)) {
      errors.push(`relationship "${rel.id}" has "to: ${rel.to}" which does not resolve to any anchor id`);
    }
  }

  if (todayStories) {
    if (validateToday) {
      errors.push(...validateToday(todayStories, anchors));
    }
  }

  return errors;
}
