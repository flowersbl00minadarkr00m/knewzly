// Tests for src/timeline-canvas.js (Task T3: TimelineCanvas).
//
// Written after the fact, closing a real gap flagged by the T1-T4 gauntlet
// review (.ai/sdd/specs/001-global-history-atlas/review/T1-T4-gauntlet-result.md):
// T3 shipped with no committed regression coverage of its own — every later
// task's tests only exercised timeline-canvas.js's *output* (rendering on
// top of it), never its layout/accessible-name/suggested-anchor logic in
// isolation. This file closes that gap.
//
// Node's built-in test runner has no DOM. Section 1 tests the pure,
// DOM-free layout logic directly. Section 2 uses the same minimal
// hand-written fake-DOM shim pattern as test/relationship-layer.test.js
// (createElement/classList/dataset/style/querySelectorAll — just enough
// surface for this module's actual DOM calls) to exercise rendering.
//
// Honesty note, matching every sibling test file's caveat: this fake-DOM
// shim proves the *logic* — which elements/attributes/text get produced —
// but it is not a real browser. It does not prove actual Tab-key focus
// order, real CSS rendering, or screen-reader announcement. The Chrome
// browser tool was confirmed disconnected this session; the manual
// keyboard-only pass remains open exactly as tasks.md's T3 status already
// states.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureAnchors = JSON.parse(readFileSync(path.join(__dirname, '../content/fixtures/anchors.json'), 'utf8'));
const realAnchors = JSON.parse(readFileSync(path.join(__dirname, '../content/anchors.json'), 'utf8'));

// --- Section 1: fake-DOM shim (renderTimelineCanvas needs `document` at
// import time is not required — it only needs it when called — but we
// install it up front, matching the sibling test files' convention). -------

class FakeClassList {
  constructor() { this.set = new Set(); }
  add(c) { this.set.add(c); }
  remove(c) { this.set.delete(c); }
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
  addEventListener(type, fn) { (this._listeners[type] ??= []).push(fn); }
  click() { (this._listeners.click || []).forEach((fn) => fn()); }
  querySelectorAll(selector) { return queryAll(this, selector); }
  querySelector(selector) { return queryAll(this, selector)[0] ?? null; }
}

function camelizeDataAttr(attr) {
  return attr.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function elementMatches(el, selector) {
  const classNames = (selector.match(/\.([\w-]+)/g) || []).map((s) => s.slice(1));
  const attrMatch = selector.match(/\[([\w-]+)="([^"]*)"\]/);
  for (const cls of classNames) {
    if (!el._classList || !el._classList.contains(cls)) return false;
  }
  if (attrMatch) {
    const [, attrName, attrValue] = attrMatch;
    // dataset assignments (e.g. button.dataset.anchorId = ...) never go
    // through setAttribute in this shim, matching test/relationship-layer
    // .test.js's real DOM behavior where dataset and attributes are the
    // same underlying thing but this fake keeps them separate stores — so
    // data-* selectors must check .dataset, not getAttribute.
    if (attrName.startsWith('data-')) {
      if (el.dataset[camelizeDataAttr(attrName)] !== attrValue) return false;
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

globalThis.document = {
  createElement(tag) { return new FakeElement(tag); },
  addEventListener() {}, // module's own auto-init guard registers this; never fired in tests
};

const { renderTimelineCanvas, initTimelineCanvas } = await import('../src/timeline-canvas.js');

// --- Section 2: rendering, layout, and accessible-name assertions ---------

test('T3: renderTimelineCanvas — real production content/anchors.json', async (t) => {
  await t.test('one focusable <button class="anchor"> per anchor, 5 lane elements including unoccupied Asia', () => {
    const root = new FakeElement('div');
    renderTimelineCanvas(root, realAnchors);
    const canvas = root.children[0];
    const anchorButtons = queryAll(canvas, '.anchor');
    assert.equal(anchorButtons.length, realAnchors.anchors.length, `expected one button per anchor (${realAnchors.anchors.length})`);
    anchorButtons.forEach((b) => assert.equal(b.tagName, 'button'));
    const lanes = queryAll(canvas, '.lane');
    assert.equal(lanes.length, 5, 'all 5 lanes must render, including lanes with zero anchors (e.g. Asia)');
    const laneIds = lanes.map((l) => l.dataset.lane);
    assert.ok(laneIds.includes('asia'), 'Asia lane must be persistent even when unoccupied');
  });

  await t.test('accessible name is exactly "{date}, {title}, {lane} lane" per US-001', () => {
    const root = new FakeElement('div');
    renderTimelineCanvas(root, realAnchors);
    const canvas = root.children[0];
    const lovelace = queryAll(canvas, '[data-anchor-id="lovelace"]')[0];
    assert.equal(lovelace.getAttribute('aria-label'), "1843, Lovelace's objection, Europe lane");
    const dartmouth = queryAll(canvas, '[data-anchor-id="dartmouth"]')[0];
    assert.equal(dartmouth.getAttribute('aria-label'), '1956, Dartmouth names artificial intelligence, North America lane');
  });

  await t.test('the earliest-dated anchor (by sortKey) is marked .is-suggested — NFR-001 guided entry point', () => {
    // 2026-08-13: the anchor spine expanded from 10 to 47 anchors (ancient
    // philosophy anchors added), so the chronologically earliest anchor
    // changed from lovelace (1843) to socrates (c. 470 BCE) — a real content
    // change, not a regression. This test verifies the *mechanism* (whichever
    // anchor has the lowest sortKey gets marked), not a specific hardcoded id.
    const root = new FakeElement('div');
    renderTimelineCanvas(root, realAnchors);
    const canvas = root.children[0];
    const suggested = queryAll(canvas, '.is-suggested');
    assert.equal(suggested.length, 1, 'exactly one anchor should be marked suggested');
    const expectedEarliestId = [...realAnchors.anchors].sort((a, b) => a.date.sortKey - b.date.sortKey)[0].id;
    assert.equal(suggested[0].dataset.anchorId, expectedEarliestId, 'the anchor with the lowest sortKey is the one marked suggested');
    assert.equal(suggested[0].getAttribute('aria-label').endsWith('— suggested starting point'), true);
  });

  await t.test('clicking an anchor sets aria-pressed and clears any previously pressed anchor', () => {
    const root = new FakeElement('div');
    renderTimelineCanvas(root, realAnchors);
    const canvas = root.children[0];
    const [first, second] = queryAll(canvas, '.anchor');
    assert.equal(first.getAttribute('aria-pressed'), 'false');
    first.click();
    assert.equal(first.getAttribute('aria-pressed'), 'true');
    second.click();
    assert.equal(first.getAttribute('aria-pressed'), 'false', 'selecting a new anchor must clear the previous selection');
    assert.equal(second.getAttribute('aria-pressed'), 'true');
  });
});

test('T3: renderTimelineCanvas — fixture data and edge cases', async (t) => {
  await t.test('fixture anchors (3 entries) render 3 buttons, no crash on a smaller set', () => {
    const root = new FakeElement('div');
    renderTimelineCanvas(root, fixtureAnchors);
    const canvas = root.children[0];
    assert.equal(queryAll(canvas, '.anchor').length, 3);
  });

  await t.test('an empty anchor list renders a plain-text empty state, not a crash or blank canvas', () => {
    const root = new FakeElement('div');
    renderTimelineCanvas(root, { anchors: [] });
    assert.match(root.textContent, /no anchor events/i);
  });

  await t.test('multiple anchors sharing the same lane+era slot are staggered, not overlapped', () => {
    const root = new FakeElement('div');
    const sameSlot = [
      { id: 'a', title: 'A', date: { display: '1900', sortKey: 1900 }, lane: 'europe' },
      { id: 'b', title: 'B', date: { display: '1900', sortKey: 1900 }, lane: 'europe' },
    ];
    renderTimelineCanvas(root, { anchors: sameSlot });
    const canvas = root.children[0];
    const [a, b] = queryAll(canvas, '.anchor');
    assert.equal(a.style.left, b.style.left, 'same era slot means same x position');
    assert.notEqual(a.style.top, b.style.top, 'colliding anchors must be staggered vertically, not stacked exactly on top of each other');
  });

  await t.test('an anchor with an unrecognized lane id falls back to the "europe" lane rather than throwing', () => {
    const root = new FakeElement('div');
    renderTimelineCanvas(root, { anchors: [{ id: 'x', title: 'X', date: { display: '1900', sortKey: 1900 }, lane: 'atlantis' }] });
    const canvas = root.children[0];
    const button = queryAll(canvas, '.anchor')[0];
    assert.match(button.getAttribute('aria-label'), /Europe lane/, 'unrecognized lane must fall back to Europe, not crash or mislabel');
  });
});

// --- Section 3: initTimelineCanvas (load + validate + render) -------------

test('T3: initTimelineCanvas — content-loading integration', async (t) => {
  await t.test('happy path: loads real content via an injected reader, renders without an error state', async () => {
    const root = new FakeElement('div');
    const reader = async (p) => {
      if (p.endsWith('anchors.json')) return realAnchors;
      if (p.endsWith('relationships.json')) return { relationships: [] };
      if (p.endsWith('today-stories.json')) return { lastUpdated: new Date().toISOString(), freshnessState: 'fresh', stories: [] };
      throw new Error(`unexpected path ${p}`);
    };
    await initTimelineCanvas(root, { reader });
    assert.doesNotMatch(root.textContent, /could not load|failed validation/i);
    assert.equal(queryAll(root.children[0], '.anchor').length, realAnchors.anchors.length);
  });

  await t.test('validation failure surfaces a plain-text error, not a silent blank canvas', async () => {
    const root = new FakeElement('div');
    const reader = async (p) => {
      if (p.endsWith('anchors.json')) return { anchors: [{ id: 'broken' }] }; // missing required fields
      if (p.endsWith('relationships.json')) return { relationships: [] };
      if (p.endsWith('today-stories.json')) return { lastUpdated: new Date().toISOString(), freshnessState: 'fresh', stories: [] };
      throw new Error('unexpected');
    };
    await initTimelineCanvas(root, { reader });
    assert.match(root.textContent, /failed validation/i);
  });

  await t.test('a reader that throws surfaces a plain-text load error, not an unhandled rejection', async () => {
    const root = new FakeElement('div');
    const reader = async () => { throw new Error('network down'); };
    await initTimelineCanvas(root, { reader });
    assert.match(root.textContent, /could not load/i);
    assert.match(root.textContent, /network down/);
  });
});
