// src/relationship-layer.js — RelationshipLayer (Task T4)
//
// Renders typed relationship arcs over TimelineCanvas (T3) plus a full
// text-equivalent Relationship Index, and implements focus interaction
// (pointer or keyboard) that dims unrelated arcs and mirrors the identical
// state in the text list. Formalizes the reviewed prototype's `data-rel` /
// `focusRelationship()` pattern (.ai/sdd/design/timeline-atlas-concept.html)
// per design.md §4 (RelationshipLayer / RelationshipIndex) and
// requirements.md FR-003, FR-004, US-002.
//
// Scope boundary (per tasks.md T4's Owned Surfaces): this module owns
// itself and its additions to atlas.html's markup. It does not modify
// src/timeline-canvas.js (T3, already done) or src/context-drawer.js (T5,
// not yet built) — it reads T3's rendered anchor DOM (positions, ids,
// dataset) rather than reimplementing TimelineCanvas's layout math, so it
// stays correct even if T3's layout constants change later.
//
// No framework, no build step (TD-001) — plain ESM.

import { loadContent, validateContent } from './content-loader.js';

// Confidence -> visual/textual grammar. This is the single source of truth
// for the solid=documented / dashed=interpretive-or-indirect convention
// carried forward from the reviewed prototype (design.md §4/§10, §5's
// relationships.json note). Every consumer (arc rendering AND the text
// index) reads from this table, so the visual and textual grammar can
// never drift apart.
const CONFIDENCE_INFO = {
  documented: { dashed: false, text: 'Documented — directly evidenced connection' },
  interpretation: { dashed: true, text: 'Interpretation — a reasoned connection, not a direct citation' },
  indirect: { dashed: true, text: 'Indirect / conceptual — a lens later observers apply, not a claim the earlier anchor made' },
};

/**
 * @param {string} confidence
 * @returns {{dashed: boolean, text: string}}
 */
export function confidenceInfo(confidence) {
  return CONFIDENCE_INFO[confidence] ?? { dashed: true, text: `${confidence} (uncatalogued confidence level)` };
}

function anchorTitle(anchorsById, id) {
  return anchorsById.get(id)?.title ?? id;
}

/**
 * Builds the enriched, render-ready list of relationship items from raw
 * content — pure and DOM-free so it's directly unit-testable.
 *
 * @param {{relationships: any[]}} relationshipsDoc
 * @param {{anchors: any[]}} anchorsDoc
 * @returns {Array<object>}
 */
export function buildRelationshipItems(relationshipsDoc, anchorsDoc) {
  const anchorsById = new Map((anchorsDoc?.anchors ?? []).map((a) => [a.id, a]));
  return (relationshipsDoc?.relationships ?? []).map((rel) => {
    const info = confidenceInfo(rel.confidence);
    return {
      id: rel.id,
      from: rel.from,
      to: rel.to,
      fromTitle: anchorTitle(anchorsById, rel.from),
      toTitle: anchorTitle(anchorsById, rel.to),
      type: rel.type,
      confidence: rel.confidence,
      claimType: rel.claimType,
      label: rel.label,
      dashed: info.dashed,
      confidenceText: info.text,
    };
  });
}

/**
 * Cubic-bezier arc path between two anchor centers, matching the reviewed
 * prototype's S-curve convention. Pure/testable independent of the DOM.
 *
 * @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2
 */
export function buildArcPath(x1, y1, x2, y2) {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
}

/**
 * Reads T3's rendered anchor buttons to get each anchor's position, in the
 * same coordinate space TimelineCanvas positioned them in (canvas-relative
 * left/top). Does not assume or duplicate TimelineCanvas's layout constants
 * — it just reads what was actually rendered.
 *
 * @param {HTMLElement} canvasRoot the `.timeline-canvas` element (or an
 *   ancestor containing it) that TimelineCanvas rendered into
 * @returns {Map<string, {x: number, y: number, width: number, height: number}>}
 */
export function readAnchorPositions(canvasRoot) {
  const positions = new Map();
  const anchorEls = canvasRoot.querySelectorAll('.anchor[data-anchor-id]');
  anchorEls.forEach((el) => {
    const left = parseFloat(el.style.left) || 0;
    const top = parseFloat(el.style.top) || 0;
    // Anchor cards are absolutely positioned with translate(-50%, 0) and a
    // known nominal card height (see styles/atlas.css .anchor); arcs should
    // meet at the card's visual center, not its top-left origin.
    const width = el.offsetWidth || 176;
    const height = el.offsetHeight || 76;
    positions.set(el.dataset.anchorId, { x: left, y: top + height / 2, width, height });
  });
  return positions;
}

/**
 * Renders the SVG relationship-arc overlay into `svgEl` (an existing <svg>
 * element sized to match the timeline canvas). Arcs are decorative/visual
 * only (aria-hidden) — the text Relationship Index below is the
 * accessible, always-present equivalent (FR-003).
 *
 * @param {SVGSVGElement} svgEl
 * @param {Array<object>} items from buildRelationshipItems
 * @param {Map<string, {x:number,y:number}>} positions from readAnchorPositions
 */
export function renderRelationshipArcs(svgEl, items, positions) {
  svgEl.setAttribute('aria-hidden', 'true');
  svgEl.innerHTML = '';
  for (const item of items) {
    const from = positions.get(item.from);
    const to = positions.get(item.to);
    if (!from || !to) continue; // anchor not rendered (e.g. narrower fixture set) — skip, don't error
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'arc' + (item.dashed ? ' indirect' : ''));
    path.dataset.rel = item.id;
    path.setAttribute('d', buildArcPath(from.x, from.y, to.x, to.y));
    svgEl.appendChild(path);
  }
}

/**
 * Renders the always-available text Relationship Index — a TRUE text
 * equivalent per FR-003/US-002: every relationship's type, direction, and
 * confidence/evidence status is plain text inside the button, not implied
 * by a CSS class or the arc's line style. Disabling CSS entirely must not
 * remove any of this information (T4 acceptance criteria).
 *
 * @param {HTMLElement} root a <ul> (or container) to render into
 * @param {Array<object>} items from buildRelationshipItems
 */
export function renderRelationshipIndex(root, items) {
  root.innerHTML = '';
  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'relationship-index-empty';
    empty.textContent = 'No relationships are catalogued in this pilot set yet.';
    root.appendChild(empty);
    return;
  }
  for (const item of items) {
    const li = document.createElement('li');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'relationship-button';
    button.dataset.focusRel = item.id;
    button.setAttribute('aria-pressed', 'false');

    // Type + confidence as a heading line — always rendered as real text
    // nodes, never a background-image/icon standing in for the words.
    const heading = document.createElement('strong');
    heading.textContent = `${item.type} · ${item.confidence}`;
    button.appendChild(heading);

    // Explicit direction, in text, independent of arc geometry.
    const direction = document.createElement('span');
    direction.className = 'relationship-direction';
    direction.textContent = `${item.fromTitle} → ${item.toTitle}`;
    button.appendChild(direction);

    // The full confidence sentence (documented vs. interpretation vs.
    // indirect), spelled out — this is what survives with CSS disabled and
    // no visual solid/dashed distinction to lean on.
    const confidence = document.createElement('span');
    confidence.className = 'relationship-confidence';
    confidence.textContent = item.confidenceText;
    button.appendChild(confidence);

    // The human-authored relationship label/explanation.
    const label = document.createElement('span');
    label.className = 'relationship-label';
    label.textContent = item.label;
    button.appendChild(label);

    li.appendChild(button);
    root.appendChild(li);
  }
}

/**
 * Applies (or clears) focus state for relationship `id` across the text
 * index buttons, the SVG arcs, and the anchor buttons — the single
 * function both pointer (click) and keyboard (native button
 * activation via Enter/Space, or Tab+Enter) interaction paths call, so
 * they always produce an identical resulting state (T4 acceptance
 * criteria: "keyboard-only focus produces the same visible state as
 * pointer interaction").
 *
 * Toggle semantics match the reviewed prototype: activating the
 * already-active relationship clears focus; activating a different one
 * switches to it.
 *
 * @param {string} id relationship id, or '' to clear all focus
 * @param {{relButtons: HTMLElement[], arcs: SVGPathElement[], anchorEls: HTMLElement[], itemsById: Map<string, object>}} refs
 */
export function focusRelationship(id, { relButtons, arcs, anchorEls, itemsById }) {
  const nowActive = id && relButtons.some((b) => b.dataset.focusRel === id && b.getAttribute('aria-pressed') !== 'true');
  const activeId = nowActive ? id : '';

  relButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.focusRel === activeId && activeId !== ''));
  });

  arcs.forEach((arc) => {
    const isActive = activeId !== '' && arc.dataset.rel === activeId;
    arc.classList.toggle('is-active', isActive);
    arc.classList.toggle('is-dimmed', activeId !== '' && !isActive);
  });

  const relatedAnchorIds = new Set();
  if (activeId !== '') {
    const item = itemsById.get(activeId);
    if (item) {
      relatedAnchorIds.add(item.from);
      relatedAnchorIds.add(item.to);
    }
  }
  anchorEls.forEach((anchor) => {
    const related = relatedAnchorIds.has(anchor.dataset.anchorId);
    anchor.classList.toggle('is-dimmed', activeId !== '' && !related);
  });

  return activeId;
}

/**
 * Wires click handlers on every relationship-index button to
 * focusRelationship. Plain <button> elements are natively both
 * pointer-activatable (click) and keyboard-activatable (Enter/Space fire
 * the same 'click' event) — no separate keydown handling is needed to
 * satisfy "pointer OR keyboard" (FR-004), and this is exactly why both
 * input paths are guaranteed to converge on the identical resulting state:
 * they invoke the same handler.
 *
 * @param {HTMLElement} indexRoot
 * @param {SVGSVGElement} svgEl
 * @param {HTMLElement} canvasRoot
 * @param {Array<object>} items
 */
export function wireFocusInteractions(indexRoot, svgEl, canvasRoot, items) {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const relButtons = Array.from(indexRoot.querySelectorAll('.relationship-button'));
  const arcs = Array.from(svgEl.querySelectorAll('.arc'));
  const anchorEls = Array.from(canvasRoot.querySelectorAll('.anchor[data-anchor-id]'));

  relButtons.forEach((button) => {
    button.addEventListener('click', () => {
      focusRelationship(button.dataset.focusRel, { relButtons, arcs, anchorEls, itemsById });
    });
  });

  return { relButtons, arcs, anchorEls, itemsById };
}

/**
 * Waits for TimelineCanvas (T3) to have rendered its anchor buttons into
 * `canvasRoot`, without importing or duplicating T3's internals. Resolves
 * as soon as at least one `.anchor[data-anchor-id]` exists, or rejects
 * after `timeoutMs` so a broken/slow upstream render surfaces as a visible
 * error instead of an infinite silent wait.
 *
 * @param {HTMLElement} canvasRoot
 * @param {{timeoutMs?: number, pollMs?: number}} [opts]
 */
export function waitForAnchors(canvasRoot, { timeoutMs = 8000, pollMs = 30 } = {}) {
  return new Promise((resolve, reject) => {
    const check = () => canvasRoot.querySelectorAll('.anchor[data-anchor-id]');
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
        reject(new Error('Timed out waiting for the timeline anchors to render'));
      }
    }, pollMs);
  });
}

/**
 * Full orchestrator: loads content, waits for TimelineCanvas's anchors,
 * builds the SVG arc overlay sized to the rendered canvas, renders the
 * text Relationship Index, and wires focus interactions. Surfaces a plain
 * error state on failure rather than leaving a silently empty section.
 *
 * @param {{canvasRoot: HTMLElement, indexRoot: HTMLElement, contentOpts?: object}} opts
 */
export async function initRelationshipLayer({ canvasRoot, indexRoot, contentOpts = {} }) {
  try {
    const content = await loadContent(contentOpts);
    const errors = validateContent(content);
    if (errors.length > 0) {
      indexRoot.innerHTML = `<p class="atlas-error">Relationship content failed validation and cannot be shown safely: ${errors[0]}</p>`;
      return;
    }

    await waitForAnchors(canvasRoot);

    const items = buildRelationshipItems(content.relationships, content.anchors);
    const positions = readAnchorPositions(canvasRoot);

    const canvasEl = canvasRoot.querySelector('.timeline-canvas') ?? canvasRoot;
    let svgEl = canvasEl.querySelector('.relationship-layer');
    if (!svgEl) {
      svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgEl.setAttribute('class', 'relationship-layer');
      canvasEl.insertBefore(svgEl, canvasEl.firstChild);
    }
    const width = parseFloat(canvasEl.style.width) || canvasEl.offsetWidth || 0;
    const height = parseFloat(canvasEl.style.height) || canvasEl.offsetHeight || 0;
    svgEl.setAttribute('width', String(width));
    svgEl.setAttribute('height', String(height));
    svgEl.setAttribute('viewBox', `0 0 ${width} ${height}`);

    renderRelationshipArcs(svgEl, items, positions);
    renderRelationshipIndex(indexRoot, items);
    wireFocusInteractions(indexRoot, svgEl, canvasRoot, items);
  } catch (err) {
    indexRoot.innerHTML = `<p class="atlas-error">Relationships could not load. ${err instanceof Error ? err.message : 'Unknown error.'}</p>`;
  }
}

// Auto-initialize when loaded directly by the browser as a page module.
// Mirrors timeline-canvas.js's own guard: `document` only exists in a
// browser/DOM environment, so this is a no-op under `node --test`.
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvasRoot = document.getElementById('timeline-canvas-root');
    const indexRoot = document.getElementById('relationship-index-root');
    if (canvasRoot && indexRoot) initRelationshipLayer({ canvasRoot, indexRoot });
  });
}
