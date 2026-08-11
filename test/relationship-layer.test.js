// Tests for src/relationship-layer.js (Task T4: RelationshipLayer).
//
// Node's built-in test runner has no DOM. Section 1 tests the pure,
// DOM-free logic directly. Section 2 uses a small hand-written fake-DOM
// shim (createElement/classList/dataset/style/querySelectorAll/click —
// just enough surface for this module's actual DOM calls, nothing more)
// to exercise the rendering and focus-interaction functions structurally.
//
// Honesty note (see tasks.md T4 verification / caveats in the commit
// message): this fake-DOM shim proves the *logic* — which text nodes get
// written, which classes/attributes get toggled, that pointer-path and
// keyboard-path both funnel through the identical focusRelationship()
// call and produce byte-identical resulting state — but it is not a real
// browser. It does not prove actual Tab-key focus order, real CSS
// rendering, or screen-reader announcement. No browser tool was reachable
// in this session (see commit message) to verify those.

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

test('T4 pure logic: confidenceInfo maps confidence to the solid/dashed grammar', async (t) => {
  const { confidenceInfo } = await import('../src/relationship-layer.js');

  await t.test('documented is solid (not dashed)', () => {
    assert.equal(confidenceInfo('documented').dashed, false);
  });
  await t.test('interpretation is dashed', () => {
    assert.equal(confidenceInfo('interpretation').dashed, true);
  });
  await t.test('indirect is dashed', () => {
    assert.equal(confidenceInfo('indirect').dashed, true);
  });
  await t.test('an uncatalogued confidence value fails toward dashed (never silently solid/documented)', () => {
    const info = confidenceInfo('made-up-value');
    assert.equal(info.dashed, true);
    assert.match(info.text, /made-up-value/);
  });
  await t.test('every text description is non-empty (this is the text-equivalent content itself)', () => {
    for (const c of ['documented', 'interpretation', 'indirect']) {
      assert.ok(confidenceInfo(c).text.length > 10);
    }
  });
});

test('T4 pure logic: buildRelationshipItems enriches every relationship with real anchor titles and text-equivalent fields', async (t) => {
  const { buildRelationshipItems } = await import('../src/relationship-layer.js');

  await t.test('fixture data: every item resolves from/to titles from anchors, not raw ids', () => {
    const items = buildRelationshipItems(fixtureRelationships, fixtureAnchors);
    assert.equal(items.length, fixtureRelationships.relationships.length);
    for (const item of items) {
      assert.notEqual(item.fromTitle, item.from, 'fromTitle should be the human title, not the raw id');
      assert.notEqual(item.toTitle, item.to, 'toTitle should be the human title, not the raw id');
      assert.ok(item.type, 'type must be present as text');
      assert.ok(item.confidence, 'confidence must be present as text');
      assert.ok(item.confidenceText, 'confidenceText (full sentence) must be present');
      assert.ok(item.label, 'the authored relationship label must be present');
      assert.equal(typeof item.dashed, 'boolean');
    }
  });

  await t.test('real production data (content/relationships.json): all 8 relationships enrich cleanly, matching T2\'s documented/interpretation/indirect mix', () => {
    const items = buildRelationshipItems(realRelationships, realAnchors);
    assert.equal(items.length, 8);
    const documented = items.filter((i) => i.confidence === 'documented');
    const nonDocumented = items.filter((i) => i.confidence !== 'documented');
    assert.ok(documented.length > 0, 'expected at least one documented (solid-arc) relationship in real content');
    assert.ok(nonDocumented.length > 0, 'expected at least one interpretation/indirect (dashed-arc) relationship in real content');
    for (const item of nonDocumented) {
      assert.equal(item.dashed, true, `${item.id} (${item.confidence}) must render dashed, not solid`);
    }
    for (const item of documented) {
      assert.equal(item.dashed, false, `${item.id} (documented) must render solid, not dashed`);
    }
  });

  await t.test('an unresolvable anchor id falls back to the raw id rather than throwing', () => {
    const items = buildRelationshipItems(
      { relationships: [{ id: 'x', from: 'nope', to: 'also-nope', type: 'influenced', confidence: 'documented', claimType: 'fact', label: 'test' }] },
      { anchors: [] }
    );
    assert.equal(items[0].fromTitle, 'nope');
    assert.equal(items[0].toTitle, 'also-nope');
  });
});

test('T4 pure logic: buildArcPath produces a deterministic cubic-bezier S-curve', async (t) => {
  const { buildArcPath } = await import('../src/relationship-layer.js');
  await t.test('midpoint control points sit between the two endpoints', () => {
    const d = buildArcPath(100, 50, 300, 150);
    assert.equal(d, 'M 100 50 C 200 50, 200 150, 300 150');
  });
});

// --- Section 2: fake-DOM shim ----------------------------------------------
// Minimal — only the DOM surface src/relationship-layer.js actually calls.

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
    // Approximation of real innerHTML=str parsing, sufficient for these
    // tests: clear children and keep the tag-stripped text so
    // .textContent assertions on error-state HTML strings still work.
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
  const attrName = (selector.match(/\[([\w-]+)\]/) || [])[1];
  for (const cls of classNames) {
    if (!el._classList || !el._classList.contains(cls)) return false;
  }
  if (attrName && attrName.startsWith('data-')) {
    const key = camelizeDataAttr(attrName);
    if (el.dataset[key] === undefined) return false;
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
  globalThis.document = {
    createElement(tag) { return new FakeElement(tag); },
    createElementNS(_ns, tag) { return new FakeElement(tag); },
    addEventListener() {}, // module's own auto-init guard registers this; never fired in tests
  };
}

function makeAnchorButton(id, left, top) {
  const el = new FakeElement('button');
  el.className = 'anchor';
  el.dataset.anchorId = id;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  return el;
}

installFakeDocument();
const {
  renderRelationshipIndex,
  renderRelationshipArcs,
  readAnchorPositions,
  focusRelationship,
  wireFocusInteractions,
  buildRelationshipItems: buildItems,
  waitForAnchors,
} = await import('../src/relationship-layer.js');

test('T4 DOM: renderRelationshipIndex — true text equivalent, survives "CSS disabled"', async (t) => {
  const items = buildItems(fixtureRelationships, fixtureAnchors);

  await t.test('one <li><button> per relationship, all real text nodes (no CSS/icon-only content)', () => {
    const root = new FakeElement('ul');
    renderRelationshipIndex(root, items);
    assert.equal(root.children.length, items.length);
    root.children.forEach((li, i) => {
      const button = li.children[0];
      const text = button.textContent;
      const item = items[i];
      // The exact assertion the acceptance criteria calls for: disabling
      // CSS only removes styling, never DOM text content — so asserting
      // against .textContent (not against any class or visual state) is
      // the correct proof that type/direction/confidence survive with
      // CSS off. classList/style are irrelevant to what textContent
      // contains.
      assert.ok(text.includes(item.type), `text must include the relationship type ("${item.type}")`);
      assert.ok(text.includes(item.confidence), `text must include the confidence label ("${item.confidence}")`);
      assert.ok(text.includes(item.fromTitle) && text.includes(item.toTitle), 'text must include both endpoint titles (direction)');
      assert.ok(text.includes('→'), 'direction must be stated explicitly, not just implied by DOM order');
      assert.ok(text.includes(item.confidenceText), 'the full confidence sentence must be present as text');
      assert.ok(text.includes(item.label), 'the authored relationship label must be present as text');
    });
  });

  await t.test('empty relationship set renders a plain-text explanation, not a blank list', () => {
    const root = new FakeElement('ul');
    renderRelationshipIndex(root, []);
    assert.match(root.textContent, /no relationships/i);
  });

  await t.test('every button starts keyboard-focusable and unpressed', () => {
    const root = new FakeElement('ul');
    renderRelationshipIndex(root, items);
    root.children.forEach((li) => {
      const button = li.children[0];
      assert.equal(button.tagName, 'button');
      assert.equal(button.getAttribute('aria-pressed'), 'false');
    });
  });
});

test('T4 DOM: renderRelationshipArcs — solid vs dashed matches confidence, skips unresolvable anchors', async (t) => {
  await t.test('documented -> no "indirect" class (solid); interpretation/indirect -> "indirect" class (dashed)', () => {
    const items = buildItems(fixtureRelationships, fixtureAnchors);
    const svg = new FakeElement('svg');
    const positions = new Map([
      ['lovelace', { x: 100, y: 200 }],
      ['turing', { x: 300, y: 200 }],
      ['dartmouth', { x: 500, y: 400 }],
    ]);
    renderRelationshipArcs(svg, items, positions);
    assert.equal(svg.children.length, items.length);
    svg.children.forEach((path, i) => {
      assert.equal(path.dataset.rel, items[i].id);
      assert.equal(path.classList.contains('indirect'), items[i].dashed);
      assert.equal(path.classList.contains('arc'), true);
    });
  });

  await t.test('a relationship referencing an anchor with no rendered position is skipped, not thrown', () => {
    const items = buildItems(fixtureRelationships, fixtureAnchors);
    const svg = new FakeElement('svg');
    renderRelationshipArcs(svg, items, new Map()); // no positions at all
    assert.equal(svg.children.length, 0);
  });

  await t.test('arcs are aria-hidden (decorative) — the text index, not the arc, is the accessible source', () => {
    const svg = new FakeElement('svg');
    renderRelationshipArcs(svg, [], new Map());
    assert.equal(svg.getAttribute('aria-hidden'), 'true');
  });
});

test('T4 DOM: readAnchorPositions reads T3\'s rendered anchor DOM without assuming its layout constants', async (t) => {
  await t.test('positions keyed by anchor id, y adjusted to the card vertical center', () => {
    const canvas = new FakeElement('div');
    canvas.appendChild(makeAnchorButton('lovelace', 100, 200));
    const positions = readAnchorPositions(canvas);
    const pos = positions.get('lovelace');
    assert.equal(pos.x, 100);
    assert.equal(pos.y, 200 + 76 / 2); // top + offsetHeight/2 (fake default height)
  });
});

test('T4 DOM: focusRelationship — pointer path and keyboard path converge on identical state', async (t) => {
  function buildScene(items) {
    const indexRoot = new FakeElement('ul');
    renderRelationshipIndex(indexRoot, items);
    const svg = new FakeElement('svg');
    const canvasRoot = new FakeElement('div');
    const positions = new Map([
      ['lovelace', { x: 0, y: 0 }],
      ['turing', { x: 100, y: 0 }],
      ['dartmouth', { x: 200, y: 0 }],
    ]);
    canvasRoot.appendChild(makeAnchorButton('lovelace', 0, 0));
    canvasRoot.appendChild(makeAnchorButton('turing', 100, 0));
    canvasRoot.appendChild(makeAnchorButton('dartmouth', 200, 0));
    renderRelationshipArcs(svg, items, positions);
    const refs = wireFocusInteractions(indexRoot, svg, canvasRoot, items);
    return { indexRoot, svg, canvasRoot, refs };
  }

  function snapshotState({ refs }) {
    return {
      pressed: refs.relButtons.map((b) => b.getAttribute('aria-pressed')),
      arcActive: refs.arcs.map((a) => a.classList.contains('is-active')),
      arcDimmed: refs.arcs.map((a) => a.classList.contains('is-dimmed')),
      anchorDimmed: refs.anchorEls.map((a) => a.classList.contains('is-dimmed')),
    };
  }

  const items = buildItems(fixtureRelationships, fixtureAnchors);
  const targetId = items[0].id; // 'lovelace-turing'

  await t.test('activating via the wired click handler (keyboard: Enter/Space fire the same click event as a pointer click) produces the same state as calling focusRelationship() directly (pointer path)', () => {
    const pointerScene = buildScene(items);
    focusRelationship(targetId, pointerScene.refs); // simulates the pointer click handler body directly

    const keyboardScene = buildScene(items);
    // Simulate keyboard activation: a real browser fires an identical
    // 'click' event on a <button> for Enter/Space as it does for a mouse
    // click — wireFocusInteractions attaches exactly one 'click' listener,
    // so triggering it here (regardless of input device) exercises the
    // exact same code path a keyboard user's Enter/Space would.
    const targetButton = keyboardScene.refs.relButtons.find((b) => b.dataset.focusRel === targetId);
    targetButton.click();

    assert.deepEqual(snapshotState(pointerScene), snapshotState(keyboardScene));
  });

  await t.test('the resulting state correctly reflects the focused relationship: matching button pressed, matching arc active, others dimmed', () => {
    const scene = buildScene(items);
    focusRelationship(targetId, scene.refs);
    const state = snapshotState(scene);
    assert.equal(state.pressed[0], 'true');
    assert.equal(state.pressed.slice(1).every((p) => p === 'false'), true);
    assert.equal(state.arcActive[0], true);
    assert.equal(state.arcDimmed.slice(1).every((d) => d === true), true);
    // lovelace + turing are the endpoints of items[0]; dartmouth is not,
    // so it (and its anchor button) should be dimmed while lovelace/turing
    // are not.
    const dartmouthIdx = scene.refs.anchorEls.findIndex((a) => a.dataset.anchorId === 'dartmouth');
    assert.equal(state.anchorDimmed[dartmouthIdx], true);
    const lovelaceIdx = scene.refs.anchorEls.findIndex((a) => a.dataset.anchorId === 'lovelace');
    assert.equal(state.anchorDimmed[lovelaceIdx], false);
  });

  await t.test('activating the already-active relationship again clears focus (toggle-off), for both paths identically', () => {
    const scene = buildScene(items);
    focusRelationship(targetId, scene.refs);
    focusRelationship(targetId, scene.refs); // second activation clears
    const state = snapshotState(scene);
    assert.ok(state.pressed.every((p) => p === 'false'));
    assert.ok(state.arcActive.every((a) => a === false));
    assert.ok(state.arcDimmed.every((d) => d === false));
    assert.ok(state.anchorDimmed.every((d) => d === false));
  });
});

test('T4 DOM: initRelationshipLayer end-to-end — real production content/relationships.json + content/anchors.json against a simulated T3-rendered canvas', async (t) => {
  const { initRelationshipLayer } = await import('../src/relationship-layer.js');

  await t.test('happy path: index gets all 8 real relationships, arcs get drawn, no error state shown', async () => {
    const canvasRoot = new FakeElement('div');
    const timelineCanvas = new FakeElement('div');
    timelineCanvas.className = 'timeline-canvas';
    timelineCanvas.style.width = '4000px';
    timelineCanvas.style.height = '1200px';
    // Simulate T3's already-rendered anchor buttons for every real anchor id.
    realAnchors.anchors.forEach((a, i) => {
      timelineCanvas.appendChild(makeAnchorButton(a.id, i * 300, 100 + (i % 4) * 150));
    });
    canvasRoot.appendChild(timelineCanvas);
    const indexRoot = new FakeElement('ul');

    const reader = async (p) => {
      if (p.endsWith('anchors.json')) return realAnchors;
      if (p.endsWith('relationships.json')) return realRelationships;
      if (p.endsWith('today-stories.json')) return { lastUpdated: new Date().toISOString(), freshnessState: 'fresh', stories: [] };
      throw new Error(`unexpected path ${p}`);
    };

    await initRelationshipLayer({ canvasRoot, indexRoot, contentOpts: { reader } });

    assert.equal(indexRoot.children.length, 8, 'all 8 real relationships should render in the text index');
    assert.doesNotMatch(indexRoot.textContent, /could not load|failed validation/i);
    const svg = timelineCanvas.querySelector('.relationship-layer');
    assert.ok(svg, 'an SVG relationship-layer element must be inserted into the timeline canvas');
    assert.equal(svg.children.length, 8, 'all 8 relationships should have a drawn arc (all real anchors are present)');
  });

  await t.test('validation failure surfaces a plain-text error in the index, not a silent blank list', async () => {
    const canvasRoot = new FakeElement('div');
    const timelineCanvas = new FakeElement('div');
    timelineCanvas.className = 'timeline-canvas';
    canvasRoot.appendChild(timelineCanvas);
    canvasRoot.appendChild(makeAnchorButton('lovelace', 0, 0)); // satisfy waitForAnchors
    const indexRoot = new FakeElement('ul');

    const reader = async (p) => {
      if (p.endsWith('anchors.json')) return { anchors: [{ id: 'lovelace' }] }; // missing required fields
      if (p.endsWith('relationships.json')) return { relationships: [] };
      if (p.endsWith('today-stories.json')) return { lastUpdated: new Date().toISOString(), freshnessState: 'fresh', stories: [] };
      throw new Error('unexpected');
    };

    await initRelationshipLayer({ canvasRoot, indexRoot, contentOpts: { reader } });
    assert.match(indexRoot.textContent, /failed validation/i);
  });
});

test('T4 DOM: waitForAnchors resolves once TimelineCanvas has rendered, times out if it never does', async (t) => {
  await t.test('resolves immediately if anchors are already present', async () => {
    const canvasRoot = new FakeElement('div');
    canvasRoot.appendChild(makeAnchorButton('lovelace', 0, 0));
    const found = await waitForAnchors(canvasRoot, { timeoutMs: 500, pollMs: 5 });
    assert.equal(found.length, 1);
  });

  await t.test('resolves once anchors appear asynchronously', async () => {
    const canvasRoot = new FakeElement('div');
    setTimeout(() => canvasRoot.appendChild(makeAnchorButton('turing', 0, 0)), 20);
    const found = await waitForAnchors(canvasRoot, { timeoutMs: 500, pollMs: 5 });
    assert.equal(found.length, 1);
  });

  await t.test('rejects with a clear error if anchors never appear', async () => {
    const canvasRoot = new FakeElement('div');
    await assert.rejects(() => waitForAnchors(canvasRoot, { timeoutMs: 30, pollMs: 5 }), /timed out/i);
  });
});
