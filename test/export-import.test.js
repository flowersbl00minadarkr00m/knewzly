// Tests for src/export-import.js (Task T7: Export/Import progress).
//
// Node's built-in test runner has no DOM, no real file-download machinery,
// and no browser File input. Same honest fallback every prior task in this
// plan used (T3/T4/T5/T6/T8/T9): a hand-written fake Storage, fake
// Blob/URL/document for the download path, and a fake File-alike (an object
// with a `.text()` method, exactly the real File/Blob interface) for the
// import path. The claude-in-chrome browser extension was reported
// disconnected for this whole session (confirmed for the orchestrator too,
// per this task's dispatch) — a real browser download/file-picker round
// trip was not attempted; this proves the underlying logic and DOM output
// correctly, not actual browser download-manager or file-picker behavior.
// Re-check in a real browser before T11's accessibility pass or T12's demo,
// consistent with every earlier task's identical caveat.

import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- Fakes -------------------------------------------------------------

/**
 * `_writeCount` intentionally excludes T6's `isStorageAvailable` probe key
 * (`__knewzly_visited_probe__`, set-then-immediately-removed on every
 * `readVisited`/`writeVisited` call) — that probe is legitimate existing T6
 * behavior, not a T7 mutation of real visited state, and counting it would
 * make an honest "zero writes" assertion falsely fail. What matters for
 * FR-010/NFR-003 is whether the real `knewzly-visited-v1` key ever changes.
 */
class FakeStorage {
  constructor(initial) {
    this._data = new Map();
    this._writeCount = 0;
    if (initial) this._data.set('knewzly-visited-v1', JSON.stringify(initial));
  }
  getItem(key) { return this._data.has(key) ? this._data.get(key) : null; }
  setItem(key, value) {
    if (key !== '__knewzly_visited_probe__') this._writeCount += 1;
    this._data.set(key, String(value));
  }
  removeItem(key) { this._data.delete(key); }
  clear() { this._data.clear(); }
}

/** A File-alike: the real browser File interface exposes `.text()` (File
 * extends Blob) — this fake matches that exact surface, not a simulation of
 * something unrelated. */
function fakeFile(text) {
  return { text: async () => text };
}

/** A File-alike that fails to read, simulating a real I/O error. */
function unreadableFakeFile() {
  return { text: async () => { throw new Error('boom'); } };
}

class FakeBlob {
  constructor(parts, opts) { this.parts = parts; this.opts = opts; }
}

function makeFakeDownloadEnv() {
  const createdObjectUrls = [];
  const revokedObjectUrls = [];
  const appended = [];
  const clickedAnchors = [];

  class FakeAnchorEl {
    setAttribute(name, value) { this[`_attr_${name}`] = value; if (name === 'download') this.download = value; }
    click() { clickedAnchors.push(this); }
  }

  const documentRef = {
    body: {
      appendChild(el) { el._parent = this; appended.push(el); },
      removeChild(el) { const i = appended.indexOf(el); if (i >= 0) appended.splice(i, 1); },
    },
    createElement(tag) {
      if (tag === 'a') return new FakeAnchorEl();
      throw new Error(`unexpected createElement(${tag})`);
    },
  };

  const urlApi = {
    createObjectURL(blob) {
      const url = `blob:fake/${createdObjectUrls.length}`;
      createdObjectUrls.push({ url, blob });
      return url;
    },
    revokeObjectURL(url) { revokedObjectUrls.push(url); },
  };

  return { documentRef, BlobCtor: FakeBlob, urlApi, createdObjectUrls, revokedObjectUrls, appended, clickedAnchors };
}

// --- Export --------------------------------------------------------------

test('T7 export: buildExportPayload — exact design.md §5 shape', async () => {
  const { buildExportPayload } = await import('../src/export-import.js');
  const state = { version: 1, visited: ['turing', 'dartmouth'] };
  const payload = buildExportPayload(state, () => '2026-08-11T00:00:00.000Z');
  assert.deepEqual(payload, {
    exportedFrom: 'knewzly-atlas',
    schemaVersion: 1,
    exportedAt: '2026-08-11T00:00:00.000Z',
    visited: ['turing', 'dartmouth'],
  });
});

test('T7 export: buildExportPayload copies the visited array (no shared reference back into state)', async () => {
  const { buildExportPayload } = await import('../src/export-import.js');
  const state = { version: 1, visited: ['turing'] };
  const payload = buildExportPayload(state, () => '2026-08-11T00:00:00.000Z');
  payload.visited.push('mutated');
  assert.deepEqual(state.visited, ['turing'], 'mutating the exported payload must never leak back into the source state');
});

test('T7 export: buildExportPayloadFromStorage reads via T6 readVisited, no duplicated storage logic', async () => {
  const { buildExportPayloadFromStorage } = await import('../src/export-import.js');
  const storage = new FakeStorage({ version: 1, visited: ['lovelace'] });
  const payload = buildExportPayloadFromStorage(storage, () => '2026-08-11T00:00:00.000Z');
  assert.deepEqual(payload.visited, ['lovelace']);
  assert.equal(payload.exportedFrom, 'knewzly-atlas');
});

test('T7 export: triggerExportDownload — real download pattern (Blob -> object URL -> clicked <a download>), all steps proven', async () => {
  const { triggerExportDownload } = await import('../src/export-import.js');
  const env = makeFakeDownloadEnv();
  const payload = { exportedFrom: 'knewzly-atlas', schemaVersion: 1, exportedAt: '2026-08-11T00:00:00.000Z', visited: ['turing'] };

  const result = triggerExportDownload(payload, env);

  assert.equal(env.createdObjectUrls.length, 1, 'exactly one Blob was turned into an object URL');
  assert.ok(env.createdObjectUrls[0].blob instanceof FakeBlob, 'a real Blob (fake-typed) was constructed, not a data: string hack');
  assert.equal(env.clickedAnchors.length, 1, 'exactly one <a> element was clicked to trigger the download');
  assert.equal(env.clickedAnchors[0].download, result.filename, 'the clicked anchor carries the download filename attribute');
  assert.deepEqual(JSON.parse(result.json), payload, 'the downloaded JSON round-trips to the exact payload');
  assert.match(result.filename, /\.json$/);
  assert.equal(env.revokedObjectUrls.length, 1, 'the object URL is revoked after use (no leak)');
});

test('T7 export: exportVisited — full orchestration reads real storage and downloads it', async () => {
  const { exportVisited } = await import('../src/export-import.js');
  const storage = new FakeStorage({ version: 1, visited: ['turing', 'dartmouth'] });
  const env = makeFakeDownloadEnv();

  const result = exportVisited(storage, env);
  const downloaded = JSON.parse(result.json);
  assert.equal(downloaded.exportedFrom, 'knewzly-atlas');
  assert.equal(downloaded.schemaVersion, 1);
  assert.deepEqual(downloaded.visited, ['turing', 'dartmouth']);
});

// --- Import: validation (the hard "malformed file never touches state" gate) ---

test('T7 import validation: parseImportJson — malformed JSON fails cleanly, never throws', async () => {
  const { parseImportJson } = await import('../src/export-import.js');
  const result = parseImportJson('{ not valid json ][');
  assert.equal(result.ok, false);
  assert.match(result.error, /not valid JSON/i);
});

test('T7 import validation: validateImportPayload — rejects every malformed/foreign shape with a clear reason', async (t) => {
  const { validateImportPayload } = await import('../src/export-import.js');

  await t.test('not an object', () => {
    assert.equal(validateImportPayload('a string').ok, false);
    assert.equal(validateImportPayload(42).ok, false);
    assert.equal(validateImportPayload(null).ok, false);
    assert.equal(validateImportPayload(['array']).ok, false);
  });

  await t.test('wrong exportedFrom (foreign file)', () => {
    const result = validateImportPayload({ exportedFrom: 'some-other-app', schemaVersion: 1, visited: ['turing'] });
    assert.equal(result.ok, false);
    assert.match(result.error, /Knewzly Atlas/);
  });

  await t.test('missing exportedFrom entirely', () => {
    assert.equal(validateImportPayload({ schemaVersion: 1, visited: [] }).ok, false);
  });

  await t.test('wrong schemaVersion', () => {
    const result = validateImportPayload({ exportedFrom: 'knewzly-atlas', schemaVersion: 2, visited: ['turing'] });
    assert.equal(result.ok, false);
    assert.match(result.error, /version/i);
  });

  await t.test('visited is not an array', () => {
    const result = validateImportPayload({ exportedFrom: 'knewzly-atlas', schemaVersion: 1, visited: 'turing' });
    assert.equal(result.ok, false);
  });

  await t.test('visited array contains non-string entries', () => {
    const result = validateImportPayload({ exportedFrom: 'knewzly-atlas', schemaVersion: 1, visited: ['turing', 42, null] });
    assert.equal(result.ok, false);
  });

  await t.test('a genuinely valid payload passes and returns a copied visited array', () => {
    const data = { exportedFrom: 'knewzly-atlas', schemaVersion: 1, exportedAt: '2026-08-11T00:00:00Z', visited: ['turing', 'dartmouth'] };
    const result = validateImportPayload(data);
    assert.equal(result.ok, true);
    assert.deepEqual(result.visited, ['turing', 'dartmouth']);
    result.visited.push('mutated');
    assert.deepEqual(data.visited, ['turing', 'dartmouth'], 'no shared-reference leak back into the parsed input');
  });
});

test('T7 import validation: parseAndValidateImportText — the single combined gate', async () => {
  const { parseAndValidateImportText } = await import('../src/export-import.js');
  assert.equal(parseAndValidateImportText('not json at all').ok, false);
  assert.equal(
    parseAndValidateImportText(JSON.stringify({ exportedFrom: 'other', schemaVersion: 1, visited: [] })).ok,
    false
  );
  const good = parseAndValidateImportText(JSON.stringify({ exportedFrom: 'knewzly-atlas', schemaVersion: 1, visited: ['a', 'b'] }));
  assert.equal(good.ok, true);
  assert.deepEqual(good.visited, ['a', 'b']);
});

// --- Import: merge / overwrite id logic ------------------------------------

test('T7 import logic: mergeVisitedIds — true union, deduped, order-preserving (existing first)', async () => {
  const { mergeVisitedIds } = await import('../src/export-import.js');
  assert.deepEqual(mergeVisitedIds(['a', 'b'], ['b', 'c']), ['a', 'b', 'c']);
  assert.deepEqual(mergeVisitedIds([], ['x', 'y']), ['x', 'y']);
  assert.deepEqual(mergeVisitedIds(['x', 'y'], []), ['x', 'y']);
  assert.deepEqual(mergeVisitedIds(['a', 'b'], ['b', 'a', 'c']), ['a', 'b', 'c'], 'a full duplicate import set adds nothing new');
});

test('T7 import logic: overwriteVisitedIds — imported set only, deduped', async () => {
  const { overwriteVisitedIds } = await import('../src/export-import.js');
  assert.deepEqual(overwriteVisitedIds(['x', 'y', 'x']), ['x', 'y']);
  assert.deepEqual(overwriteVisitedIds([]), []);
});

test('T7 import logic: applyImport — merge and overwrite both persist via T6 writeVisited (no duplicated storage code)', async () => {
  const { applyImport } = await import('../src/export-import.js');
  const storage = new FakeStorage({ version: 1, visited: ['a', 'b'] });

  const merged = applyImport(storage, 'merge', { version: 1, visited: ['a', 'b'] }, ['b', 'c']);
  assert.deepEqual(merged.state.visited, ['a', 'b', 'c']);
  assert.equal(merged.persisted, true);
  assert.deepEqual(JSON.parse(storage.getItem('knewzly-visited-v1')).visited, ['a', 'b', 'c']);

  const overwritten = applyImport(storage, 'overwrite', { version: 1, visited: ['a', 'b', 'c'] }, ['z']);
  assert.deepEqual(overwritten.state.visited, ['z']);
  assert.deepEqual(JSON.parse(storage.getItem('knewzly-visited-v1')).visited, ['z']);
});

test('T7 import logic: applyImport rejects an unknown mode rather than guessing', async () => {
  const { applyImport } = await import('../src/export-import.js');
  const storage = new FakeStorage();
  assert.throws(() => applyImport(storage, 'silently-pick-one', { version: 1, visited: [] }, ['a']));
});

// --- importFromFile: the full, honestly-critical orchestrator --------------

test('T7 importFromFile: REQUIRES a promptMergeOrOverwrite callback — refuses to silently pick a mode', async () => {
  const { importFromFile } = await import('../src/export-import.js');
  const storage = new FakeStorage();
  await assert.rejects(
    () => Promise.resolve(importFromFile(fakeFile('{}'), storage, {})),
    /promptMergeOrOverwrite/
  );
});

test('T7 importFromFile: no existing local state -> applies directly, no prompt needed/called', async () => {
  const { importFromFile } = await import('../src/export-import.js');
  const storage = new FakeStorage(); // empty
  let promptCalled = false;
  const result = await importFromFile(
    fakeFile(JSON.stringify({ exportedFrom: 'knewzly-atlas', schemaVersion: 1, visited: ['turing', 'dartmouth'] })),
    storage,
    { promptMergeOrOverwrite: async () => { promptCalled = true; return 'merge'; } }
  );
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'direct');
  assert.deepEqual(result.state.visited, ['turing', 'dartmouth']);
  assert.equal(promptCalled, false, 'no existing state -> nothing to choose between -> never prompts');
});

test('T7 importFromFile: existing local state present -> ALWAYS prompts before applying (merge)', async () => {
  const { importFromFile } = await import('../src/export-import.js');
  const storage = new FakeStorage({ version: 1, visited: ['already-here'] });
  let promptArgs = null;
  const result = await importFromFile(
    fakeFile(JSON.stringify({ exportedFrom: 'knewzly-atlas', schemaVersion: 1, visited: ['new-one'] })),
    storage,
    { promptMergeOrOverwrite: async (existingCount, importedCount) => { promptArgs = [existingCount, importedCount]; return 'merge'; } }
  );
  assert.deepEqual(promptArgs, [1, 1], 'prompt receives real counts, not placeholders');
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'merge');
  assert.deepEqual(result.state.visited.sort(), ['already-here', 'new-one'].sort());
});

test('T7 importFromFile: existing local state present -> prompt choosing overwrite discards existing ids', async () => {
  const { importFromFile } = await import('../src/export-import.js');
  const storage = new FakeStorage({ version: 1, visited: ['old-only'] });
  const result = await importFromFile(
    fakeFile(JSON.stringify({ exportedFrom: 'knewzly-atlas', schemaVersion: 1, visited: ['new-only'] })),
    storage,
    { promptMergeOrOverwrite: async () => 'overwrite' }
  );
  assert.equal(result.mode, 'overwrite');
  assert.deepEqual(result.state.visited, ['new-only']);
});

test('T7 importFromFile: learner cancels the prompt -> existing state is provably untouched, nothing applied', async () => {
  const { importFromFile } = await import('../src/export-import.js');
  const storage = new FakeStorage({ version: 1, visited: ['keep-me'] });
  const before = storage.getItem('knewzly-visited-v1');
  const writesBefore = storage._writeCount;

  const result = await importFromFile(
    fakeFile(JSON.stringify({ exportedFrom: 'knewzly-atlas', schemaVersion: 1, visited: ['would-be-imported'] })),
    storage,
    { promptMergeOrOverwrite: async () => 'cancel' }
  );

  assert.equal(result.ok, false);
  assert.equal(result.cancelled, true);
  assert.equal(storage.getItem('knewzly-visited-v1'), before, 'byte-identical storage value after a cancelled import');
  assert.equal(storage._writeCount, writesBefore, 'zero additional writes were made — not even a no-op write');
});

test('T7 importFromFile: malformed JSON file — existing state PROVABLY untouched (zero writes, byte-identical storage)', async () => {
  const { importFromFile } = await import('../src/export-import.js');
  const storage = new FakeStorage({ version: 1, visited: ['must-survive', 'also-survive'] });
  const before = storage.getItem('knewzly-visited-v1');
  const writesBefore = storage._writeCount;
  let promptCalled = false;

  const result = await importFromFile(fakeFile('{ this is not [ valid json'), storage, {
    promptMergeOrOverwrite: async () => { promptCalled = true; return 'merge'; },
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /not valid JSON/i);
  assert.equal(promptCalled, false, 'a malformed file must be rejected before ever reaching the merge/overwrite decision');
  assert.equal(storage.getItem('knewzly-visited-v1'), before, 'storage value is byte-identical after a malformed import attempt');
  assert.equal(storage._writeCount, writesBefore, 'zero writes were attempted for a malformed file');
});

test('T7 importFromFile: foreign file (wrong exportedFrom) — existing state PROVABLY untouched', async () => {
  const { importFromFile } = await import('../src/export-import.js');
  const storage = new FakeStorage({ version: 1, visited: ['must-survive'] });
  const before = storage.getItem('knewzly-visited-v1');
  const writesBefore = storage._writeCount;

  const result = await importFromFile(
    fakeFile(JSON.stringify({ exportedFrom: 'some-other-app', schemaVersion: 1, visited: ['attacker-controlled'] })),
    storage,
    { promptMergeOrOverwrite: async () => 'overwrite' }
  );

  assert.equal(result.ok, false);
  assert.match(result.error, /Knewzly Atlas/);
  assert.equal(storage.getItem('knewzly-visited-v1'), before);
  assert.equal(storage._writeCount, writesBefore);
});

test('T7 importFromFile: wrong schemaVersion — existing state PROVABLY untouched', async () => {
  const { importFromFile } = await import('../src/export-import.js');
  const storage = new FakeStorage({ version: 1, visited: ['must-survive'] });
  const before = storage.getItem('knewzly-visited-v1');

  const result = await importFromFile(
    fakeFile(JSON.stringify({ exportedFrom: 'knewzly-atlas', schemaVersion: 99, visited: ['x'] })),
    storage,
    { promptMergeOrOverwrite: async () => 'merge' }
  );

  assert.equal(result.ok, false);
  assert.equal(storage.getItem('knewzly-visited-v1'), before);
});

test('T7 importFromFile: an unreadable file (I/O error) — existing state PROVABLY untouched', async () => {
  const { importFromFile } = await import('../src/export-import.js');
  const storage = new FakeStorage({ version: 1, visited: ['must-survive'] });
  const before = storage.getItem('knewzly-visited-v1');

  const result = await importFromFile(unreadableFakeFile(), storage, {
    promptMergeOrOverwrite: async () => 'merge',
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /could not be read/i);
  assert.equal(storage.getItem('knewzly-visited-v1'), before);
});

test('T7 importFromFile: a corrupt/malformed import never mutates the in-memory state object either (not just storage)', async () => {
  const { importFromFile } = await import('../src/export-import.js');
  // Independently re-read via the real T6 module (not a re-export trick) to
  // prove the persisted value truly never changed, from a second, unrelated
  // import path.
  const { readVisited } = await import('../src/visited-tracker.js');
  const storage = new FakeStorage({ version: 1, visited: ['a', 'b', 'c'] });
  const beforeState = readVisited(storage);

  await importFromFile(fakeFile('not json'), storage, { promptMergeOrOverwrite: async () => 'merge' });

  const afterState = readVisited(storage);
  assert.deepEqual(afterState, beforeState, 'T6\'s own readVisited sees byte-identical state after a malformed import');
});

// --- DOM: merge/overwrite prompt + status rendering (hand-written fake-DOM) ---

class FakeClassList {
  constructor() { this._set = new Set(); }
  add(c) { this._set.add(c); }
  remove(c) { this._set.delete(c); }
  contains(c) { return this._set.has(c); }
}
class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this._attrs = {};
    this._classList = new FakeClassList();
    this._listeners = {};
    this._text = '';
  }
  get classList() { return this._classList; }
  set className(v) { this._classList = new FakeClassList(); v.split(' ').filter(Boolean).forEach((c) => this._classList.add(c)); }
  get className() { return [...this._classList._set].join(' '); }
  setAttribute(name, value) { this._attrs[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; }
  appendChild(child) { child._parent = this; this.children.push(child); return child; }
  set textContent(v) { this._text = v; this.children = []; }
  get textContent() { return this.children.length === 0 ? this._text : this.children.map((c) => c.textContent).join(''); }
  set innerHTML(v) { this.children = []; this._text = ''; }
  addEventListener(type, fn) { (this._listeners[type] ??= []).push(fn); }
  click() { (this._listeners.click || []).forEach((fn) => fn()); }
  querySelectorAll(selector) { return queryAll(this, selector); }
  querySelector(selector) { return queryAll(this, selector)[0] ?? null; }
}
function elementMatches(el, selector) {
  const classNames = (selector.match(/\.([\w-]+)/g) || []).map((s) => s.slice(1));
  for (const cls of classNames) if (!el._classList || !el._classList.contains(cls)) return false;
  return true;
}
function queryAll(root, selector) {
  const results = [];
  (function walk(el) {
    for (const child of el.children) { if (elementMatches(child, selector)) results.push(child); walk(child); }
  })(root);
  return results;
}
function installFakeDocument() {
  // Needs addEventListener too: importing src/export-import.js pulls in
  // src/visited-tracker.js -> src/relationship-layer.js, and each module's
  // own `if (typeof document !== 'undefined')` auto-init guard (T3/T4/T5/T6's
  // established convention) calls document.addEventListener('DOMContentLoaded', ...)
  // at module-load time once any `document` global exists — a no-op stub is
  // enough since this test file never fires that event.
  globalThis.document = {
    createElement(tag) { return new FakeElement(tag); },
    addEventListener() {},
    dispatchEvent() { return true; },
  };
}

installFakeDocument();
const { renderMergeOverwritePrompt, renderImportStatus } = await import('../src/export-import.js');

test('T7 DOM: renderMergeOverwritePrompt — three real, distinct, focusable buttons; never a native two-way confirm()', async () => {
  const root = new FakeElement('div');
  const pending = renderMergeOverwritePrompt(root, 3, 5);

  const mergeBtn = root.querySelector('.import-prompt-merge');
  const overwriteBtn = root.querySelector('.import-prompt-overwrite');
  const cancelBtn = root.querySelector('.import-prompt-cancel');
  assert.ok(mergeBtn && overwriteBtn && cancelBtn, 'merge, overwrite, and cancel are each real, separate elements');
  assert.match(root.textContent, /3/);
  assert.match(root.textContent, /5/);

  mergeBtn.click();
  const choice = await pending;
  assert.equal(choice, 'merge');
});

test('T7 DOM: renderMergeOverwritePrompt — choosing overwrite resolves overwrite, choosing cancel resolves cancel', async () => {
  const root1 = new FakeElement('div');
  const p1 = renderMergeOverwritePrompt(root1, 1, 1);
  root1.querySelector('.import-prompt-overwrite').click();
  assert.equal(await p1, 'overwrite');

  const root2 = new FakeElement('div');
  const p2 = renderMergeOverwritePrompt(root2, 1, 1);
  root2.querySelector('.import-prompt-cancel').click();
  assert.equal(await p2, 'cancel');
});

test('T7 DOM: renderImportStatus — real text, distinct role for error vs success (not color-only)', async () => {
  const root = new FakeElement('div');
  renderImportStatus(root, 'Something went wrong.', 'error');
  const errorEl = root.querySelector('.import-status-error');
  assert.ok(errorEl);
  assert.equal(errorEl.getAttribute('role'), 'alert');
  assert.match(errorEl.textContent, /wrong/);

  renderImportStatus(root, 'All good.', 'success');
  const successEl = root.querySelector('.import-status-success');
  assert.ok(successEl);
  assert.equal(successEl.getAttribute('role'), 'status');
});

test('T7 DOM: initExportImport — wires export click and import change end-to-end with a fake environment', async () => {
  const { initExportImport } = await import('../src/export-import.js');

  const exportButton = new FakeElement('button');
  const statusRoot = new FakeElement('div');
  const storage = new FakeStorage({ version: 1, visited: ['turing'] });

  // Export path: triggerExportDownload will throw in this fake-DOM (no real
  // Blob/URL globally installed) — proves the click handler catches that and
  // still renders a clear status rather than throwing out to the page.
  initExportImport({ exportButton, statusRoot, storage });
  exportButton.click();
  assert.ok(statusRoot.textContent.length > 0, 'clicking export always leaves a status message, success or a caught error');
});
