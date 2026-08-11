// src/context-drawer.js — ContextDrawer (Task T5)
//
// Formalizes the reviewed prototype's `openEvent()`/`closeDrawer()` pattern
// (.ai/sdd/design/timeline-atlas-concept.html) per design.md §4
// (ContextDrawer) and §9/NFR-002's focus-return requirement, and
// requirements.md FR-002/US-002.
//
// Scope boundary (per tasks.md T5's Owned Surfaces): this module owns
// itself and its additions to atlas.html's markup. It does not modify
// src/timeline-canvas.js (T3) or src/relationship-layer.js (T4) — it
// attaches its own additional listeners to T3's already-rendered anchor
// buttons, and reuses T4's exported `buildRelationshipItems`/`waitForAnchors`
// plus T4's already-wired Relationship Index buttons (clicking one of the
// drawer's own relationship buttons dispatches a real `click()` on the
// matching Relationship Index button, so T4's `focusRelationship()` stays
// the single source of truth for arc/anchor focus state — this module never
// reimplements that logic). VisitedTracker (T6) is a later task's owned
// surface and is intentionally not touched here.
//
// No framework, no build step (TD-001) — plain ESM.

import { loadContent, validateContent } from './content-loader.js';
import { buildRelationshipItems, waitForAnchors } from './relationship-layer.js';

/**
 * Filters the full enriched relationship list down to the ones touching
 * `anchorId`, tagging each with the direction relative to that anchor.
 * Pure/DOM-free so it's directly unit-testable.
 *
 * @param {string} anchorId
 * @param {Array<object>} items from buildRelationshipItems
 * @returns {Array<object>}
 */
export function drawerRelationshipItems(anchorId, items) {
  return items
    .filter((item) => item.from === anchorId || item.to === anchorId)
    .map((item) => ({ ...item, direction: item.from === anchorId ? 'outgoing' : 'incoming' }));
}

/**
 * Builds the plain-text source line for an anchor per FR-011's provenance
 * baseline (source, access date, claim type, confidence all inspectable).
 *
 * @param {any} anchor
 */
export function formatSourceLine(anchor) {
  const source = anchor?.source ?? {};
  const parts = [];
  if (source.label) parts.push(source.label);
  if (source.url) parts.push(source.url);
  if (source.accessedDate) parts.push(`accessed ${source.accessedDate}`);
  const provenance = parts.join(' — ') || 'No source recorded.';
  const claim = anchor?.claimType ? `Claim type: ${anchor.claimType}.` : '';
  const confidence = anchor?.confidence ? `Confidence: ${anchor.confidence}.` : '';
  return [provenance, claim, confidence].filter(Boolean).join(' ');
}

/**
 * Renders one anchor's full detail (story, people, topics, source,
 * relationships) into the drawer's DOM refs. Pure rendering — does not open
 * or close anything, does not touch focus.
 *
 * @param {{titleEl, labelEl, metaEl, storyEl, peopleEl, topicsEl, sourceEl, relEl}} dom
 * @param {any} anchor
 * @param {Array<object>} relItems from drawerRelationshipItems
 */
export function renderDrawerContent(dom, anchor, relItems) {
  dom.labelEl.textContent = 'Anchor';
  dom.titleEl.textContent = anchor.title ?? '';
  const dateDisplay = anchor.date?.display ?? '';
  const lane = anchor.lane ?? '';
  dom.metaEl.textContent = [dateDisplay, lane].filter(Boolean).join(' · ');

  dom.storyEl.textContent = anchor.story ?? '';

  dom.peopleEl.innerHTML = '';
  const people = anchor.people ?? [];
  if (people.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No named people recorded for this anchor.';
    dom.peopleEl.appendChild(li);
  } else {
    people.forEach((person) => {
      const li = document.createElement('li');
      li.textContent = person;
      dom.peopleEl.appendChild(li);
    });
  }

  dom.topicsEl.innerHTML = '';
  const topics = anchor.topics ?? [];
  if (topics.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'No related topics recorded for this anchor.';
    dom.topicsEl.appendChild(li);
  } else {
    topics.forEach((topic) => {
      const li = document.createElement('li');
      li.textContent = topic;
      dom.topicsEl.appendChild(li);
    });
  }

  dom.sourceEl.textContent = formatSourceLine(anchor);

  dom.relEl.innerHTML = '';
  if (relItems.length === 0) {
    // design.md §9 edge case: "An anchor has zero relationships" — state
    // this plainly rather than rendering an empty list with no explanation.
    const empty = document.createElement('p');
    empty.className = 'drawer-relationships-empty';
    empty.textContent = 'This anchor has no catalogued relationships yet.';
    dom.relEl.appendChild(empty);
    return;
  }
  relItems.forEach((item) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'drawer-relationship-button';
    button.dataset.focusRel = item.id;
    button.setAttribute('aria-pressed', 'false');

    const heading = document.createElement('strong');
    heading.textContent = `${item.type} · ${item.confidence}`;
    button.appendChild(heading);

    const direction = document.createElement('span');
    direction.className = 'drawer-relationship-direction';
    direction.textContent = `${item.fromTitle} → ${item.toTitle}`;
    button.appendChild(direction);

    const confidence = document.createElement('span');
    confidence.className = 'drawer-relationship-confidence';
    confidence.textContent = item.confidenceText;
    button.appendChild(confidence);

    const label = document.createElement('span');
    label.className = 'drawer-relationship-label';
    label.textContent = item.label;
    button.appendChild(label);

    li.appendChild(button);
    dom.relEl.appendChild(li);
  });
}

/**
 * Reads the Relationship Index's current focus state (which button, if any,
 * has aria-pressed="true") and mirrors it onto the drawer's own relationship
 * buttons — this is the "wire T4's relationship selection to focus within
 * the drawer" half of the requirement: T4 stays the single source of truth,
 * this only reflects it.
 *
 * @param {HTMLElement} relEl the drawer's relationships <ul>
 * @param {HTMLElement} indexRoot T4's Relationship Index root
 */
export function syncDrawerHighlight(relEl, indexRoot) {
  const indexButtons = Array.from(indexRoot.querySelectorAll('.relationship-button'));
  const active = indexButtons.find((b) => b.getAttribute('aria-pressed') === 'true');
  const activeId = active ? active.dataset.focusRel : '';
  const drawerButtons = Array.from(relEl.querySelectorAll('.drawer-relationship-button'));
  drawerButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.focusRel === activeId && activeId !== ''));
  });
  return activeId;
}

/**
 * Wires each of the drawer's own relationship buttons so activating one
 * (pointer or keyboard — plain <button>s, same convergence guarantee T4
 * documents) dispatches a real click on the matching Relationship Index
 * button. T4's own already-wired handler (`wireFocusInteractions` /
 * `focusRelationship`) does the actual arc/anchor-dimming work — this
 * module never reimplements it, only triggers it. This is the "wire T4's
 * relationship focus" other half of the requirement: drawer -> index -> T4.
 *
 * @param {HTMLElement} relEl the drawer's relationships <ul>
 * @param {HTMLElement} indexRoot T4's Relationship Index root
 */
export function wireDrawerRelationshipButtons(relEl, indexRoot) {
  const drawerButtons = Array.from(relEl.querySelectorAll('.drawer-relationship-button'));
  drawerButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.focusRel;
      const indexButton = indexRoot.querySelector(`[data-focus-rel="${id}"]`);
      if (indexButton) indexButton.click();
      syncDrawerHighlight(relEl, indexRoot);
    });
  });
}

/**
 * Opens the drawer for `anchor`, triggered by `trigger` (the anchor button
 * that was activated). The atlas underneath is never hidden or unmounted —
 * only overlaid (CSS: fixed-position drawer + scrim, see styles/atlas.css)
 * — so "the atlas's visible state is never lost" (T5 acceptance criteria)
 * holds structurally, not just visually.
 *
 * @param {{dom: object, anchor: any, trigger: HTMLElement, relItems: Array<object>, indexRoot: HTMLElement, state: {open: boolean, returnFocus: HTMLElement|null, currentAnchorId: string|null}}} ctx
 */
export function openDrawer({ dom, anchor, trigger, relItems, indexRoot, state }) {
  state.returnFocus = trigger;
  state.open = true;
  state.currentAnchorId = anchor.id;

  renderDrawerContent(dom, anchor, relItems);

  dom.drawer.classList.add('is-open');
  dom.scrim.classList.add('is-open');
  dom.drawer.setAttribute('aria-hidden', 'false');
  dom.body.classList.add('drawer-open');

  wireDrawerRelationshipButtons(dom.relEl, indexRoot);
  syncDrawerHighlight(dom.relEl, indexRoot);

  // T6 hook (VisitedTracker): a plain DOM CustomEvent, not a direct import,
  // so this module keeps zero knowledge of T6's existence — T5's own
  // Owned Surfaces stay exactly what they were. Guarded so environments
  // without a real `dispatchEvent`/`CustomEvent` (e.g. this file's own
  // hand-written fake-DOM test shim) silently no-op instead of throwing;
  // any real browser has both.
  if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    document.dispatchEvent(new CustomEvent('knewzly:drawer-open', { detail: { anchorId: anchor.id } }));
  }

  // Focus moves into the drawer (close button — the reviewed prototype's
  // own convention) so a keyboard/screen-reader user lands somewhere
  // sensible inside the newly opened dialog, not left behind on a
  // now-covered trigger.
  dom.closeBtn.focus();
}

/**
 * Closes the drawer and returns focus EXACTLY to the anchor button that
 * opened it (T5's hard, testable acceptance criterion). `state.returnFocus`
 * is the only thing this depends on — set once, at open time, by
 * `openDrawer` above, and never mutated by anything else in between.
 *
 * @param {{dom: object, state: {open: boolean, returnFocus: HTMLElement|null, currentAnchorId: string|null}}} ctx
 */
export function closeDrawer({ dom, state }) {
  dom.drawer.classList.remove('is-open');
  dom.scrim.classList.remove('is-open');
  dom.drawer.setAttribute('aria-hidden', 'true');
  dom.body.classList.remove('drawer-open');
  state.open = false;
  state.currentAnchorId = null;

  const trigger = state.returnFocus;
  state.returnFocus = null;
  if (trigger && typeof trigger.focus === 'function') {
    trigger.focus();
  }
}

/**
 * Polls `indexRoot` until at least one `.relationship-button` exists (T4's
 * Relationship Index has rendered), mirroring T4's own `waitForAnchors`
 * pattern for T3. Rejects after `timeoutMs` rather than waiting forever if
 * T4 never renders (e.g. content failed validation upstream).
 *
 * @param {HTMLElement} indexRoot
 * @param {{timeoutMs?: number, pollMs?: number}} [opts]
 */
export function waitForRelationshipIndex(indexRoot, { timeoutMs = 8000, pollMs = 30 } = {}) {
  return new Promise((resolve, reject) => {
    const check = () => indexRoot.querySelectorAll('.relationship-button');
    const existing = check();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      const found = check();
      if (found.length > 0) {
        clearInterval(timer);
        resolve(found);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error('Timed out waiting for the Relationship Index to render'));
      }
    }, pollMs);
  });
}

/**
 * Full orchestrator: loads content, waits for T3's anchors and T4's
 * Relationship Index to exist, wires anchor selection to open the drawer,
 * wires close (button, scrim, Escape) with focus-return, and keeps the
 * drawer's relationship buttons and T4's Relationship Index in sync in both
 * directions.
 *
 * @param {{canvasRoot: HTMLElement, indexRoot: HTMLElement, dom: object, contentOpts?: object}} opts
 */
export async function initContextDrawer({ canvasRoot, indexRoot, dom, contentOpts = {} }) {
  const state = { open: false, returnFocus: null, currentAnchorId: null };

  try {
    const content = await loadContent(contentOpts);
    const errors = validateContent(content);
    if (errors.length > 0) {
      // T3/T4 already surface a plain-text error state for the timeline and
      // index when content fails validation; this module has nothing valid
      // to show inside the drawer, so it simply doesn't wire anything
      // rather than duplicating an error message.
      return;
    }

    await waitForAnchors(canvasRoot);
    await waitForRelationshipIndex(indexRoot);

    const anchorsById = new Map((content.anchors.anchors ?? []).map((a) => [a.id, a]));
    const relItemsAll = buildRelationshipItems(content.relationships, content.anchors);

    const anchorButtons = Array.from(canvasRoot.querySelectorAll('.anchor[data-anchor-id]'));
    anchorButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const anchor = anchorsById.get(button.dataset.anchorId);
        if (!anchor) return;
        const relItems = drawerRelationshipItems(anchor.id, relItemsAll);
        openDrawer({ dom, anchor, trigger: button, relItems, indexRoot, state });
      });
    });

    [dom.closeBtn, dom.scrim].forEach((el) => {
      el.addEventListener('click', () => closeDrawer({ dom, state }));
    });

    // T9 hook (minimal, additive): announce that anchor buttons are wired
    // and clickable, so src/trace-to-origin.js can safely simulate a click
    // on a specific anchor button once — and only once — this module's own
    // handler is actually attached, without T9 reimplementing any open/close
    // or visited-marking logic of its own. Nothing in this module's own
    // behavior changes; this is a signal, not a new code path.
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.knewzlyContextDrawerReady = '1';
      document.dispatchEvent(
        new CustomEvent('knewzly:context-drawer-ready', {
          detail: { anchorIds: Array.from(anchorsById.keys()) },
        }),
      );
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.open) {
        closeDrawer({ dom, state });
      }
    });

    // Whenever T4's Relationship Index focus changes (its own click
    // handler, wired by relationship-layer.js, always runs first since it
    // was attached first), mirror the resulting state into the drawer if
    // it's currently open. This covers the case where a learner focuses a
    // relationship from the always-visible index while the drawer is
    // already open for one of that relationship's endpoints.
    const indexButtons = Array.from(indexRoot.querySelectorAll('.relationship-button'));
    indexButtons.forEach((button) => {
      button.addEventListener('click', () => {
        if (state.open) syncDrawerHighlight(dom.relEl, indexRoot);
      });
    });
  } catch (err) {
    // Nothing valid to wire — T3/T4's own error states already cover the
    // visible failure; this module fails quietly rather than duplicating it.
  }
}

// Auto-initialize when loaded directly by the browser as a page module.
// Mirrors timeline-canvas.js's and relationship-layer.js's own guard:
// `document` only exists in a browser/DOM environment, so this is a no-op
// under `node --test`.
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvasRoot = document.getElementById('timeline-canvas-root');
    const indexRoot = document.getElementById('relationship-index-root');
    const drawer = document.getElementById('context-drawer');
    const scrim = document.getElementById('drawer-scrim');
    if (!canvasRoot || !indexRoot || !drawer || !scrim) return;

    const dom = {
      drawer,
      scrim,
      body: document.body,
      closeBtn: document.getElementById('drawer-close'),
      labelEl: document.getElementById('drawer-label'),
      titleEl: document.getElementById('drawer-title'),
      metaEl: document.getElementById('drawer-meta'),
      storyEl: document.getElementById('drawer-story'),
      peopleEl: document.getElementById('drawer-people'),
      topicsEl: document.getElementById('drawer-topics'),
      sourceEl: document.getElementById('drawer-source'),
      relEl: document.getElementById('drawer-relationships'),
    };

    initContextDrawer({ canvasRoot, indexRoot, dom });
  });
}
