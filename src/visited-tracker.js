// src/visited-tracker.js — VisitedTracker (Task T6)
//
// Formalizes/versions the reviewed prototype's localStorage visited-state
// pattern (.ai/sdd/design/timeline-atlas-concept.html, key
// `knewzly-timeline-concept-visited-v2`) into the shipped, versioned schema
// from design.md §5 (key `knewzly-visited-v1`, shape
// `{ version: 1, visited: [...] }`), per requirements.md FR-007, FR-008,
// NFR-003, US-004.
//
// Scope boundary (per tasks.md T6's Owned Surfaces): this module owns
// itself. It does not modify src/timeline-canvas.js (T3), which already
// renders the anchor buttons this module decorates — it attaches its own
// badge/aria-label updates to T3's already-rendered buttons, the same
// external-decoration convention T4/T5 already established for extending
// T3's surface without editing it. It listens for the single
// `knewzly:drawer-open` CustomEvent T5's context-drawer.js now dispatches
// (the one minimal hook T5 was extended with for this task) rather than
// importing or modifying context-drawer.js's own logic.
//
// D-001 (hard, non-negotiable): visited state is a highlight/tracking layer
// only and must NEVER gate access to any anchor. This module never disables,
// hides, or conditions any anchor button, list entry, or drawer trigger on
// visited state — it only ever adds a non-color-only text/icon indicator on
// top of content that was already fully reachable before this module loaded.
// See the "structural D-001 proof" tests in test/visited-tracker.test.js.
//
// No framework, no build step (TD-001) — plain ESM.

import { loadContent, validateContent } from './content-loader.js';
import { waitForAnchors } from './relationship-layer.js';

export const STORAGE_KEY = 'knewzly-visited-v1';
export const SCHEMA_VERSION = 1;
export const DRAWER_OPEN_EVENT = 'knewzly:drawer-open';

/**
 * The canonical empty/default state shape (design.md §5).
 */
export function defaultState() {
  return { version: SCHEMA_VERSION, visited: [] };
}

/**
 * Probes whether `storage` (normally `localStorage`) is actually usable
 * right now — private browsing, disabled storage, or a full quota can all
 * make `localStorage` exist as an object but throw on every call. Never
 * throws itself.
 *
 * @param {Storage|undefined} storage
 */
export function isStorageAvailable(storage) {
  if (!storage) return false;
  const probeKey = '__knewzly_visited_probe__';
  try {
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Reads the persisted visited state. Any of "storage unavailable", "no
 * value yet", "corrupt JSON", "wrong shape", or "unrecognized version"
 * resolves to the same safe default rather than throwing — this is the
 * "atlas remains fully browsable" guarantee at the read layer.
 *
 * @param {Storage|undefined} storage
 */
export function readVisited(storage) {
  if (!isStorageAvailable(storage)) return defaultState();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.visited)) {
      return defaultState();
    }
    // v1's shape is fixed; a future shape change should add its own
    // version-specific migration here rather than guessing at an unknown
    // version's meaning (design.md §12 — versioned specifically for this).
    if (parsed.version !== SCHEMA_VERSION) return defaultState();
    return { version: SCHEMA_VERSION, visited: parsed.visited.filter((id) => typeof id === 'string') };
  } catch (err) {
    return defaultState();
  }
}

/**
 * Persists `state`. Returns whether the write actually succeeded — callers
 * must treat `false` as "keep going in memory, just don't claim it will
 * survive a reload," never as a reason to block anything.
 *
 * @param {Storage|undefined} storage
 * @param {{version: number, visited: string[]}} state
 */
export function writeVisited(storage, state) {
  if (!isStorageAvailable(storage)) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, visited: state.visited }));
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Pure: returns a new state with `anchorId` added (deduped, order-preserving).
 * Returns the same object reference when `anchorId` was already present, so
 * callers can cheaply detect "nothing changed."
 */
export function withVisited(state, anchorId) {
  if (!anchorId || state.visited.includes(anchorId)) return state;
  return { version: SCHEMA_VERSION, visited: [...state.visited, anchorId] };
}

export function isVisited(state, anchorId) {
  return state.visited.includes(anchorId);
}

/**
 * Marks `anchorId` visited: updates in-memory state and attempts to persist
 * it. Never throws regardless of storage state (private browsing, disabled,
 * quota-full, or simply absent) — this is FR-007/FR-008's actual
 * implementation, and NFR-003/D-001's "stay browsable regardless" guarantee
 * at the write layer.
 *
 * @param {Storage|undefined} storage
 * @param {string} anchorId
 * @param {{version: number, visited: string[]}} [currentState]
 * @returns {{state: object, persisted: boolean}}
 */
export function markVisited(storage, anchorId, currentState) {
  const before = currentState ?? readVisited(storage);
  const after = withVisited(before, anchorId);
  const changed = after !== before;
  const persisted = changed ? writeVisited(storage, after) : isStorageAvailable(storage);
  return { state: after, persisted };
}

// --- DOM: non-color-only visited indicators --------------------------------

/**
 * Adds/removes the checkmark+text badge on one of T3's anchor buttons, and
 * keeps its accessible name (aria-label) truthful about visited state too —
 * so the indicator survives both "CSS disabled" and "screen reader" checks,
 * not just a sighted visual scan (NFR-002: no meaning by color alone).
 * Purely additive to an already-focusable, already-clickable button — never
 * disables it (D-001).
 *
 * @param {HTMLElement|null|undefined} button
 * @param {boolean} visited
 */
export function applyAnchorBadge(button, visited) {
  if (!button) return;
  button.dataset.visited = String(visited);
  let badge = typeof button.querySelector === 'function' ? button.querySelector('.visited-badge') : null;
  if (visited) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'visited-badge';
      badge.textContent = '✓ Visited';
      button.appendChild(badge);
    }
  } else if (badge && typeof badge.remove === 'function') {
    badge.remove();
  }
  const label = (typeof button.getAttribute === 'function' ? button.getAttribute('aria-label') : '') || '';
  const stripped = label.replace(/ — visited$/, '');
  if (typeof button.setAttribute === 'function') {
    button.setAttribute('aria-label', visited ? `${stripped} — visited` : stripped);
  }
}

/**
 * Builds the always-available text anchor list (US-004's "also available in
 * the text anchor list" requirement — a true second surface, not a
 * decorative restatement of the timeline). Each entry is itself a real
 * `<button>` that forwards its click onto the matching TimelineCanvas anchor
 * button, so it opens the exact same drawer through the exact same existing
 * path (T3/T5) rather than duplicating that logic — the established
 * convention this codebase already uses for cross-module wiring (see T5's
 * drawer->index forwarding). Every anchor is listed and every entry stays a
 * real, enabled button regardless of visited state (D-001).
 *
 * @param {HTMLElement} root
 * @param {any[]} anchors
 * @param {string[]} visitedIds
 * @param {(anchorId: string) => HTMLElement|null} findCanvasButton
 */
export function renderAnchorList(root, anchors, visitedIds, findCanvasButton) {
  root.innerHTML = '';
  anchors.forEach((anchor) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'anchor-list-item';
    button.dataset.anchorListId = anchor.id;

    const title = document.createElement('span');
    title.className = 'anchor-list-title';
    const dateDisplay = anchor.date?.display ?? '';
    title.textContent = [dateDisplay, anchor.title].filter(Boolean).join(' — ');
    button.appendChild(title);

    const status = document.createElement('span');
    status.className = 'anchor-list-status';
    status.dataset.anchorListStatus = anchor.id;
    status.textContent = visitedIds.includes(anchor.id) ? '✓ Visited' : 'Not yet visited';
    button.appendChild(status);

    button.addEventListener('click', () => {
      const canvasButton = findCanvasButton(anchor.id);
      if (canvasButton && typeof canvasButton.click === 'function') canvasButton.click();
    });

    li.appendChild(button);
    root.appendChild(li);
  });
}

/**
 * Updates one entry's text status in an already-rendered anchor list,
 * without re-rendering the whole list (keeps click listeners intact).
 *
 * @param {HTMLElement} root
 * @param {string} anchorId
 * @param {boolean} visited
 */
export function syncAnchorListStatus(root, anchorId, visited) {
  const status = root.querySelector(`[data-anchor-list-status="${anchorId}"]`);
  if (status) status.textContent = visited ? '✓ Visited' : 'Not yet visited';
  const item = root.querySelector(`[data-anchor-list-id="${anchorId}"]`);
  if (item) item.dataset.visited = String(visited);
}

/**
 * Renders the non-blocking "progress won't persist" notice (design.md §9
 * edge case: localStorage disabled/unavailable). Purely informational — it
 * never disables or hides anything else on the page (D-001/NFR-003).
 *
 * @param {HTMLElement|null|undefined} root
 */
export function renderStorageNotice(root) {
  if (!root) return;
  root.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'visited-storage-notice';
  p.setAttribute('role', 'status');
  p.textContent =
    "Your browser isn't allowing local storage right now (for example, private browsing, or storage disabled), " +
    'so visited progress will not be saved after you leave this page. Every anchor stays fully browsable.';
  root.appendChild(p);
}

// --- Orchestration -----------------------------------------------------

/**
 * Full orchestrator: loads content, applies the persisted visited state to
 * T3's already-rendered anchor buttons, renders the text anchor list,
 * shows the non-blocking storage notice if `storage` is unavailable, and
 * marks an anchor visited every time T5 dispatches its `knewzly:drawer-open`
 * hook (which fires on both a direct anchor selection and a Today
 * trace-to-origin, per FR-007 — T5's drawer opens identically either way,
 * so this module doesn't need to distinguish the two paths).
 *
 * @param {{
 *   canvasRoot: HTMLElement,
 *   listRoot?: HTMLElement,
 *   noticeRoot?: HTMLElement,
 *   storage?: Storage,
 *   contentOpts?: object,
 * }} opts
 */
export async function initVisitedTracker({
  canvasRoot,
  listRoot,
  noticeRoot,
  storage = typeof localStorage !== 'undefined' ? localStorage : undefined,
  contentOpts = {},
} = {}) {
  let state = readVisited(storage);
  const storageOk = isStorageAvailable(storage);
  if (!storageOk) renderStorageNotice(noticeRoot);

  try {
    const content = await loadContent(contentOpts);
    const errors = validateContent(content);
    if (errors.length > 0) {
      // Nothing valid to show — T3/T4/T5 already surface their own
      // plain-text error states for invalid content; this module fails
      // quietly rather than duplicating that message (matches T5's
      // convention).
      return;
    }

    const anchors = content.anchors.anchors ?? [];
    const findCanvasButton = (anchorId) => canvasRoot.querySelector(`.anchor[data-anchor-id="${anchorId}"]`);

    if (listRoot) renderAnchorList(listRoot, anchors, state.visited, findCanvasButton);

    await waitForAnchors(canvasRoot);
    const anchorButtons = Array.from(canvasRoot.querySelectorAll('.anchor[data-anchor-id]'));
    anchorButtons.forEach((button) => {
      applyAnchorBadge(button, isVisited(state, button.dataset.anchorId));
    });

    document.addEventListener(DRAWER_OPEN_EVENT, (event) => {
      const anchorId = event?.detail?.anchorId;
      if (!anchorId) return;
      const result = markVisited(storage, anchorId, state);
      state = result.state;
      applyAnchorBadge(findCanvasButton(anchorId), true);
      if (listRoot) syncAnchorListStatus(listRoot, anchorId, true);
    });
  } catch (err) {
    // Mirrors T3/T4/T5's own fail-quiet convention: nothing valid to wire.
    // Content-loading failure is unrelated to storage — the notice above
    // (if shown) already covers the storage half of "stay browsable."
  }
}

// Auto-initialize when loaded directly by the browser as a page module.
// `document` only exists in a browser/DOM environment — this project's
// node:test suite never defines it globally the same way, so this block is
// a no-op under `node --test` (mirrors T3/T4/T5's identical guard).
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvasRoot = document.getElementById('timeline-canvas-root');
    if (!canvasRoot) return;
    const listRoot = document.getElementById('visited-anchor-list-root');
    const noticeRoot = document.getElementById('visited-storage-notice-root');
    initVisitedTracker({ canvasRoot, listRoot, noticeRoot });
  });
}
