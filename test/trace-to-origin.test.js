// Tests for src/trace-to-origin.js (Task T9: Trace-to-origin — Today -> Atlas).
//
// Node's built-in test runner has no DOM, and (per this session's confirmed
// limitation — the claude-in-chrome browser extension reported disconnected
// for every task, including this one) no real cross-document browser
// navigation was available to verify against. Section 1 tests the pure,
// DOM-free URL logic directly — this is real proof, not a simulation, since
// it's the actual code that decides the URL/param shape. Sections 2-4 use a
// small hand-written fake-DOM/fake-window shim (createElement, dataset,
// classList, addEventListener incl. `{ once: true }`, click, a custom
// document-level `_dispatch` test helper, and a controllable fake
// `window.setTimeout`) to exercise the Today-side link-wiring, the
// Atlas-side click-simulation, and the ready/error/timeout race logic
// structurally.
//
// Honesty note: this proves the module's own logic is correct (the right
// URL is built, the right element is clicked, the right fallback fires) but
// it does NOT prove an actual browser performs the cross-document
// navigation, preserves the query string, or that a real
// `atlas.html?anchor=X` load in Chrome ends up with the traced anchor's
// drawer visibly open on screen. That specific claim is flagged as an open
// item in this task's report — re-verify in a real browser before T11/T12.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- Section 1: pure logic, no DOM needed at all ---------------------------

test('T9 pure logic: traceAnchorUrl builds atlas.html?anchor=<id>', async (t) => {
  const { traceAnchorUrl } = await import('../src/trace-to-origin.js');

  await t.test('default atlasPath', () => {
    assert.equal(traceAnchorUrl('turing'), 'atlas.html?anchor=turing');
  });

  await t.test('custom atlasPath honored', () => {
    assert.equal(traceAnchorUrl('turing', { atlasPath: '/atlas.html' }), '/atlas.html?anchor=turing');
  });

  await t.test('anchor id is URL-encoded', () => {
    assert.equal(traceAnchorUrl('a b&c'), 'atlas.html?anchor=a%20b%26c');
  });

  await t.test('falsy/empty anchor id returns null, not a broken URL', () => {
    assert.equal(traceAnchorUrl(''), null);
    assert.equal(traceAnchorUrl(null), null);
    assert.equal(traceAnchorUrl(undefined), null);
  });
});

test('T9 pure logic: parseAnchorParam reads ?anchor= from a location.search-style string', async (t) => {
  const { parseAnchorParam } = await import('../src/trace-to-origin.js');

  await t.test('extracts a present value', () => {
    assert.equal(parseAnchorParam('?anchor=turing'), 'turing');
  });

  await t.test('works alongside other params, either order', () => {
    assert.equal(parseAnchorParam('?basePath=content/fixtures/&anchor=dartmouth'), 'dartmouth');
    assert.equal(parseAnchorParam('?anchor=dartmouth&basePath=content/fixtures/'), 'dartmouth');
  });

  await t.test('missing param returns null', () => {
    assert.equal(parseAnchorParam(''), null);
    assert.equal(parseAnchorParam('?basePath=content/fixtures/'), null);
    assert.equal(parseAnchorParam(undefined), null);
  });

  await t.test('present but empty value returns null (not an empty-string "success")', () => {
    assert.equal(parseAnchorParam('?anchor='), null);
  });
});

// --- Fake DOM shim -----------------------------------------------------
// Minimal — only the surface src/trace-to-origin.js actually calls.

class FakeClassList {
  constructor() { this.set = new Set(); }
  add(c) { this.set.add(c); }
  contains(c) { return this.set.has(c); }
}

function camelizeDataAttr(attr) {
  return attr.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this._attrs = {};
    this._classList = new FakeClassList();
    this._listeners = {};
    this._text = '';
  }
  get classList() { return this._classList; }
  set className(v) { v.split(' ').filter(Boolean).forEach((c) => this._classList.add(c)); }
  get id() { return this._attrs.id || ''; }
  set id(v) { this._attrs.id = v; }
  get href() { return this._attrs.href || ''; }
  set href(v) { this._attrs.href = v; }
  setAttribute(name, value) { this._attrs[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; }
  appendChild(child) { this.children.push(child); return child; }
  insertBefore(child, ref) {
    const idx = ref ? this.children.indexOf(ref) : 0;
    this.children.splice(idx < 0 ? 0 : idx, 0, child);
    return child;
  }
  set textContent(v) { this._text = v; this.children = []; }
  get textContent() {
    if (this.children.length === 0) return this._text;
    return this.children.map((c) => c.textContent).join('');
  }
  addEventListener(type, fn) { (this._listeners[type] ??= []).push(fn); }
  click() { (this._listeners.click || []).forEach((fn) => fn()); }
  querySelectorAll(selector) { return queryAll(this, selector); }
  querySelector(selector) { return queryAll(this, selector)[0] ?? null; }
}

function tokenMatches(el, token) {
  if (token.startsWith('#')) return el.id === token.slice(1);
  const classNames = (token.match(/\.([\w-]+)/g) || []).map((s) => s.slice(1));
  const attrMatches = [...token.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)];
  for (const cls of classNames) {
    if (!el._classList || !el._classList.contains(cls)) return false;
  }
  for (const [, attrName, attrValue] of attrMatches) {
    if (attrName.startsWith('data-')) {
      const key = camelizeDataAttr(attrName);
      if (el.dataset[key] === undefined) return false;
      if (attrValue !== undefined && el.dataset[key] !== attrValue) return false;
    }
  }
  return true;
}

function queryAll(root, selector) {
  const tokens = selector.trim().split(/\s+/);
  let candidates = [root];
  for (const token of tokens) {
    const next = [];
    for (const c of candidates) {
      (function walk(el) {
        for (const child of el.children) {
          if (tokenMatches(child, token)) next.push(child);
          walk(child);
        }
      })(c);
    }
    candidates = next;
  }
  return candidates;
}

function makeStoryCard({ id, category, traceText }) {
  const card = new FakeElement('article');
  card.className = 'story-card';
  card.dataset.storyId = id;
  card.dataset.category = category;
  if (traceText) {
    const trace = new FakeElement('p');
    trace.className = 'story-card-trace';
    trace.textContent = traceText;
    card.appendChild(trace);
  }
  return card;
}

function makeAnchorButton(id) {
  const el = new FakeElement('button');
  el.className = 'anchor';
  el.dataset.anchorId = id;
  return el;
}

function makeFakeDocument() {
  const listeners = {};
  const main = new FakeElement('main');
  const documentElement = new FakeElement('html');
  const doc = {
    documentElement,
    body: new FakeElement('body'),
    createElement(tag) { return new FakeElement(tag); },
    querySelector(sel) { return queryAll(this._root, sel)[0] ?? (sel === 'main' ? main : null); },
    querySelectorAll(sel) { return queryAll(this._root, sel); },
    addEventListener(type, fn, opts) {
      (listeners[type] ??= []).push({ fn, once: !!(opts && opts.once) });
    },
    getElementById(id) {
      return queryAll(this._root, `#${id}`)[0] ?? null;
    },
    _root: main,
    _dispatch(type, detail) {
      const entries = listeners[type] || [];
      listeners[type] = entries.filter((e) => e.once === false);
      entries.forEach((e) => e.fn({ detail }));
    },
  };
  main._root = main;
  return doc;
}

// wireTraceToOrigin (Today side) calls document.createElement directly, with
// no injectable-document parameter (unlike this codebase's other DOM
// modules) and no `typeof document !== 'undefined'` guard. Install a fake
// global document (createElement is all it actually needs) once, so calling
// the real, unmodified source function works the same way it would in a
// browser — this was the one wiring step left unfinished when this task got
// interrupted mid-implementation by a session limit.
globalThis.document = makeFakeDocument();

function makeFakeWindow(search) {
  const timers = [];
  return {
    location: { search },
    setTimeout(fn) { timers.push(fn); return timers.length; },
    clearTimeout() {},
    _timers: timers,
    _fireAllTimers() { timers.splice(0).forEach((fn) => fn()); },
  };
}

// --- Section 2: Today-side link wiring ----------------------------------

test('T9 DOM: wireTraceToOrigin turns each story\'s rendered trace text into a real atlas.html link', async (t) => {
  const { wireTraceToOrigin } = await import('../src/trace-to-origin.js');

  await t.test('a story with traceToAnchors gets a real, keyboard-focusable <a> preserving the original text', () => {
    const grid = new FakeElement('section');
    grid.appendChild(makeStoryCard({ id: 'energy', category: 'compute-energy', traceText: 'Traces to → Jevons, The Coal Question (1865)' }));
    const stories = [{ id: 'energy', traceToAnchors: ['jevons'], traceLabel: 'Jevons, The Coal Question (1865)' }];

    const wired = wireTraceToOrigin(grid, stories);

    assert.equal(wired, 1);
    const traceEl = grid.querySelector('.story-card-trace');
    assert.equal(traceEl.children.length, 1, 'the trace paragraph now wraps a single link element');
    const link = traceEl.children[0];
    assert.equal(link.tagName, 'a');
    assert.equal(link.getAttribute('href'), 'atlas.html?anchor=jevons');
    assert.equal(link.textContent, 'Traces to → Jevons, The Coal Question (1865)', 'FR-006: connection stays stated in text, not only implied by the link');
  });

  await t.test('a story with no traceToAnchors is left untouched', () => {
    const grid = new FakeElement('section');
    grid.appendChild(makeStoryCard({ id: 'notrace', category: 'x' }));
    const stories = [{ id: 'notrace', traceToAnchors: [] }];

    const wired = wireTraceToOrigin(grid, stories);
    assert.equal(wired, 0);
  });

  await t.test('a story id with no matching rendered card is skipped without throwing', () => {
    const grid = new FakeElement('section');
    const stories = [{ id: 'ghost-story', traceToAnchors: ['turing'] }];
    assert.doesNotThrow(() => {
      const wired = wireTraceToOrigin(grid, stories);
      assert.equal(wired, 0);
    });
  });

  await t.test('multiple stories: only the ones with a trace get wired, others left intact', () => {
    const grid = new FakeElement('section');
    grid.appendChild(makeStoryCard({ id: 'a', category: 'x', traceText: 'Traces to → Anchor A' }));
    grid.appendChild(makeStoryCard({ id: 'b', category: 'x' }));
    grid.appendChild(makeStoryCard({ id: 'c', category: 'x', traceText: 'Traces to → Anchor C' }));
    const stories = [
      { id: 'a', traceToAnchors: ['anchorA'] },
      { id: 'b', traceToAnchors: [] },
      { id: 'c', traceToAnchors: ['anchorC'] },
    ];
    const wired = wireTraceToOrigin(grid, stories);
    assert.equal(wired, 2);
  });

  await t.test('gracefully no-ops on missing grid or non-array stories', () => {
    assert.equal(wireTraceToOrigin(null, []), 0);
    assert.equal(wireTraceToOrigin(new FakeElement('section'), null), 0);
  });
});

// --- Section 3: Atlas-side click simulation + failure notice -----------

test('T9 DOM: openAnchorViaClick finds and clicks the exact T3 anchor button T5 already wired', async (t) => {
  const { openAnchorViaClick } = await import('../src/trace-to-origin.js');

  await t.test('a matching anchor button is clicked (same click path as direct selection)', () => {
    const canvasRoot = new FakeElement('div');
    canvasRoot.id = 'timeline-canvas-root';
    const turing = makeAnchorButton('turing');
    const dartmouth = makeAnchorButton('dartmouth');
    canvasRoot.appendChild(turing);
    canvasRoot.appendChild(dartmouth);

    let clickedAnchorId = null;
    turing.addEventListener('click', () => { clickedAnchorId = 'turing'; });
    dartmouth.addEventListener('click', () => { clickedAnchorId = 'dartmouth'; });

    const fakeDoc = { querySelectorAll: (sel) => queryAll(canvasRoot, sel.replace('#timeline-canvas-root ', '')) };
    const found = openAnchorViaClick(fakeDoc, 'turing');

    assert.equal(found, true);
    assert.equal(clickedAnchorId, 'turing', 'the exact matching anchor button was clicked, not the wrong one');
  });

  await t.test('an anchor id absent from the DOM returns false and clicks nothing', () => {
    const canvasRoot = new FakeElement('div');
    canvasRoot.appendChild(makeAnchorButton('turing'));
    const fakeDoc = { querySelectorAll: (sel) => queryAll(canvasRoot, sel.replace('#timeline-canvas-root ', '')) };
    const found = openAnchorViaClick(fakeDoc, 'does-not-exist');
    assert.equal(found, false);
  });
});

test('T9 DOM: announceTraceFailure inserts one visible role="alert" notice, updates in place on repeat calls', async (t) => {
  const { announceTraceFailure } = await import('../src/trace-to-origin.js');

  await t.test('creates the notice with the anchor id named in the message', () => {
    const doc = makeFakeDocument();
    const el = announceTraceFailure(doc, 'ghost-anchor');
    assert.equal(el.getAttribute('role'), 'alert');
    assert.match(el.textContent, /ghost-anchor/);
  });

  await t.test('a second call updates the same element rather than inserting a duplicate', () => {
    const doc = makeFakeDocument();
    announceTraceFailure(doc, 'first-anchor');
    announceTraceFailure(doc, 'second-anchor');
    const notices = doc.querySelectorAll('#trace-status');
    assert.equal(notices.length, 1, 'exactly one notice element exists, not one per call');
    assert.match(notices[0].textContent, /second-anchor/);
  });
});

// --- Section 4: initAtlasTrace — full ready/error/timeout race logic ----

test('T9 DOM: initAtlasTrace — no ?anchor= param is a total no-op', async (t) => {
  const { initAtlasTrace } = await import('../src/trace-to-origin.js');

  await t.test('no listeners registered, nothing clicked, no timer set', () => {
    const doc = makeFakeDocument();
    const win = makeFakeWindow('');
    initAtlasTrace({ doc, win });
    assert.equal(win._timers.length, 0);
    assert.equal(doc.querySelector('#trace-status'), null);
  });
});

test('T9 DOM: initAtlasTrace — ready flag already set synchronously opens immediately (no race)', async (t) => {
  const { initAtlasTrace } = await import('../src/trace-to-origin.js');

  await t.test('anchor button clicked without waiting for any event', () => {
    const doc = makeFakeDocument();
    doc.documentElement.dataset.knewzlyContextDrawerReady = '1';
    const canvasRoot = new FakeElement('div');
    canvasRoot.id = 'timeline-canvas-root';
    const turing = makeAnchorButton('turing');
    let clicked = false;
    turing.addEventListener('click', () => { clicked = true; });
    canvasRoot.appendChild(turing);
    doc._root.appendChild(canvasRoot);

    const win = makeFakeWindow('?anchor=turing');
    initAtlasTrace({ doc, win });

    assert.equal(clicked, true);
  });
});

test('T9 DOM: initAtlasTrace — waits for the ready event, then opens (matches T5\'s async content-load timing)', async (t) => {
  const { initAtlasTrace } = await import('../src/trace-to-origin.js');

  await t.test('click happens only after knewzly:context-drawer-ready fires', () => {
    const doc = makeFakeDocument();
    const canvasRoot = new FakeElement('div');
    canvasRoot.id = 'timeline-canvas-root';
    const turing = makeAnchorButton('turing');
    let clicked = false;
    turing.addEventListener('click', () => { clicked = true; });
    canvasRoot.appendChild(turing);
    doc._root.appendChild(canvasRoot);

    const win = makeFakeWindow('?anchor=turing');
    initAtlasTrace({ doc, win });

    assert.equal(clicked, false, 'must not click before the drawer reports readiness');
    doc._dispatch('knewzly:context-drawer-ready', { anchorIds: ['turing'] });
    assert.equal(clicked, true);
  });

  await t.test('an unresolvable anchor id (event fires, but no matching button) announces failure, not silence', () => {
    const doc = makeFakeDocument();
    const canvasRoot = new FakeElement('div');
    canvasRoot.id = 'timeline-canvas-root';
    canvasRoot.appendChild(makeAnchorButton('turing'));
    doc._root.appendChild(canvasRoot);

    const win = makeFakeWindow('?anchor=stale-broken-id');
    initAtlasTrace({ doc, win });
    doc._dispatch('knewzly:context-drawer-ready', { anchorIds: ['turing'] });

    const notice = doc.querySelector('#trace-status');
    assert.ok(notice, 'a visible notice explains the trace could not be resolved');
    assert.match(notice.textContent, /stale-broken-id/);
  });
});

test('T9 DOM: initAtlasTrace — a content-load error announces failure instead of hanging silently', async (t) => {
  const { initAtlasTrace } = await import('../src/trace-to-origin.js');

  await t.test('knewzly:context-drawer-error triggers the same visible notice', () => {
    const doc = makeFakeDocument();
    const win = makeFakeWindow('?anchor=turing');
    initAtlasTrace({ doc, win });

    doc._dispatch('knewzly:context-drawer-error', { error: new Error('content failed to load') });

    const notice = doc.querySelector('#trace-status');
    assert.ok(notice);
    assert.match(notice.textContent, /turing/);
  });

  await t.test('a ready event after an error has already settled the trace does nothing further', () => {
    const doc = makeFakeDocument();
    const canvasRoot = new FakeElement('div');
    canvasRoot.id = 'timeline-canvas-root';
    const turing = makeAnchorButton('turing');
    let clicked = false;
    turing.addEventListener('click', () => { clicked = true; });
    canvasRoot.appendChild(turing);
    doc._root.appendChild(canvasRoot);

    const win = makeFakeWindow('?anchor=turing');
    initAtlasTrace({ doc, win });

    doc._dispatch('knewzly:context-drawer-error', { error: new Error('boom') });
    doc._dispatch('knewzly:context-drawer-ready', { anchorIds: ['turing'] });

    assert.equal(clicked, false, 'once settled (by the error), a later ready event must not also fire a click');
  });
});

test('T9 DOM: initAtlasTrace — this module\'s own timeout backstop fires if neither ready nor error ever arrives', async (t) => {
  const { initAtlasTrace } = await import('../src/trace-to-origin.js');

  await t.test('the fake window\'s captured timeout callback announces failure when invoked', () => {
    const doc = makeFakeDocument();
    const win = makeFakeWindow('?anchor=turing');
    initAtlasTrace({ doc, win, timeoutMs: 5000 });

    assert.equal(win._timers.length, 1, 'a single backstop timer is scheduled');
    assert.equal(doc.querySelector('#trace-status'), null, 'no premature notice before the timer fires');

    win._fireAllTimers();

    const notice = doc.querySelector('#trace-status');
    assert.ok(notice, 'timeout backstop produced a visible notice rather than leaving the trace hanging forever');
  });

  await t.test('a ready event that arrives before the timeout prevents the timeout from also firing a duplicate action', () => {
    const doc = makeFakeDocument();
    const canvasRoot = new FakeElement('div');
    canvasRoot.id = 'timeline-canvas-root';
    const turing = makeAnchorButton('turing');
    let clickCount = 0;
    turing.addEventListener('click', () => { clickCount += 1; });
    canvasRoot.appendChild(turing);
    doc._root.appendChild(canvasRoot);

    const win = makeFakeWindow('?anchor=turing');
    initAtlasTrace({ doc, win });

    doc._dispatch('knewzly:context-drawer-ready', { anchorIds: ['turing'] });
    win._fireAllTimers(); // simulates the timer firing late, after settlement

    assert.equal(clickCount, 1, 'exactly one click — the timeout must not re-trigger anything once already settled');
  });
});
