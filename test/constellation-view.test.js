// Tests for src/constellation-view.js (Atlas view-toggle: Constellation view,
// added 2026-08-13 per Henry's explicit request: "bring knowledge graph in
// as a view option of Atlas").
//
// Section 1 tests the pure, DOM-free layout logic (computeLayout,
// countConnections) directly against real content/anchors.json and
// content/relationships.json. Section 2 uses the same minimal hand-written
// fake-DOM shim pattern as test/timeline-canvas.js and
// test/relationship-layer.test.js, extended with createElementNS (SVG)
// support, to exercise renderConstellation's actual DOM output.
//
// Honesty note, matching every sibling test file's caveat: this fake-DOM
// shim proves the *logic* — which elements/attributes/text get produced —
// but it is not a real browser. It does not prove actual Tab-key focus
// order, real force-layout visual quality, or screen-reader announcement.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const realAnchors = JSON.parse(readFileSync(path.join(__dirname, '../content/anchors.json'), 'utf8'));
const realRelationships = JSON.parse(readFileSync(path.join(__dirname, '../content/relationships.json'), 'utf8'));

// --- Section 1: pure layout logic -----------------------------------------
//
// `globalThis.document` is deliberately left unset for this whole file:
// unlike timeline-canvas.js, renderConstellation never touches the bare
// `document` global — it always takes an explicit `doc` param (defaulting
// to `document` only when omitted) — so the module's own auto-init guard
// (`typeof document !== 'undefined'`) stays false throughout, and every
// fake-DOM call below passes `doc: fakeDoc` explicitly instead.

const { computeLayout, countConnections, renderConstellation } = await import('../src/constellation-view.js');

test('countConnections — counts both from and to edges touching an anchor', () => {
  const rels = [
    { from: 'a', to: 'b' },
    { from: 'c', to: 'a' },
    { from: 'b', to: 'c' },
  ];
  assert.equal(countConnections('a', rels), 2);
  assert.equal(countConnections('b', rels), 2);
  assert.equal(countConnections('z', rels), 0, 'an anchor with no edges has 0 connections, not undefined/NaN');
});

test('computeLayout — real content/anchors.json + relationships.json', () => {
  const { nodes, edges } = computeLayout(realAnchors.anchors, realRelationships.relationships, 900, 600, { iterations: 60 });

  assert.equal(nodes.length, realAnchors.anchors.length, 'one laid-out node per anchor — none dropped');
  const ids = new Set(nodes.map((n) => n.id));
  assert.equal(ids.size, nodes.length, 'no duplicate node ids');

  for (const n of nodes) {
    assert.ok(n.x >= 40 && n.x <= 900 - 40, `node ${n.id} x=${n.x} must stay within the clamped canvas bounds`);
    assert.ok(n.y >= 30 && n.y <= 600 - 30, `node ${n.id} y=${n.y} must stay within the clamped canvas bounds`);
    assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y), `node ${n.id} position must be finite, not NaN`);
  }

  assert.equal(edges.length, realRelationships.relationships.length, 'every relationship becomes exactly one edge — none silently dropped');
  for (const e of edges) {
    assert.ok(e.from && typeof e.from.x === 'number', 'edge.from must resolve to a laid-out node, not the bare id string');
    assert.ok(e.to && typeof e.to.x === 'number', 'edge.to must resolve to a laid-out node, not the bare id string');
  }
});

test('computeLayout — deterministic given identical inputs (no randomness)', () => {
  const a = computeLayout(realAnchors.anchors, realRelationships.relationships, 900, 600, { iterations: 40 });
  const b = computeLayout(realAnchors.anchors, realRelationships.relationships, 900, 600, { iterations: 40 });
  for (let i = 0; i < a.nodes.length; i++) {
    assert.equal(a.nodes[i].x, b.nodes[i].x, `node ${a.nodes[i].id} x must be identical across runs`);
    assert.equal(a.nodes[i].y, b.nodes[i].y, `node ${a.nodes[i].id} y must be identical across runs`);
  }
});

test('computeLayout — an edge referencing an unknown anchor id is dropped, not crashed on', () => {
  const anchors = [{ id: 'a' }, { id: 'b' }];
  const rels = [{ id: 'r1', from: 'a', to: 'b' }, { id: 'r2', from: 'a', to: 'ghost' }];
  const { edges } = computeLayout(anchors, rels, 400, 300, { iterations: 5 });
  assert.equal(edges.length, 1, 'only the edge with two real endpoints survives');
});

// --- Section 2: fake-DOM rendering -----------------------------------------

class FakeClassList {
  constructor() { this.set = new Set(); }
  add(c) { this.set.add(c); }
  remove(c) { this.set.delete(c); }
  toggle(c, force) {
    const on = force === undefined ? !this.set.has(c) : force;
    if (on) this.set.add(c); else this.set.delete(c);
  }
  contains(c) { return this.set.has(c); }
  toString() { return [...this.set].join(' '); }
}

class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this._attrs = {};
    this.dataset = {};
    this.style = {};
    this._classList = new FakeClassList();
    this._listeners = {};
    this._text = '';
  }
  get classList() { return this._classList; }
  set className(v) {
    this._classList = new FakeClassList();
    v.split(' ').filter(Boolean).forEach((c) => this._classList.add(c));
  }
  get className() { return this._classList.toString(); }
  setAttribute(name, value) { this._attrs[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; }
  appendChild(child) { this.children.push(child); return child; }
  set textContent(v) { this._text = v; this.children = []; }
  get textContent() {
    if (this.children.length === 0) return this._text;
    return this.children.map((c) => c.textContent).join('');
  }
  set innerHTML(v) {
    this.children = [];
    this._text = typeof v === 'string' ? v.replace(/<[^>]*>/g, '') : '';
  }
  get parentElement() { return { clientWidth: 900, clientHeight: 600 }; }
  addEventListener(type, fn) { (this._listeners[type] ??= []).push(fn); }
  click() { (this._listeners.click || []).forEach((fn) => fn()); }
  querySelectorAll(selector) { return queryAll(this, selector); }
  querySelector(selector) { return queryAll(this, selector)[0] ?? null; }
}

function elementMatches(el, selector) {
  const attrMatch = selector.match(/\[([\w-]+)="([^"]*)"\]/);
  const withoutAttr = selector.replace(/\[[^\]]*\]/, '');
  const tagMatch = withoutAttr.match(/^([\w-]+)/);
  const classNames = (withoutAttr.match(/\.([\w-]+)/g) || []).map((s) => s.slice(1));
  if (tagMatch && el.tagName !== tagMatch[1]) return false;
  for (const cls of classNames) {
    if (!el._classList || !el._classList.contains(cls)) return false;
  }
  if (attrMatch) {
    const [, attrName, attrValue] = attrMatch;
    if (attrName === 'data-anchor-id') {
      if (el.dataset.anchorId !== attrValue) return false;
    } else if (el.getAttribute(attrName) !== attrValue) {
      return false;
    }
  }
  return true;
}

function queryAll(root, selector) {
  const results = [];
  (function walk(el) {
    for (const child of el.children) {
      if (elementMatches(child, selector)) results.push(child);
      walk(child);
    }
  })(root);
  return results;
}

const fakeDoc = {
  createElement(tag) { return new FakeElement(tag); },
  createElementNS(_ns, tag) { return new FakeElement(tag); },
  createTextNode(text) { const el = new FakeElement('#text'); el._text = text; el.textContent = text; return el; },
};

function makeDom() {
  return { doc: fakeDoc, svg: new FakeElement('svg'), overlay: new FakeElement('div'), legend: new FakeElement('div') };
}

test('renderConstellation — one node button + one SVG circle per anchor, real content', () => {
  const dom = makeDom();
  renderConstellation(dom, realAnchors, realRelationships, { width: 900, height: 600, iterations: 20 });
  const buttons = queryAll(dom.overlay, '.node-btn');
  assert.equal(buttons.length, realAnchors.anchors.length);
  buttons.forEach((b) => assert.equal(b.tagName, 'button'));
  const circles = queryAll(dom.svg, 'circle');
  assert.equal(circles.length, realAnchors.anchors.length);
});

test('renderConstellation — SVG is decorative (aria-hidden), accessible names live on real <button>s', () => {
  const dom = makeDom();
  renderConstellation(dom, realAnchors, realRelationships, { width: 900, height: 600, iterations: 20 });
  assert.equal(dom.svg.getAttribute('aria-hidden'), 'true');
  const first = queryAll(dom.overlay, '.node-btn')[0];
  const label = first.getAttribute('aria-label');
  assert.match(label, /^.+, .+, .+ lane — \d+ connections?$/, `aria-label "${label}" must be "{date}, {title}, {lane} lane — N connections"`);
});

test('renderConstellation — selecting a node dims only non-touching edges, never hides any node', () => {
  const dom = makeDom();
  const { selectNode } = renderConstellation(dom, realAnchors, realRelationships, { width: 900, height: 600, iterations: 20 });
  const targetId = realAnchors.anchors[0].id;
  selectNode(targetId);

  const circles = queryAll(dom.svg, 'circle');
  assert.equal(circles.length, realAnchors.anchors.length, 'selection must never remove/hide a node circle — D-001');

  const touchingRelIds = new Set(
    realRelationships.relationships.filter((r) => r.from === targetId || r.to === targetId).map((r) => r.id)
  );
  if (touchingRelIds.size > 0 && realRelationships.relationships.length > touchingRelIds.size) {
    const lines = queryAll(dom.svg, 'line');
    const dimmed = lines.filter((l) => l.classList.contains('is-dimmed'));
    assert.ok(dimmed.length > 0, 'at least one non-touching edge should be dimmed when a node with partial connectivity is selected');
  }
});

test('renderConstellation — clicking a node button calls onSelectAnchor with that anchor\'s id', () => {
  const dom = makeDom();
  const selected = [];
  renderConstellation(dom, realAnchors, realRelationships, {
    width: 900,
    height: 600,
    iterations: 10,
    onSelectAnchor: (id) => selected.push(id),
  });
  const targetId = realAnchors.anchors[2].id;
  const btn = queryAll(dom.overlay, `[data-anchor-id="${targetId}"]`)[0]
    ?? queryAll(dom.overlay, '.node-btn').find((b) => b.dataset.anchorId === targetId);
  assert.ok(btn, 'expected a node button for the target anchor');
  btn.click();
  assert.deepEqual(selected, [targetId]);
});

test('renderConstellation — empty anchor list renders nothing and does not throw', () => {
  const dom = makeDom();
  const result = renderConstellation(dom, { anchors: [] }, { relationships: [] }, { width: 900, height: 600 });
  assert.equal(result.nodeButtons.size, 0);
  assert.equal(queryAll(dom.overlay, '.node-btn').length, 0);
});

test('renderConstellation — legend lists all three claim-type rows with matching swatch classes', () => {
  const dom = makeDom();
  renderConstellation(dom, realAnchors, realRelationships, { width: 900, height: 600, iterations: 10 });
  const swatches = queryAll(dom.legend, '.legend-swatch');
  const classes = swatches.map((s) => s.className);
  assert.ok(classes.some((c) => c.includes('edge-fact')));
  assert.ok(classes.some((c) => c.includes('edge-interpretation')));
  assert.ok(classes.some((c) => c.includes('edge-conceptual-analogy')));
});
