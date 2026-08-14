// src/constellation-view.js — ConstellationView: an alternative visual lens
// on the same anchors/relationships data, added as a view-toggle option
// alongside T3's TimelineCanvas. Formalizes the non-binding spike at
// artifacts/planning/knowledge-constellation/prototype.html (built
// 2026-08-12 after studying https://mattwood.fyi/graph/) into a real,
// tested module per Henry's explicit request.
//
// Design principle carried over from the spike: the linear timeline is
// excellent at "what came before/after," but hides which anchors are
// actually *hubs* (e.g. Turing has many outgoing/incoming typed
// relationships that are easy to miss spread across a wide horizontal
// scroll). A force-directed layout makes hub structure visible at a
// glance — while staying fully accessible, unlike the mattwood.fyi
// reference (dense, unlabeled-on-load, no keyboard support).
//
// Integration decision (why this module is small): rather than duplicate
// T5's ContextDrawer, T6's VisitedTracker, or T4's Relationship Index, a
// constellation node button forwards its click to the matching, already-
// rendered TimelineCanvas anchor button (T3's `#timeline-canvas-root
// .anchor[data-anchor-id]`) — the exact same forwarding pattern T6's
// anchor-list and T9's trace-to-origin already use. This means switching
// to the Constellation view doesn't require touching context-drawer.js,
// visited-tracker.js, relationship-layer.js, or trace-to-origin.js at all:
// whichever view a learner clicks from, the same drawer opens, the same
// visited badge lights up, through code this module never reimplements.
//
// No framework, no build step, no new dependency (TD-001) — a plain
// vanilla-JS spring simulation (repulsion + spring edges + centering pull),
// not a physics/D3 library. Node count here (this project's full spine is
// tens of anchors, not thousands) keeps an O(n²)-per-iteration layout
// trivially fast without needing anything smarter.

import { loadContent, validateContent } from './content-loader.js';

const REL_COLOR_CLASS = {
  fact: 'edge-fact',
  interpretation: 'edge-interpretation',
  'conceptual-analogy': 'edge-conceptual-analogy',
};

/**
 * @param {string} anchorId
 * @param {Array<{from: string, to: string}>} relationships
 */
export function countConnections(anchorId, relationships) {
  return (relationships ?? []).filter((r) => r.from === anchorId || r.to === anchorId).length;
}

/**
 * Pure force-directed layout: repulsion between every node pair, a spring
 * pulling each edge's two endpoints toward a target length, and a mild pull
 * back toward center so the whole graph doesn't drift off-canvas. Plain
 * Euler integration over a fixed iteration count — deterministic given the
 * same inputs (no randomness), which is what makes this testable at all.
 *
 * @param {Array<{id: string}>} anchors
 * @param {Array<{id: string, from: string, to: string}>} relationships
 * @param {number} width
 * @param {number} height
 * @param {{ iterations?: number }} [opts]
 * @returns {{ nodes: Array<{id: string, x: number, y: number}>, edges: Array<object> }}
 */
export function computeLayout(anchors, relationships, width, height, { iterations = 300 } = {}) {
  const nodes = anchors.map((a, i) => ({
    id: a.id,
    x: width / 2 + Math.cos((i / anchors.length) * Math.PI * 2) * Math.min(width, height) * 0.32,
    y: height / 2 + Math.sin((i / anchors.length) * Math.PI * 2) * Math.min(width, height) * 0.32,
    vx: 0,
    vy: 0,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const edges = (relationships ?? [])
    .map((r) => ({ ...r, from: byId.get(r.from), to: byId.get(r.to) }))
    .filter((e) => e.from && e.to);

  for (let iter = 0; iter < iterations; iter++) {
    for (const a of nodes) {
      let fx = 0;
      let fy = 0;
      for (const b of nodes) {
        if (a === b) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = Math.max(dx * dx + dy * dy, 1);
        const force = 2600 / distSq;
        fx += (dx / Math.sqrt(distSq)) * force;
        fy += (dy / Math.sqrt(distSq)) * force;
      }
      fx += (width / 2 - a.x) * 0.006;
      fy += (height / 2 - a.y) * 0.006;
      a.vx = (a.vx + fx) * 0.72;
      a.vy = (a.vy + fy) * 0.72;
    }
    for (const e of edges) {
      const dx = e.to.x - e.from.x;
      const dy = e.to.y - e.from.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetLen = 170;
      const pull = (dist - targetLen) * 0.02;
      const nx = dx / dist;
      const ny = dy / dist;
      e.from.vx += nx * pull;
      e.from.vy += ny * pull;
      e.to.vx -= nx * pull;
      e.to.vy -= ny * pull;
    }
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(40, Math.min(width - 40, n.x));
      n.y = Math.max(30, Math.min(height - 30, n.y));
    }
  }
  return { nodes, edges };
}

function svgEl(doc, tag, attrs = {}) {
  const el = doc.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * Renders the constellation into the given DOM refs from already-loaded,
 * already-validated content. Pure rendering — does not fetch, does not open
 * any drawer itself; `onSelectAnchor` is the only side-effecting hook, and
 * the caller (initConstellationView below) wires that to forward a click
 * onto T3's matching TimelineCanvas button rather than this module owning
 * any drawer logic.
 *
 * @param {{ doc?: Document, svg: SVGSVGElement, overlay: HTMLElement, legend?: HTMLElement }} dom
 * @param {{anchors: any[]}} anchorsDoc
 * @param {{relationships: any[]}} relationshipsDoc
 * @param {{ width?: number, height?: number, onSelectAnchor?: (id: string) => void, iterations?: number }} [opts]
 */
export function renderConstellation(dom, anchorsDoc, relationshipsDoc, opts = {}) {
  const doc = dom.doc ?? document;
  const { svg, overlay, legend } = dom;
  const anchors = anchorsDoc?.anchors ?? [];
  const relationships = relationshipsDoc?.relationships ?? [];
  const width = opts.width || 900;
  const height = opts.height || 600;

  svg.innerHTML = '';
  overlay.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('role', 'presentation');
  svg.setAttribute('aria-hidden', 'true');

  if (anchors.length === 0) {
    return { nodeButtons: new Map() };
  }

  const { nodes, edges } = computeLayout(anchors, relationships, width, height, { iterations: opts.iterations });
  const anchorById = new Map(anchors.map((a) => [a.id, a]));

  const edgeEls = new Map();
  for (const e of edges) {
    const line = svgEl(doc, 'line', {
      class: `edge ${REL_COLOR_CLASS[e.claimType] ?? 'edge-interpretation'}`,
      'data-confidence': e.confidence,
      x1: e.from.x,
      y1: e.from.y,
      x2: e.to.x,
      y2: e.to.y,
    });
    svg.appendChild(line);
    edgeEls.set(e.id, { line, from: e.from.id, to: e.to.id });
  }

  // `selectedId` is the persistent, click-driven selection (D-001: only
  // edges ever dim, never nodes). `applyEdgeFocus` is shared by both the
  // persistent selection AND the transient hover/keyboard-focus preview
  // below, so hovering a node previews the same edge-highlight a click
  // would commit, and un-hovering falls back to whatever is actually
  // selected rather than clearing it.
  let selectedId = null;

  function applyEdgeFocus(focusId) {
    for (const { line, from, to } of edgeEls.values()) {
      const touches = !focusId || from === focusId || to === focusId;
      line.classList.toggle('is-dimmed', !touches);
    }
  }

  const nodeButtons = new Map();
  for (const n of nodes) {
    const anchor = anchorById.get(n.id);
    const degree = countConnections(n.id, relationships);

    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'node-btn';
    btn.dataset.anchorId = n.id;
    btn.style.left = `${(n.x / width) * 100}%`;
    btn.style.top = `${(n.y / height) * 100}%`;
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute(
      'aria-label',
      `${anchor.date?.display ?? 'undated'}, ${anchor.title}, ${anchor.lane} lane — ${degree} connection${degree === 1 ? '' : 's'}`
    );
    overlay.appendChild(btn);

    const circle = svgEl(doc, 'circle', {
      class: 'node-circle',
      cx: n.x,
      cy: n.y,
      r: Math.max(7, 5 + degree * 1.6),
    });
    svg.appendChild(circle);

    const label = svgEl(doc, 'text', { class: 'node-label', x: n.x, y: n.y - 12, 'text-anchor': 'middle' });
    label.textContent = anchor.title.length > 22 ? `${anchor.title.slice(0, 20)}…` : anchor.title;
    svg.appendChild(label);

    btn.addEventListener('click', () => {
      selectNode(n.id);
      if (typeof opts.onSelectAnchor === 'function') opts.onSelectAnchor(n.id);
    });
    // Hover and keyboard-focus share one preview behavior (deliberately —
    // a keyboard user tabbing through nodes gets the same "which edges
    // touch this one" feedback a mouse user gets by hovering, not a lesser
    // version of it) and both fall back to the real selection on exit.
    const preview = () => {
      circle.classList.add('is-hovered');
      applyEdgeFocus(n.id);
    };
    const unpreview = () => {
      circle.classList.remove('is-hovered');
      applyEdgeFocus(selectedId);
    };
    btn.addEventListener('mouseenter', preview);
    btn.addEventListener('mouseleave', unpreview);
    btn.addEventListener('focus', () => {
      circle.classList.add('is-focused');
      preview();
    });
    btn.addEventListener('blur', () => {
      circle.classList.remove('is-focused');
      unpreview();
    });
    nodeButtons.set(n.id, { btn, circle, label });
  }

  function selectNode(id) {
    selectedId = id;
    for (const [nid, { btn, circle }] of nodeButtons) {
      const active = nid === id;
      btn.setAttribute('aria-pressed', String(active));
      circle.classList.toggle('is-active', active);
    }
    applyEdgeFocus(id);
    // Nodes are deliberately never dimmed/hidden on selection, only edges —
    // "All anchors remain visible — nothing is ever hidden or unlocked"
    // (design.md/atlas.html's own stated principle) applies here too.
  }

  // Gentle idle motion ("move around a bit," per Henry's 2026-08-13 request):
  // a gentle, continuous sine/cosine sway around each node's already-settled
  // layout position — not a re-run of computeLayout's repulsion/spring
  // simulation, which is a chaotic-ish system not safe to leave running
  // indefinitely (small imbalances between repulsion and spring forces can
  // compound frame over frame into visible drift). This is a closed-form
  // function of the node's OWN fixed base position and elapsed time, so it
  // can never drift, destabilize, or accumulate — always bounded to a few
  // pixels around its settled spot. Skipped entirely under `prefers-
  // reduced-motion` (matches this file's own reduced-motion handling and
  // this project's site-wide reduced-motion rule in styles/atlas.css), and
  // guarded on `window`/`requestAnimationFrame` so it's simply inert (never
  // starts) under `node --test`'s no-window environment.
  const canAnimate =
    typeof window !== 'undefined' &&
    typeof window.requestAnimationFrame === 'function' &&
    !(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (canAnimate) {
    for (const n of nodes) {
      n.baseX = n.x;
      n.baseY = n.y;
      n.phase = Math.random() * Math.PI * 2;
      n.amp = 3 + Math.random() * 4;
    }
    const tick = (t) => {
      for (const n of nodes) {
        n.x = n.baseX + Math.sin(t * 0.00035 + n.phase) * n.amp;
        n.y = n.baseY + Math.cos(t * 0.00028 + n.phase * 1.3) * n.amp;
        const { btn, circle, label } = nodeButtons.get(n.id);
        btn.style.left = `${(n.x / width) * 100}%`;
        btn.style.top = `${(n.y / height) * 100}%`;
        circle.setAttribute('cx', n.x);
        circle.setAttribute('cy', n.y);
        label.setAttribute('x', n.x);
        label.setAttribute('y', n.y - 12);
      }
      for (const e of edges) {
        const entry = edgeEls.get(e.id);
        if (!entry) continue;
        entry.line.setAttribute('x1', e.from.x);
        entry.line.setAttribute('y1', e.from.y);
        entry.line.setAttribute('x2', e.to.x);
        entry.line.setAttribute('y2', e.to.y);
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  }

  if (legend) {
    legend.innerHTML = '';
    const rows = [
      ['edge-fact', 'documented fact'],
      ['edge-interpretation', 'interpretation'],
      ['edge-conceptual-analogy', 'conceptual analogy'],
    ];
    for (const [cls, text] of rows) {
      const row = doc.createElement('div');
      const swatch = doc.createElement('span');
      swatch.className = `legend-swatch ${cls}`;
      row.appendChild(swatch);
      row.appendChild(doc.createTextNode(text));
      legend.appendChild(row);
    }
    const note = doc.createElement('div');
    note.textContent = 'solid = documented · dashed = interpretive/indirect';
    legend.appendChild(note);
  }

  return { nodeButtons, edgeEls, selectNode };
}

/**
 * Full orchestrator: loads content, renders the constellation, and wires
 * each node button to forward a `.click()` onto the matching TimelineCanvas
 * anchor button in `canvasRoot` — so opening a drawer, marking an anchor
 * visited, and every other cross-cutting behavior stays exactly what T5/T6
 * already implement, regardless of which view triggered it. Sized to the
 * container's actual rendered dimensions at call time.
 *
 * @param {{
 *   svgRoot: SVGSVGElement,
 *   overlayRoot: HTMLElement,
 *   legendRoot?: HTMLElement,
 *   canvasRoot: HTMLElement,
 *   contentOpts?: object,
 * }} opts
 */
export async function initConstellationView({ svgRoot, overlayRoot, legendRoot, canvasRoot, contentOpts = {} }) {
  try {
    const content = await loadContent(contentOpts);
    const errors = validateContent(content);
    if (errors.length > 0) {
      overlayRoot.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'atlas-error';
      p.textContent = `Constellation content failed validation and cannot be shown safely: ${errors[0]}`;
      overlayRoot.appendChild(p);
      return;
    }

    const wrap = svgRoot.parentElement;
    const width = wrap?.clientWidth || 900;
    const height = wrap?.clientHeight || 600;

    renderConstellation(
      { svg: svgRoot, overlay: overlayRoot, legend: legendRoot },
      content.anchors,
      content.relationships,
      {
        width,
        height,
        onSelectAnchor: (anchorId) => {
          const target = canvasRoot.querySelector(`.anchor[data-anchor-id="${anchorId}"]`);
          if (target && typeof target.click === 'function') target.click();
        },
      }
    );
  } catch (err) {
    overlayRoot.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'atlas-error';
    p.textContent = `The constellation view could not load. ${err instanceof Error ? err.message : 'Unknown error.'}`;
    overlayRoot.appendChild(p);
  }
}

// Auto-initialize when loaded directly by the browser as a page module.
// Mirrors timeline-canvas.js's own guard: no-op under `node --test`. The
// constellation is only rendered once — lazily, on the view toggle's first
// activation — not here; here we just wire the toggle buttons themselves,
// which must exist regardless of which view starts active.
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const timelineButton = document.getElementById('view-toggle-timeline');
    const constellationButton = document.getElementById('view-toggle-constellation');
    const timelineViewport = document.querySelector('.timeline-viewport');
    const constellationViewport = document.getElementById('constellation-viewport');
    const svgRoot = document.getElementById('constellation-svg');
    const overlayRoot = document.getElementById('constellation-node-buttons');
    const legendRoot = document.getElementById('constellation-legend');
    const canvasRoot = document.getElementById('timeline-canvas-root');
    const constellationLegendWrap = document.getElementById('constellation-legend-wrap');
    const timelineLegend = document.querySelector('.legend:not(#constellation-legend-wrap)');
    if (!timelineButton || !constellationButton || !timelineViewport || !constellationViewport || !svgRoot || !overlayRoot || !canvasRoot) {
      return;
    }

    let constellationLoaded = false;

    function activate(view) {
      const showConstellation = view === 'constellation';
      timelineViewport.hidden = showConstellation;
      constellationViewport.hidden = !showConstellation;
      if (constellationLegendWrap) constellationLegendWrap.hidden = !showConstellation;
      if (timelineLegend) timelineLegend.hidden = showConstellation;
      timelineButton.setAttribute('aria-pressed', String(!showConstellation));
      constellationButton.setAttribute('aria-pressed', String(showConstellation));
      if (showConstellation && !constellationLoaded) {
        constellationLoaded = true;
        initConstellationView({ svgRoot, overlayRoot, legendRoot, canvasRoot });
      }
    }

    timelineButton.addEventListener('click', () => activate('timeline'));
    constellationButton.addEventListener('click', () => activate('constellation'));
  });
}
