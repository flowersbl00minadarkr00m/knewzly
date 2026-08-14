// src/timeline-canvas.js — TimelineCanvas (Task T3)
//
// Renders the era axis + regional/Philosophy lanes + focusable anchor
// buttons described in design.md §4 (TimelineCanvas / EraAxis / Lane /
// Anchor) and required by requirements.md US-001/FR-001/NFR-001.
//
// Scope boundary (per tasks.md T3's Owned Surfaces): this module renders
// anchors on the shared time axis only. It does not render relationship
// arcs (T4/RelationshipLayer), does not open a context drawer (T5), and
// does not persist visited state (T6) — those are later tasks' owned
// surfaces and are intentionally left alone here.
//
// No framework, no build step (TD-001) — plain ESM, loaded via
// <script type="module"> directly by the browser.

import { loadContent, validateContent } from './content-loader.js';

// Lane order and display labels match the reviewed prototype
// (timeline-atlas-concept.html) and design.md §4's component list. The
// Philosophy lane is persistent (always rendered) per US-001's acceptance
// criteria, even when — as with T1's fixture — no anchor currently
// occupies it.
const LANES = [
  { id: 'philosophy', label: 'Philosophy' },
  { id: 'europe', label: 'Europe' },
  { id: 'north-america', label: 'North America' },
  { id: 'asia', label: 'Asia' },
  { id: 'africa', label: 'Africa' },
];

const LANE_BAND_HEIGHT = 132;
const LANE_TOP_OFFSET = 84; // below the era axis
const ERA_SLOT_WIDTH = 210; // chronological, intentionally non-proportional — matches the prototype's stated convention (see .atlas-caption copy)
const CANVAS_LEFT_MARGIN = 76;
const CANVAS_RIGHT_MARGIN = 60;
const ANCHOR_ROW_HEIGHT = 96;

/**
 * @param {{anchors: any[]}} content
 * @returns {any[]} anchors sorted ascending by date.sortKey
 */
function sortedAnchors(anchors) {
  return [...anchors].sort((a, b) => (a.date?.sortKey ?? 0) - (b.date?.sortKey ?? 0));
}

/**
 * Assigns each anchor an x position keyed to its era's slot index (one
 * slot per distinct sortKey, in ascending order) and a y position keyed
 * to its lane, staggering multiple anchors that land in the same
 * lane+era slot so they don't overlap.
 *
 * @param {any[]} anchors sorted ascending by sortKey
 * @returns {{anchor: any, x: number, y: number}[]}
 */
function layoutAnchors(anchors) {
  const eraSlots = [...new Set(anchors.map((a) => a.date?.sortKey))];
  const eraIndex = new Map(eraSlots.map((key, i) => [key, i]));
  const laneIndex = new Map(LANES.map((lane, i) => [lane.id, i]));
  const occupied = new Map(); // "laneId:eraIndex" -> count, for stagger

  return anchors.map((anchor) => {
    const slot = eraIndex.get(anchor.date?.sortKey) ?? 0;
    const x = CANVAS_LEFT_MARGIN + slot * ERA_SLOT_WIDTH + ERA_SLOT_WIDTH / 2;
    const laneId = resolveLaneId(anchor);
    const laneRow = laneIndex.get(laneId) ?? 1;
    const key = `${laneId}:${slot}`;
    const stagger = occupied.get(key) ?? 0;
    occupied.set(key, stagger + 1);
    const y = LANE_TOP_OFFSET + laneRow * LANE_BAND_HEIGHT + 36 + stagger * ANCHOR_ROW_HEIGHT;
    return { anchor, x, y, slot };
  });
}

function laneLabel(laneId) {
  return LANES.find((l) => l.id === laneId)?.label ?? laneId;
}

/**
 * Resolves an anchor's lane id to a known lane, falling back to 'europe'
 * for anything unrecognized — matching layoutAnchors' positioning fallback.
 * Used everywhere a lane is displayed (accessible name, meta text) so an
 * anchor with a bad/unknown lane value never surfaces its raw, unrecognized
 * lane id to a screen reader or as visible text; it just quietly renders in
 * Europe like it's positioned.
 */
function resolveLaneId(anchor) {
  return LANES.some((l) => l.id === anchor.lane) ? anchor.lane : 'europe';
}

/**
 * Builds the accessible name for an anchor button per US-001: date, title,
 * and region/lane must all be exposed in the accessible name.
 */
function anchorAccessibleName(anchor, { suggested = false } = {}) {
  const date = anchor.date?.display ?? 'undated';
  const lane = laneLabel(resolveLaneId(anchor));
  const base = `${date}, ${anchor.title}, ${lane} lane`;
  return suggested ? `${base} — suggested starting point` : base;
}

/**
 * Renders the timeline canvas (era axis, lanes, anchor buttons) into the
 * given container element from already-loaded, already-validated content.
 *
 * @param {HTMLElement} root
 * @param {{anchors: any[]}} anchorsDoc
 */
export function renderTimelineCanvas(root, anchorsDoc) {
  const anchors = sortedAnchors(anchorsDoc?.anchors ?? []);

  if (anchors.length === 0) {
    root.innerHTML = '<p class="atlas-empty">No anchor events are available yet.</p>';
    return;
  }

  const placed = layoutAnchors(anchors);
  const eraSlots = [...new Set(anchors.map((a) => a.date?.sortKey))];
  const maxSlot = eraSlots.length - 1;
  const canvasWidth = CANVAS_LEFT_MARGIN + (maxSlot + 1) * ERA_SLOT_WIDTH + CANVAS_RIGHT_MARGIN;
  const maxLaneRow = LANES.length - 1;
  const maxAnchorY = Math.max(...placed.map((p) => p.y));
  const canvasHeight = Math.max(
    LANE_TOP_OFFSET + (maxLaneRow + 1) * LANE_BAND_HEIGHT + 40,
    maxAnchorY + ANCHOR_ROW_HEIGHT
  );

  // NFR-001 first-use guided entry point: the earliest anchor chronologically
  // is marked as the suggested starting point, so a new learner never faces
  // an undifferentiated canvas. This is a visual + textual marker only
  // (design.md §10: no meaning by color alone) — it does not open a drawer
  // (T5) or claim to be "visited" (T6), both out of this task's scope.
  const suggestedId = anchors[0].id;

  const canvas = document.createElement('div');
  canvas.className = 'timeline-canvas';
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;

  const axis = document.createElement('div');
  axis.className = 'axis';
  axis.setAttribute('aria-hidden', 'true');
  canvas.appendChild(axis);

  eraSlots.forEach((sortKey, i) => {
    const anchorAtSlot = anchors.find((a) => a.date?.sortKey === sortKey);
    const tick = document.createElement('span');
    tick.className = 'era';
    tick.style.left = `${CANVAS_LEFT_MARGIN + i * ERA_SLOT_WIDTH + ERA_SLOT_WIDTH / 2}px`;
    tick.textContent = anchorAtSlot?.date?.display ?? String(sortKey);
    canvas.appendChild(tick);
  });

  LANES.forEach((lane, i) => {
    const laneEl = document.createElement('div');
    laneEl.className = 'lane';
    laneEl.dataset.lane = lane.id;
    laneEl.style.top = `${LANE_TOP_OFFSET + i * LANE_BAND_HEIGHT}px`;
    laneEl.style.height = `${LANE_BAND_HEIGHT}px`;
    // Semantic heading, not a visual-only grouping (design.md §10 /
    // NFR-002: "Lane headings/groups must be semantic").
    const heading = document.createElement('h3');
    heading.className = 'lane-name';
    heading.textContent = lane.label;
    laneEl.appendChild(heading);
    canvas.appendChild(laneEl);
  });

  placed.forEach(({ anchor, x, y }) => {
    const isSuggested = anchor.id === suggestedId;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'anchor' + (isSuggested ? ' is-suggested' : '');
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    button.dataset.anchorId = anchor.id;
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', anchorAccessibleName(anchor, { suggested: isSuggested }));

    const year = document.createElement('span');
    year.className = 'anchor-year';
    year.textContent = anchor.date?.display ?? '';
    button.appendChild(year);

    const title = document.createElement('span');
    title.className = 'anchor-title';
    title.textContent = anchor.title;
    button.appendChild(title);

    const meta = document.createElement('span');
    meta.className = 'anchor-meta';
    meta.textContent = laneLabel(resolveLaneId(anchor));
    button.appendChild(meta);

    if (isSuggested) {
      const badge = document.createElement('span');
      badge.className = 'anchor-badge';
      badge.textContent = 'Start here';
      button.appendChild(badge);
    }

    // Minimal selection behavior for this task: toggling aria-pressed and a
    // visual highlight. Opening a context drawer is T5's owned surface, not
    // this one's — kept out so T3's scope stays bounded.
    button.addEventListener('click', () => {
      const wasPressed = button.getAttribute('aria-pressed') === 'true';
      root.querySelectorAll('.anchor[aria-pressed="true"]').forEach((el) => el.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', String(!wasPressed));
    });

    canvas.appendChild(button);
  });

  root.innerHTML = '';
  root.appendChild(canvas);
}

/**
 * Loads content via ContentLoader and renders the timeline canvas into
 * `root`. Surfaces a plain-language error state if loading or validation
 * fails, rather than leaving a silently empty page.
 *
 * @param {HTMLElement} root
 * @param {object} [opts] passed through to loadContent (basePath/reader) —
 *   lets tests substitute a non-browser reader the same way T1's tests do.
 */
export async function initTimelineCanvas(root, opts = {}) {
  try {
    const content = await loadContent(opts);
    const errors = validateContent(content);
    if (errors.length > 0) {
      // Content-quality bug, not a runtime state to design around
      // (design.md §9 edge cases) — but fail visibly rather than silently
      // rendering broken/incomplete data.
      root.innerHTML = `<p class="atlas-error">Content failed validation and cannot be shown safely: ${errors[0]}</p>`;
      return;
    }
    renderTimelineCanvas(root, content.anchors);
  } catch (err) {
    root.innerHTML = `<p class="atlas-error">The atlas could not load its content. ${err instanceof Error ? err.message : 'Unknown error.'}</p>`;
  }
}

// Auto-initialize when loaded directly by the browser as a page module.
// `document` only exists in a browser/DOM environment — this project's
// node:test suite (see test/content-schema.test.js) never defines it and
// imports renderTimelineCanvas/initTimelineCanvas directly against a
// container it controls, so this block is a no-op under `node --test`.
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('timeline-canvas-root');
    if (root) initTimelineCanvas(root);
  });
}
