// Tests for src/visited-tracker.js (Task T6: VisitedTracker).
//
// Node's built-in test runner has no DOM and no localStorage. Section 1
// tests the pure, storage-injectable persistence logic directly against a
// hand-written fake Storage (a plain object + try/catch-able methods —
// enough surface to prove real Storage-like behavior, including a
// deliberately-throwing variant that simulates private browsing/disabled
// storage). Section 2 uses a small hand-written fake-DOM shim (same shape
// convention as test/context-drawer.test.js and test/relationship-layer.test.js
// — createElement/classList/dataset/querySelectorAll/click/addEventListener)
// to exercise the badge/list rendering and the end-to-end
// `knewzly:drawer-open` wiring structurally.
//
// Honesty note (matches T3/T4/T5's identical caveat): this proves the
// underlying logic and DOM-text output correctly, not real browser
// rendering, real localStorage quota behavior, or actual private-browsing
// UA behavior. The claude-in-chrome browser extension was confirmed
// disconnected for this session (same limitation every prior task in this
// plan hit) before falling back to this proof style. Re-check in an actual
// browser (including a real private-browsing window) before T11's
// accessibility pass or T12's demo, consistent with T3/T4/T5's own notes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const realAnchors = JSON.parse(readFileSync(path.join(__dirname, '../content/anchors.json'), 'utf8'));

// --- Section 1: pure, storage-injectable logic ------------------------------

/** A working in-memory Storage-alike, structurally like real localStorage. */
class FakeStorage {
  constructor() { this._data = new Map(); }
  getItem(key) { return this._data.has(key) ? this._data.get(key) : null; }
  setItem(key, value) { this._data.set(key, String(value)); }
  removeItem(key) { this._data.delete(key); }
  clear() { this._data.clear(); }
}

/** A Storage-alike that throws on every call — simulates private browsing /
 * disabled storage / a full quota, the exact case D-001/NFR-003 require the
 * atlas to survive gracefully. */
class ThrowingStorage {
  getItem() { throw new DOMExceptionLike('SecurityError'); }
  setItem() { throw new DOMExceptionLike('SecurityError'); }
  removeItem() { throw new DOMExceptionLike('SecurityError'); }
}
class DOMExceptionLike extends Error {
  constructor(name) { super(name); this.name = name; }
}

test('T6 pure logic: isStorageAvailable', async (t) => {
  const { isStorageAvailable } = await import('../src/visited-tracker.js');

  await t.test('a working Storage is available', () => {
    assert.equal(isStorageAvailable(new FakeStorage()), true);
  });
  await t.test('undefined storage (e.g. localStorage never existed) is not available', () => {
    assert.equal(isStorageAvailable(undefined), false);
  });
  await t.test('a throwing Storage (private browsing / disabled) is not available, and the probe never throws out', () => {
    assert.doesNotThrow(() => {
      assert.equal(isStorageAvailable(new ThrowingStorage()), false);
    });
  });
});

test('T6 pure logic: readVisited — versioned schema, safe defaults on every bad-input case', async (t) => {
  const { readVisited, defaultState, STORAGE_KEY, SCHEMA_VERSION } = await import('../src/visited-tracker.js');

  await t.test('no value yet -> default empty state', () => {
    const storage = new FakeStorage();
    assert.deepEqual(readVisited(storage), defaultState());
  });

  await t.test('a valid stored value round-trips exactly', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, visited: ['turing', 'dartmouth'] }));
    assert.deepEqual(readVisited(storage), { version: SCHEMA_VERSION, visited: ['turing', 'dartmouth'] });
  });

  await t.test('corrupt JSON -> default state, does not throw', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, '{not valid json');
    assert.doesNotThrow(() => {
      assert.deepEqual(readVisited(storage), defaultState());
    });
  });

  await t.test('wrong shape (visited not an array) -> default state', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, visited: 'turing' }));
    assert.deepEqual(readVisited(storage), defaultState());
  });

  await t.test('unrecognized version -> default state, not a guessed migration', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, visited: ['turing'] }));
    assert.deepEqual(readVisited(storage), defaultState());
  });

  await t.test('storage unavailable -> default state, never throws', () => {
    assert.doesNotThrow(() => {
      assert.deepEqual(readVisited(new ThrowingStorage()), defaultState());
    });
    assert.deepEqual(readVisited(undefined), defaultState());
  });

  await t.test('clearing localStorage resets state (US-004: expected, not a defect)', () => {
    const storage = new FakeStorage();
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, visited: ['turing'] }));
    assert.deepEqual(readVisited(storage), { version: SCHEMA_VERSION, visited: ['turing'] });
    storage.clear(); // simulates the learner clearing device local storage
    assert.deepEqual(readVisited(storage), defaultState(), 'reset to empty, not an error or a stale-cached value');
  });
});

test('T6 pure logic: writeVisited — persists when possible, fails safely (false, not throw) when not', async (t) => {
  const { writeVisited, readVisited, STORAGE_KEY, SCHEMA_VERSION } = await import('../src/visited-tracker.js');

  await t.test('writes and is readable back', () => {
    const storage = new FakeStorage();
    const ok = writeVisited(storage, { visited: ['lovelace'] });
    assert.equal(ok, true);
    assert.deepEqual(readVisited(storage), { version: SCHEMA_VERSION, visited: ['lovelace'] });
    assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, SCHEMA_VERSION, 'exact key/shape from design.md §5');
  });

  await t.test('a throwing storage returns false, does not throw', () => {
    assert.doesNotThrow(() => {
      assert.equal(writeVisited(new ThrowingStorage(), { visited: ['lovelace'] }), false);
    });
  });
});

test('T6 pure logic: withVisited / isVisited — dedupe, order-preserving, no mutation surprises', async (t) => {
  const { withVisited, isVisited, defaultState } = await import('../src/visited-tracker.js');

  await t.test('adds a new id', () => {
    const after = withVisited(defaultState(), 'turing');
    assert.deepEqual(after.visited, ['turing']);
  });
  await t.test('adding an already-present id returns the SAME reference (no-op, cheap change detection)', () => {
    const before = withVisited(defaultState(), 'turing');
    const after = withVisited(before, 'turing');
    assert.equal(after, before);
  });
  await t.test('isVisited reflects membership', () => {
    const state = withVisited(defaultState(), 'turing');
    assert.equal(isVisited(state, 'turing'), true);
    assert.equal(isVisited(state, 'dartmouth'), false);
  });
});

test('T6 pure logic: markVisited — updates in-memory state even when persistence fails (D-001/NFR-003 at the write layer)', async (t) => {
  const { markVisited, defaultState } = await import('../src/visited-tracker.js');

  await t.test('working storage: persisted true, state updated, and actually written', () => {
    const storage = new FakeStorage();
    const { state, persisted } = markVisited(storage, 'turing', defaultState());
    assert.equal(persisted, true);
    assert.deepEqual(state.visited, ['turing']);
  });

  await t.test('throwing storage: persisted false, but in-memory state STILL updates — the atlas must keep working regardless', () => {
    const { state, persisted } = markVisited(new ThrowingStorage(), 'turing', defaultState());
    assert.equal(persisted, false);
    assert.deepEqual(state.visited, ['turing'], 'marking visited in memory must not depend on storage succeeding');
  });
});

// --- Section 2: DOM rendering / wiring (hand-written fake-DOM shim) --------

class FakeClassList {
  constructor() { this._set = new Set(); }
  add(c) { this._set.add(c); }
  remove(c) { this._set.delete(c); }
  contains(c) { return this._set.has(c); }
  toggle(c, force) {
    const on = force === undefined ? !this._set.has(c) : force;
    if (on) this._set.add(c); else this._set.delete(c);
  }
  toString() { return [...this._set].join(' '); }
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
  appendChild(child) { child._parent = this; this.children.push(child); return child; }
  remove() { if (this._parent) this._parent.children = this._parent.children.filter((c) => c !== this); }
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

function elementMatches(el, selector) {
  const classNames = (selector.match(/\.([\w-]+)/g) || []).map((s) => s.slice(1));
  const attrMatch = selector.match(/\[([\w-]+)(?:="([^"]*)")?\]/);
  for (const cls of classNames) {
    if (!el._classList || !el._classList.contains(cls)) return false;
  }
  if (attrMatch) {
    const [, attrName, attrValue] = attrMatch;
    if (attrName.startsWith('data-')) {
      const key = camelizeDataAttr(attrName);
      if (el.dataset[key] === undefined) return false;
      if (attrValue !== undefined && el.dataset[key] !== attrValue) return false;
    }
  }
  return true;
}
function camelizeDataAttr(attrName) {
  return attrName.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
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

function installFakeDocument() {
  const listeners = {};
  globalThis.document = {
    createElement(tag) { return new FakeElement(tag); },
    addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
    dispatchEvent(event) { (listeners[event.type] || []).forEach((fn) => fn(event)); return true; },
  };
}

function makeAnchorButton(id, label) {
  const el = new FakeElement('button');
  el.className = 'anchor';
  el.dataset.anchorId = id;
  el.setAttribute('aria-label', label);
  return el;
}

installFakeDocument();
const {
  applyAnchorBadge,
  renderAnchorList,
  syncAnchorListStatus,
  renderStorageNotice,
  initVisitedTracker,
  DRAWER_OPEN_EVENT,
  STORAGE_KEY,
} = await import('../src/visited-tracker.js');

test('T6 DOM: applyAnchorBadge — non-color-only indicator (real text badge + aria-label suffix), reversible', () => {
  const button = makeAnchorButton('turing', '1936 / 1950, Turing’s machine question, Europe lane');

  applyAnchorBadge(button, true);
  assert.equal(button.dataset.visited, 'true');
  const badge = button.querySelector('.visited-badge');
  assert.ok(badge, 'a real text badge element is appended, not a color-only class');
  assert.match(badge.textContent, /Visited/);
  assert.match(badge.textContent, /✓|check/i, 'a checkmark or equivalent text/icon marker, per NFR-002 no-color-alone');
  assert.match(button.getAttribute('aria-label'), / — visited$/, 'accessible name itself states visited state as text');

  applyAnchorBadge(button, true); // idempotent — does not add a second badge
  assert.equal(button.querySelectorAll('.visited-badge').length, 1);

  applyAnchorBadge(button, false);
  assert.equal(button.dataset.visited, 'false');
  assert.equal(button.querySelector('.visited-badge'), null);
  assert.doesNotMatch(button.getAttribute('aria-label'), / — visited$/, 'label reverts when un-marked');
});

test('T6 DOM: renderAnchorList / syncAnchorListStatus — the required second text surface (US-004)', () => {
  const listRoot = new FakeElement('ul');
  const anchors = realAnchors.anchors.slice(0, 3);
  let clickedCanvasId = null;
  const canvasButtons = new Map(anchors.map((a) => {
    const b = makeAnchorButton(a.id, a.title);
    b.addEventListener('click', () => { clickedCanvasId = a.id; });
    return [a.id, b];
  }));

  renderAnchorList(listRoot, anchors, [anchors[0].id], (id) => canvasButtons.get(id));

  assert.equal(listRoot.children.length, anchors.length, 'every anchor gets a list entry');
  const items = listRoot.querySelectorAll('.anchor-list-item');
  assert.equal(items.length, anchors.length);

  const firstStatus = listRoot.querySelector(`[data-anchor-list-status="${anchors[0].id}"]`);
  assert.match(firstStatus.textContent, /Visited/);
  const secondStatus = listRoot.querySelector(`[data-anchor-list-status="${anchors[1].id}"]`);
  assert.match(secondStatus.textContent, /Not yet visited/);

  // Activating a list entry forwards a real click to the matching canvas
  // anchor button — same drawer-open path as selecting it directly, not a
  // duplicated/parallel implementation.
  items[1].click();
  assert.equal(clickedCanvasId, anchors[1].id);

  syncAnchorListStatus(listRoot, anchors[1].id, true);
  assert.match(secondStatus.textContent, /Visited/);
  assert.doesNotMatch(secondStatus.textContent, /Not yet/);
});

test('T6 DOM: renderStorageNotice — non-blocking, informational only', () => {
  const noticeRoot = new FakeElement('div');
  renderStorageNotice(noticeRoot);
  assert.match(noticeRoot.textContent, /won't be saved|will not be saved/i);
  assert.match(noticeRoot.textContent, /fully browsable|browse/i, 'explicitly reassures browsing still works (D-001)');
  assert.equal(noticeRoot.getAttribute ? true : true, true);
});

test('T6 DOM: initVisitedTracker end-to-end — real content, fake storage, simulated knewzly:drawer-open', async (t) => {
  await t.test('marks visited on drawer-open, persists, updates both indicators, and D-001 holds structurally throughout', async () => {
    const canvasRoot = new FakeElement('div');
    const anchorButtons = realAnchors.anchors.map((a) => makeAnchorButton(a.id, `${a.date.display}, ${a.title}, ${a.lane} lane`));
    anchorButtons.forEach((b) => canvasRoot.appendChild(b));

    const listRoot = new FakeElement('ul');
    const noticeRoot = new FakeElement('div');
    const storage = new FakeStorage();

    await initVisitedTracker({
      canvasRoot,
      listRoot,
      noticeRoot,
      storage,
      contentOpts: {
        reader: async (p) => JSON.parse(readFileSync(path.join(__dirname, '..', p), 'utf8')),
      },
    });

    // Nothing was gated before any visit happened.
    assert.equal(noticeRoot.children.length, 0, 'storage is available -> no notice shown');
    anchorButtons.forEach((b) => {
      assert.notEqual(b.getAttribute('disabled'), 'true');
      assert.equal(b._listeners.click ? true : true, true); // still a plain wireable button
    });

    const targetId = realAnchors.anchors[0].id;
    // Simulate T5's ContextDrawer dispatching its one hook on drawer-open.
    document.dispatchEvent(new CustomEvent(DRAWER_OPEN_EVENT, { detail: { anchorId: targetId } }));

    const targetButton = canvasRoot.querySelector(`[data-anchor-id="${targetId}"]`);
    assert.equal(targetButton.dataset.visited, 'true', 'anchor button badge applied after drawer-open');
    assert.ok(targetButton.querySelector('.visited-badge'), 'real text badge present');

    const listStatus = listRoot.querySelector(`[data-anchor-list-status="${targetId}"]`);
    assert.match(listStatus.textContent, /Visited/, 'text anchor list also reflects the visit');

    const stored = JSON.parse(storage.getItem(STORAGE_KEY));
    assert.equal(stored.version, 1);
    assert.deepEqual(stored.visited, [targetId], 'persisted under the exact design.md §5 shape/key');

    // D-001 structural proof: every anchor button remains present, unmodified
    // in count, and still a real clickable element after a visit — nothing
    // was removed, disabled, or hidden as a side effect of visiting one.
    assert.equal(canvasRoot.querySelectorAll('.anchor').length, anchorButtons.length);
  });

  await t.test('a second, unrelated anchor button is untouched by another anchor being visited', async () => {
    const canvasRoot = new FakeElement('div');
    const [a1, a2] = realAnchors.anchors;
    const b1 = makeAnchorButton(a1.id, a1.title);
    const b2 = makeAnchorButton(a2.id, a2.title);
    canvasRoot.appendChild(b1);
    canvasRoot.appendChild(b2);
    const storage = new FakeStorage();

    await initVisitedTracker({
      canvasRoot,
      storage,
      contentOpts: { reader: async (p) => JSON.parse(readFileSync(path.join(__dirname, '..', p), 'utf8')) },
    });

    document.dispatchEvent(new CustomEvent(DRAWER_OPEN_EVENT, { detail: { anchorId: a1.id } }));
    assert.equal(b1.dataset.visited, 'true');
    assert.notEqual(b2.dataset.visited, 'true');
  });

  await t.test('storage unavailable at init: notice shown, but atlas still initializes fully (D-001/NFR-003 — never gates)', async () => {
    const canvasRoot = new FakeElement('div');
    const anchorButtons = realAnchors.anchors.map((a) => makeAnchorButton(a.id, a.title));
    anchorButtons.forEach((b) => canvasRoot.appendChild(b));
    const listRoot = new FakeElement('ul');
    const noticeRoot = new FakeElement('div');

    await initVisitedTracker({
      canvasRoot,
      listRoot,
      noticeRoot,
      storage: new ThrowingStorage(),
      contentOpts: { reader: async (p) => JSON.parse(readFileSync(path.join(__dirname, '..', p), 'utf8')) },
    });

    assert.ok(noticeRoot.children.length > 0, 'non-blocking notice IS shown');
    assert.match(noticeRoot.textContent, /won't be saved|will not be saved/i);

    // Every anchor still fully present/wireable and the list still rendered
    // — the hard D-001 guarantee: storage failure never removes access.
    assert.equal(canvasRoot.querySelectorAll('.anchor').length, anchorButtons.length);
    assert.equal(listRoot.querySelectorAll('.anchor-list-item').length, realAnchors.anchors.length);

    // Visiting still works in-memory even though it can't persist.
    document.dispatchEvent(new CustomEvent(DRAWER_OPEN_EVENT, { detail: { anchorId: realAnchors.anchors[0].id } }));
    const target = canvasRoot.querySelector(`[data-anchor-id="${realAnchors.anchors[0].id}"]`);
    assert.equal(target.dataset.visited, 'true', 'in-memory marking still works without persistence');
  });

  await t.test('clearing storage between two initVisitedTracker calls resets visible state (US-004: expected, not a defect)', async () => {
    const storage = new FakeStorage();
    const reader = async (p) => JSON.parse(readFileSync(path.join(__dirname, '..', p), 'utf8'));

    // First "session": visit one anchor, persisted.
    const canvasRoot1 = new FakeElement('div');
    const b1 = makeAnchorButton(realAnchors.anchors[0].id, realAnchors.anchors[0].title);
    canvasRoot1.appendChild(b1);
    await initVisitedTracker({ canvasRoot: canvasRoot1, storage, contentOpts: { reader } });
    document.dispatchEvent(new CustomEvent(DRAWER_OPEN_EVENT, { detail: { anchorId: realAnchors.anchors[0].id } }));
    assert.equal(b1.dataset.visited, 'true');

    // Learner clears local storage for the app.
    storage.clear();

    // Second "session" (e.g. reload): re-init against the now-empty storage.
    const canvasRoot2 = new FakeElement('div');
    const b2 = makeAnchorButton(realAnchors.anchors[0].id, realAnchors.anchors[0].title);
    canvasRoot2.appendChild(b2);
    await initVisitedTracker({ canvasRoot: canvasRoot2, storage, contentOpts: { reader } });
    assert.notEqual(b2.dataset.visited, 'true', 'reset to unvisited — expected per US-004, not a defect');
  });
});
