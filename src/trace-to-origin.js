// src/trace-to-origin.js — Trace-to-origin (Task T9)
//
// Thin integration glue between T8's Today story cards (src/story-grid.js,
// today.html) and T5's Atlas ContextDrawer (src/context-drawer.js,
// atlas.html), per design.md §8's User Flow and requirements.md
// FR-006/US-003. Reads both surfaces without modifying either — see
// tasks.md T9's Owned Surfaces/Coordination note.
//
// URL-scheme decision (not specified by design.md, chosen here and recorded
// in tasks.md/the commit message): today.html links to
// `atlas.html?anchor=<anchorId>` — a plain query parameter. atlas.html is a
// genuinely separate document (design.md §16 FAQ: "two pages, not one"), so
// "trace to origin" is real cross-document navigation, not an in-page
// scroll. A query param (over a `#hash`) was chosen because atlas.html has
// no in-page anchor-id fragment target today — the anchor buttons aren't
// addressable via `#id` — so a hash would still need JS to interpret it
// exactly the same way a query param does, with no navigation benefit
// (no browser-native "jump to element" to gain), while a query param reads
// slightly more explicitly as "a parameter this page consumes" in a URL a
// learner might inspect, save, or share.
//
// Visited-marking (T9's third acceptance criterion): this module does NOT
// reimplement or special-case visited-tracking. It opens the drawer the
// same way a direct anchor click does — by calling `.click()` on the exact
// same anchor `<button>` T3 rendered and T5 already wired — so whatever
// mechanism T5/T6 fire on drawer-open (as of this writing, T5's
// `openDrawer()` dispatches a `knewzly:drawer-open` CustomEvent that a
// listener — T6's VisitedTracker, once it lands — can subscribe to) fires
// identically for a trace-triggered open as for a direct one. See the
// dependency-gap note in this task's report: T6/visited-tracker.js had not
// landed yet at the time this module was written; this module does not
// block on it and does not build a competing visited-tracking path.

const READY_EVENT = 'knewzly:context-drawer-ready';
const ERROR_EVENT = 'knewzly:context-drawer-error';
const READY_FLAG = 'knewzlyContextDrawerReady';

// --- Pure helpers (unit-testable without a DOM) ------------------------

/**
 * Builds the cross-page trace URL for a given anchor id.
 * @param {string} anchorId
 * @param {{atlasPath?: string}} [opts]
 * @returns {string|null}
 */
export function traceAnchorUrl(anchorId, { atlasPath = 'atlas.html' } = {}) {
  if (!anchorId || typeof anchorId !== 'string') return null;
  return `${atlasPath}?anchor=${encodeURIComponent(anchorId)}`;
}

/**
 * Reads the `anchor` query parameter from a location.search-style string.
 * Pure — accepts a plain string so it's testable without `window.location`.
 * @param {string} search e.g. "?anchor=turing"
 * @returns {string|null}
 */
export function parseAnchorParam(search) {
  const params = new URLSearchParams(search || '');
  const value = params.get('anchor');
  return value && value.trim() ? value : null;
}

// --- Today-side: turn each story's trace text into a real link ---------

/**
 * Post-processes T8's already-rendered story grid: for every story with one
 * or more `traceToAnchors`, finds that story's rendered `.story-card-trace`
 * text (already produced by story-grid.js per FR-006's "stated in text"
 * requirement) and turns it into a real, keyboard-accessible cross-page
 * link to `atlas.html?anchor=<id>` — the actual navigable "trace to origin"
 * action this task delivers. Does not alter story-grid.js; only augments
 * the DOM it already produced, matched by the `data-story-id` it already
 * sets on each card.
 *
 * @param {HTMLElement} gridEl the rendered `#story-grid` container
 * @param {Array<object>} stories the same array passed to renderStoryGrid
 * @param {{atlasPath?: string}} [opts]
 * @returns {number} how many stories were wired (for tests/diagnostics)
 */
export function wireTraceToOrigin(gridEl, stories, opts = {}) {
  if (!gridEl || !Array.isArray(stories)) return 0;
  let wired = 0;

  for (const story of stories) {
    const anchorIds = Array.isArray(story.traceToAnchors) ? story.traceToAnchors : [];
    if (anchorIds.length === 0) continue;

    const card = gridEl.querySelector(`[data-story-id="${cssAttrEscape(story.id)}"]`);
    if (!card) continue;
    const traceEl = card.querySelector('.story-card-trace');
    if (!traceEl) continue;

    const targetAnchorId = anchorIds[0];
    const url = traceAnchorUrl(targetAnchorId, opts);
    if (!url) continue;

    const originalText = traceEl.textContent;
    const link = document.createElement('a');
    link.className = 'story-card-trace-link';
    link.href = url;
    link.textContent = originalText;
    link.setAttribute(
      'aria-label',
      `${originalText} — opens this anchor in the Global History Atlas`,
    );

    traceEl.textContent = '';
    traceEl.appendChild(link);
    wired += 1;
  }

  return wired;
}

/**
 * Minimal, dependency-free CSS-attribute-value escape (only needed because
 * story ids come from content and are interpolated into a `[data-story-id=]`
 * selector). Not a general CSS.escape polyfill — just enough to avoid a
 * broken selector on a quote character.
 * @param {string} value
 */
function cssAttrEscape(value) {
  return String(value).replace(/["\\]/g, '\\$&');
}

// --- Atlas-side: open the traced anchor's drawer on load ---------------

/**
 * Finds the anchor button T3 rendered for `anchorId` and clicks it — the
 * exact same DOM node and event T5's own direct-selection handler listens
 * for, so drawer-open and any downstream visited-marking behave identically
 * to a direct click. Returns whether a matching button was found.
 *
 * @param {Document} doc
 * @param {string} anchorId
 */
export function openAnchorViaClick(doc, anchorId) {
  const buttons = Array.from(doc.querySelectorAll('#timeline-canvas-root .anchor[data-anchor-id]'));
  const button = buttons.find((b) => b.dataset.anchorId === anchorId);
  if (!button) return false;
  button.click();
  return true;
}

/**
 * Inserts (or updates) a plain-text, `role="alert"` notice near the top of
 * the page when a traced anchor id from the URL can't be resolved — so a
 * broken/stale trace link fails visibly, not silently.
 * @param {Document} doc
 * @param {string} anchorId
 */
export function announceTraceFailure(doc, anchorId) {
  let el = doc.getElementById('trace-status');
  if (!el) {
    el = doc.createElement('p');
    el.id = 'trace-status';
    el.className = 'trace-status trace-status-error';
    el.setAttribute('role', 'alert');
    const main = doc.querySelector('main') || doc.body;
    main.insertBefore(el, main.firstChild);
  }
  el.textContent = `This trace link points to an anchor ("${anchorId}") that isn't in the current atlas. Nothing was opened automatically — browse the timeline below instead.`;
  return el;
}

/**
 * Wires the Atlas-page half of trace-to-origin: reads `?anchor=` from the
 * page URL and, once T5's ContextDrawer reports its anchor buttons are
 * wired (`knewzly:context-drawer-ready`, dispatched by
 * src/context-drawer.js), clicks the matching anchor button so its drawer
 * opens exactly as it would from a direct selection. No-ops entirely if
 * there's no `?anchor=` param, so this has zero effect on a learner who
 * opens atlas.html directly.
 *
 * @param {{doc?: Document, win?: Window, timeoutMs?: number}} [opts]
 */
export function initAtlasTrace({ doc = document, win = window, timeoutMs = 8000 } = {}) {
  const anchorId = parseAnchorParam(win.location.search);
  if (!anchorId) return;

  const tryOpen = () => {
    const found = openAnchorViaClick(doc, anchorId);
    if (!found) announceTraceFailure(doc, anchorId);
  };

  // Race guard: context-drawer.js may have already finished wiring (and
  // already dispatched its ready event) before this module's listener is
  // attached — it sets a synchronous flag for exactly this case.
  if (doc.documentElement.dataset[READY_FLAG] === '1') {
    tryOpen();
    return;
  }

  let settled = false;
  const onReady = () => {
    if (settled) return;
    settled = true;
    tryOpen();
  };
  const onError = () => {
    if (settled) return;
    settled = true;
    announceTraceFailure(doc, anchorId);
  };

  doc.addEventListener(READY_EVENT, onReady, { once: true });
  doc.addEventListener(ERROR_EVENT, onError, { once: true });

  // Content-drawer's own loadContent() has an unbounded-in-practice but
  // finite failure mode (a rejected fetch/validation just returns quietly,
  // see context-drawer.js's catch block and its early `errors.length > 0`
  // return — neither of which dispatches an event today). This timeout is
  // this module's own backstop so a broken atlas page still tells the
  // learner their trace didn't complete, rather than waiting forever.
  win.setTimeout(() => {
    if (settled) return;
    settled = true;
    announceTraceFailure(doc, anchorId);
  }, timeoutMs);
}

// Auto-initialize when loaded directly by the browser as a page module.
// Mirrors context-drawer.js's own guard: no-op under `node --test`. Checks
// both `document` and `window` — initAtlasTrace()'s default parameters read
// the global `window`, which (unlike `document`) node:test's fake-DOM tests
// never install, and real Node has neither by default.
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  initAtlasTrace();
}
