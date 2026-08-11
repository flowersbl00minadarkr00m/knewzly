// Tests for src/context-drawer.js (Task T5: ContextDrawer).
//
// Node's built-in test runner has no DOM. Section 1 tests the pure,
// DOM-free logic directly. Section 2 uses a small hand-written fake-DOM
// shim (createElement/classList/dataset/style/querySelectorAll/click/focus
// — just enough surface for this module's actual DOM calls) to exercise
// rendering, open/close, and focus-return structurally.
//
// Honesty note (see tasks.md T5 verification / caveats): this fake-DOM
// shim proves the *logic* — which text nodes get written, which
// classes/attributes get toggled, and critically, that
// `document.activeElement` after a simulated open->Escape->close cycle is
// exactly the anchor button that opened the drawer — but it is not a real
// browser. It does not prove actual Tab-key focus order, real CSS
// rendering/transitions, or screen-reader announcement. The
// claude-in-chrome browser extension was not connected in this session
// (same limitation T3/T4/T8 hit earlier), so no real-browser confirmation
// was possible; this is a structural proof of the same property, not a
// substitute for one. Re-check in an actual browser before T11's
// accessibility pass or T12's demo, consistent with the prior tasks'
// identical caveat.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureAnchors = JSON.parse(readFileSync(path.join(__dirname, '../content/fixtures/anchors.json'), 'utf8'));
const fixtureRelationships = JSON.parse(readFileSync(path.join(__dirname, '../content/fixtures/relationships.json'), 'utf8'));
const realAnchors = JSON.parse(readFileSync(path.join(__dirname, '../content/anchors.json'), 'utf8'));
const realRelationships = JSON.parse(readFileSync(path.join(__dirname, '../content/relationships.json'), 'utf8'));

// --- Section 1: pure logic, no DOM needed at all ---------------------------

test('T5 pure logic: drawerRelationshipItems filters to the anchor and tags direction', async (t) => {
  const { drawerRelationshipItems } = await import('../src/context-drawer.js');
  const { buildRelationshipItems } = await import('../src/relationship-layer.js');

  await t.test('real production data: turing participates in outgoing + incoming relationships, both tagged correctly', () => {
    const items = buildRelationshipItems(realRelationships, realAnchors);
    const turingItems = drawerRelationshipItems('turing', items);
    assert.ok(turingItems.length > 0, 'turing should have at least one relationship in real content');
    for (const item of turingItems) {
      assert.ok(item.from === 'turing' || item.to === 'turing');
      assert.equal(item.direction, item.from === 'turing' ? 'outgoing' : 'incoming');
    }
  });

  await t.test('an anchor with no relationships returns an empty array, not an error', () => {
    const items = buildRelationshipItems(realRelationships, realAnchors);
    const noneItems = drawerRelationshipItems('anchor-that-does-not-exist', items);
    assert.deepEqual(noneItems, []);
  });
});

test('T5 pure logic: formatSourceLine exposes provenance (label, url, accessed date, claimType, confidence)', async (t) => {
  const { formatSourceLine } = await import('../src/context-drawer.js');

  await t.test('full anchor produces every field as text', () => {
    const anchor = realAnchors.anchors.find((a) => a.id === 'lovelace');
    const text = formatSourceLine(anchor);
    assert.ok(text.includes(anchor.source.label));
    assert.ok(text.includes(anchor.source.accessedDate));
    assert.ok(text.includes(anchor.claimType));
    assert.ok(text.includes(anchor.confidence));
  });

  await t.test('an anchor with no source recorded fails toward an explicit statement, not a blank string', () => {
    const text = formatSourceLine({ claimType: 'fact', confidence: 'high' });
    assert.match(text, /no source recorded/i);
  });
});

// --- Section 2: fake-DOM shim ----------------------------------------------
// Minimal — only the DOM surface src/context-drawer.js actually calls, plus
// a `focus()`/`document.activeElement` implementation, since that is the
// crux of the focus-return acceptance criterion.

class FakeClassList {
  constructor() { this.set = new Set(); }
  add(c) { this.set.add(c); }
  remove(c) { this.set.delete(c); }
  toggle(c, force) {
    if (force === undefined) {
      if (this.set.has(c)) this.set.delete(c); else this.set.add(c);
    } else if (force) this.set.add(c); else this.set.delete(c);
  }
  contains(c) { return this.set.has(c); }
  toString() { return [...this.set].join(' '); }
}

function camelizeDataAttr(attr) {
  return attr.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
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
    this.offsetWidth = 176;
    this.offsetHeight = 76;
  }
  get classList() { return this._classList; }
  set className(v) {
    this._classList = new FakeClassList();
    v.split(' ').filter(Boolean).forEach((c) => this._classList.add(c));
  }
  get className() { return this._classList.toString(); }
  setAttribute(name, value) {
    this._attrs[name] = String(value);
    if (name === 'class') {
      this._classList = new FakeClassList();
      String(value).split(' ').filter(Boolean).forEach((c) => this._classList.add(c));
    }
  }
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
  set innerHTML(v) {
    this.children = [];
    this._text = typeof v === 'string' ? v.replace(/<[^>]*>/g, '') : '';
  }
  addEventListener(type, fn) { (this._listeners[type] ??= []).push(fn); }
  click() { (this._listeners.click || []).forEach((fn) => fn()); }
  focus() { globalThis.document.activeElement = this; }
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
  const body = new FakeElement('body');
  const listeners = {};
  globalThis.document = {
    activeElement: null,
    body,
    createElement(tag) { return new FakeElement(tag); },
    createElementNS(_ns, tag) { return new FakeElement(tag); },
    addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
    _dispatch(type, event) { (listeners[type] || []).forEach((fn) => fn(event)); },
  };
}

function makeAnchorButton(id) {
  const el = new FakeElement('button');
  el.className = 'anchor';
  el.dataset.anchorId = id;
  el.style.left = '100px';
  el.style.top = '100px';
  return el;
}

function makeIndexButton(id) {
  const el = new FakeElement('button');
  el.className = 'relationship-button';
  el.dataset.focusRel = id;
  el.setAttribute('aria-pressed', 'false');
  // Mirrors T4's own wired click handler (relationship-layer.js
  // wireFocusInteractions -> focusRelationship): activating an index
  // button toggles its own pressed state. Simplified re-creation (not an
  // import — T4's real handler also touches arcs/anchors, out of scope for
  // this module's tests) sufficient to prove drawer<->index sync.
  el.addEventListener('click', () => {
    const wasPressed = el.getAttribute('aria-pressed') === 'true';
    el.setAttribute('aria-pressed', String(!wasPressed));
  });
  return el;
}

function makeDrawerDom() {
  return {
    drawer: (() => { const e = new FakeElement('aside'); return e; })(),
    scrim: new FakeElement('div'),
    body: document.body,
    closeBtn: new FakeElement('button'),
    labelEl: new FakeElement('p'),
    titleEl: new FakeElement('h2'),
    metaEl: new FakeElement('p'),
    storyEl: new FakeElement('div'),
    peopleEl: new FakeElement('ul'),
    topicsEl: new FakeElement('ul'),
    sourceEl: new FakeElement('p'),
    relEl: new FakeElement('ul'),
  };
}

installFakeDocument();
const {
  renderDrawerContent,
  openDrawer,
  closeDrawer,
  syncDrawerHighlight,
  wireDrawerRelationshipButtons,
  drawerRelationshipItems: drawerItems,
} = await import('../src/context-drawer.js');
const { buildRelationshipItems } = await import('../src/relationship-layer.js');

test('T5 DOM: renderDrawerContent — story/people/topics/source/relationships all render as real text', async (t) => {
  const items = buildRelationshipItems(realRelationships, realAnchors);

  await t.test('an anchor with relationships (lovelace)', () => {
    const anchor = realAnchors.anchors.find((a) => a.id === 'lovelace');
    const relItems = drawerItems('lovelace', items);
    const dom = makeDrawerDom();
    renderDrawerContent(dom, anchor, relItems);

    assert.equal(dom.titleEl.textContent, anchor.title);
    assert.ok(dom.metaEl.textContent.includes(anchor.date.display));
    assert.equal(dom.storyEl.textContent, anchor.story);
    assert.equal(dom.peopleEl.children.length, anchor.people.length);
    assert.equal(dom.topicsEl.children.length, anchor.topics.length);
    assert.ok(dom.sourceEl.textContent.includes(anchor.source.label));
    assert.ok(relItems.length > 0, 'test setup assumption: lovelace has relationships in real content');
    assert.equal(dom.relEl.children.length, relItems.length);
    dom.relEl.children.forEach((li, i) => {
      const button = li.children[0];
      assert.equal(button.tagName, 'button');
      assert.equal(button.dataset.focusRel, relItems[i].id);
      assert.ok(button.textContent.includes(relItems[i].type));
      assert.ok(button.textContent.includes(relItems[i].confidenceText));
    });
  });

  await t.test('an anchor with zero relationships states this plainly, not a blank list (design.md §9 edge case)', () => {
    const anchor = realAnchors.anchors[0];
    const dom = makeDrawerDom();
    renderDrawerContent(dom, anchor, []);
    assert.match(dom.relEl.textContent, /no catalogued relationships/i);
  });
});

test('T5 DOM: full open -> read -> Escape -> close cycle, focus returns exactly to the triggering anchor', async (t) => {
  await t.test('activeElement after Escape is the exact anchor button that opened the drawer, not merely "some" element', () => {
    const anchor = realAnchors.anchors.find((a) => a.id === 'turing');
    const items = buildRelationshipItems(realRelationships, realAnchors);
    const relItems = drawerItems('turing', items);
    const dom = makeDrawerDom();
    const indexRoot = new FakeElement('ul');
    // Real production data has >=1 relationship touching turing; seed a
    // matching index button for each so wireDrawerRelationshipButtons has
    // something real to find (proves the drawer<->index wiring, not just
    // that it degrades gracefully when absent — that's covered separately).
    relItems.forEach((item) => indexRoot.appendChild(makeIndexButton(item.id)));

    const triggerButton = makeAnchorButton('turing');
    const otherAnchorButton = makeAnchorButton('dartmouth'); // a distractor element, never focused
    document.activeElement = otherAnchorButton; // pre-open focus lives elsewhere

    const state = { open: false, returnFocus: null, currentAnchorId: null };

    openDrawer({ dom, anchor, trigger: triggerButton, relItems, indexRoot, state });

    assert.equal(dom.drawer.classList.contains('is-open'), true);
    assert.equal(dom.scrim.classList.contains('is-open'), true);
    assert.equal(dom.drawer.getAttribute('aria-hidden'), 'false');
    assert.equal(dom.body.classList.contains('drawer-open'), true);
    assert.equal(document.activeElement, dom.closeBtn, 'opening moves focus into the drawer (close button)');
    assert.equal(state.returnFocus, triggerButton, 'the exact trigger element is recorded, not a copy/id');

    closeDrawer({ dom, state });

    assert.equal(dom.drawer.classList.contains('is-open'), false);
    assert.equal(dom.drawer.getAttribute('aria-hidden'), 'true');
    assert.equal(dom.body.classList.contains('drawer-open'), false);
    assert.equal(
      document.activeElement,
      triggerButton,
      'THE hard requirement: focus returns exactly to the anchor button that opened the drawer'
    );
    assert.notEqual(document.activeElement, otherAnchorButton, 'must not merely land on "an" anchor — the specific one');
  });

  await t.test('close/reopen cycle for a different anchor updates returnFocus to the new trigger, not the stale one', () => {
    const anchor1 = realAnchors.anchors[0];
    const anchor2 = realAnchors.anchors[1];
    const items = buildRelationshipItems(realRelationships, realAnchors);
    const dom = makeDrawerDom();
    const indexRoot = new FakeElement('ul');
    const trigger1 = makeAnchorButton(anchor1.id);
    const trigger2 = makeAnchorButton(anchor2.id);
    const state = { open: false, returnFocus: null, currentAnchorId: null };

    openDrawer({ dom, anchor: anchor1, trigger: trigger1, relItems: drawerItems(anchor1.id, items), indexRoot, state });
    closeDrawer({ dom, state });
    assert.equal(document.activeElement, trigger1);

    openDrawer({ dom, anchor: anchor2, trigger: trigger2, relItems: drawerItems(anchor2.id, items), indexRoot, state });
    closeDrawer({ dom, state });
    assert.equal(document.activeElement, trigger2, 'second cycle must return focus to the second trigger, not the first');
  });
});

test('T5 DOM: opening/closing the drawer never touches the underlying atlas DOM (canvas stays fully intact)', async (t) => {
  await t.test('canvasRoot and its anchor buttons are untouched by open/close', () => {
    const canvasRoot = new FakeElement('div');
    const anchorButton = makeAnchorButton('lovelace');
    canvasRoot.appendChild(anchorButton);

    const anchor = realAnchors.anchors[0];
    const dom = makeDrawerDom();
    const indexRoot = new FakeElement('ul');
    const state = { open: false, returnFocus: null, currentAnchorId: null };

    openDrawer({ dom, anchor, trigger: anchorButton, relItems: [], indexRoot, state });
    assert.equal(canvasRoot.children.length, 1, 'canvas still has its anchor button — nothing removed/hidden');
    assert.equal(canvasRoot.children[0], anchorButton);
    assert.equal(anchorButton.getAttribute('aria-hidden'), null, 'the atlas is never marked aria-hidden by the drawer');

    closeDrawer({ dom, state });
    assert.equal(canvasRoot.children.length, 1);
  });
});

test('T5 DOM: drawer relationship selection triggers T4\'s Relationship Index (drawer -> T4 focus)', async (t) => {
  await t.test('clicking a drawer relationship button clicks the matching index button', () => {
    const items = buildRelationshipItems(realRelationships, realAnchors);
    const relItems = drawerItems('turing', items);
    assert.ok(relItems.length > 0);

    const dom = makeDrawerDom();
    renderDrawerContent(dom, realAnchors.anchors.find((a) => a.id === 'turing'), relItems);

    const indexRoot = new FakeElement('ul');
    const indexButtons = relItems.map((item) => makeIndexButton(item.id));
    indexButtons.forEach((b) => indexRoot.appendChild(b));

    wireDrawerRelationshipButtons(dom.relEl, indexRoot);

    const firstDrawerButton = dom.relEl.children[0].children[0];
    assert.equal(firstDrawerButton.getAttribute('aria-pressed'), 'false');

    firstDrawerButton.click();

    const matchingIndexButton = indexButtons.find((b) => b.dataset.focusRel === relItems[0].id);
    assert.equal(matchingIndexButton.getAttribute('aria-pressed'), 'true', 'the real index button (T4\'s single source of truth) actually toggled');
    assert.equal(firstDrawerButton.getAttribute('aria-pressed'), 'true', 'drawer button mirrors the state it just triggered');
  });
});

test('T5 DOM: T4 Relationship Index focus mirrors into the open drawer (T4 -> drawer sync)', async (t) => {
  await t.test('syncDrawerHighlight reflects whichever index button is currently pressed', () => {
    const items = buildRelationshipItems(realRelationships, realAnchors);
    const relItems = drawerItems('turing', items);
    const dom = makeDrawerDom();
    renderDrawerContent(dom, realAnchors.anchors.find((a) => a.id === 'turing'), relItems);

    const indexRoot = new FakeElement('ul');
    const indexButtons = relItems.map((item) => makeIndexButton(item.id));
    indexButtons.forEach((b) => indexRoot.appendChild(b));

    // Simulate T4 focusing the SECOND relationship via the always-visible
    // index, independent of the drawer.
    indexButtons[1].setAttribute('aria-pressed', 'true');

    const activeId = syncDrawerHighlight(dom.relEl, indexRoot);
    assert.equal(activeId, relItems[1].id);

    const drawerButtons = dom.relEl.children.map((li) => li.children[0]);
    drawerButtons.forEach((button, i) => {
      assert.equal(button.getAttribute('aria-pressed'), String(i === 1));
    });
  });

  await t.test('no active relationship in the index clears all drawer highlights', () => {
    const items = buildRelationshipItems(realRelationships, realAnchors);
    const relItems = drawerItems('turing', items);
    const dom = makeDrawerDom();
    renderDrawerContent(dom, realAnchors.anchors.find((a) => a.id === 'turing'), relItems);
    const indexRoot = new FakeElement('ul');
    relItems.forEach((item) => indexRoot.appendChild(makeIndexButton(item.id)));

    const activeId = syncDrawerHighlight(dom.relEl, indexRoot);
    assert.equal(activeId, '');
    dom.relEl.children.forEach((li) => {
      assert.equal(li.children[0].getAttribute('aria-pressed'), 'false');
    });
  });
});

test('T5 DOM: fixture data — the whole open/close/focus-return cycle also holds against T1\'s smaller fixture set', async (t) => {
  await t.test('fixture anchor + fixture relationships', () => {
    const items = buildRelationshipItems(fixtureRelationships, fixtureAnchors);
    const anchor = fixtureAnchors.anchors[0];
    const relItems = drawerItems(anchor.id, items);
    const dom = makeDrawerDom();
    const indexRoot = new FakeElement('ul');
    const trigger = makeAnchorButton(anchor.id);
    const state = { open: false, returnFocus: null, currentAnchorId: null };

    openDrawer({ dom, anchor, trigger, relItems, indexRoot, state });
    assert.equal(dom.titleEl.textContent, anchor.title);
    closeDrawer({ dom, state });
    assert.equal(document.activeElement, trigger);
  });
});
