// src/export-import.js — Export / Import progress (Task T7)
//
// Builds on top of T6's src/visited-tracker.js (STORAGE_KEY, SCHEMA_VERSION,
// defaultState, readVisited, writeVisited, isStorageAvailable) rather than
// re-implementing any localStorage logic — this module owns only the
// export/import file format and its UI wiring (tasks.md T7 Owned Surfaces:
// src/export-import.*).
//
// Design authority: design.md §5 "Export/Import file" shape
//   { exportedFrom: "knewzly-atlas", schemaVersion: 1, exportedAt: <ISO>, visited: [...] }
// and §9 Edge Cases (malformed file -> reject, existing state untouched;
// valid file + existing state present -> prompt merge/overwrite, never
// silent). requirements.md FR-009, FR-010, NFR-003, US-005.
//
// No framework, no build step (TD-001) — plain ESM, same convention as
// every other src/*.js module in this project.

import { readVisited, writeVisited, defaultState, STORAGE_KEY, SCHEMA_VERSION } from './visited-tracker.js';

export const EXPORTED_FROM = 'knewzly-atlas';
export const EXPORT_SCHEMA_VERSION = 1;

// --- Export --------------------------------------------------------------

/**
 * Pure: builds the export payload from a visited state, per design.md §5's
 * exact shape. Takes `nowIso` as an injectable clock so tests don't depend
 * on wall-clock time.
 *
 * @param {{version: number, visited: string[]}} state
 * @param {() => string} [nowIso]
 */
export function buildExportPayload(state, nowIso = () => new Date().toISOString()) {
  return {
    exportedFrom: EXPORTED_FROM,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: nowIso(),
    visited: [...state.visited],
  };
}

/**
 * Reads current visited state (via T6's readVisited — no duplicated storage
 * logic) and builds the export payload for it.
 *
 * @param {Storage|undefined} storage
 * @param {() => string} [nowIso]
 */
export function buildExportPayloadFromStorage(storage, nowIso) {
  return buildExportPayload(readVisited(storage), nowIso);
}

/**
 * Triggers a real file download of `payload` as pretty-printed JSON, using
 * the standard browser pattern: Blob -> object URL -> a clicked, removed
 * `<a download>`. Every browser API is injectable so this can be proven with
 * a fake-DOM/fake-Blob harness under `node:test` (no live browser this
 * session — see test file header for the same honestly-flagged limitation
 * every prior task hit).
 *
 * @param {object} payload
 * @param {{
 *   documentRef?: Document,
 *   BlobCtor?: typeof Blob,
 *   urlApi?: { createObjectURL: (b: any) => string, revokeObjectURL: (u: string) => void },
 *   filename?: string,
 * }} [opts]
 */
export function triggerExportDownload(payload, opts = {}) {
  const documentRef = opts.documentRef ?? (typeof document !== 'undefined' ? document : undefined);
  const BlobCtor = opts.BlobCtor ?? (typeof Blob !== 'undefined' ? Blob : undefined);
  const urlApi = opts.urlApi ?? (typeof URL !== 'undefined' ? URL : undefined);
  if (!documentRef || !BlobCtor || !urlApi || typeof urlApi.createObjectURL !== 'function') {
    throw new Error('triggerExportDownload requires document/Blob/URL.createObjectURL — none available and none injected.');
  }
  const filename = opts.filename ?? `knewzly-atlas-progress-${payload.exportedAt.slice(0, 10)}.json`;
  const json = JSON.stringify(payload, null, 2);
  const blob = new BlobCtor([json], { type: 'application/json' });
  const url = urlApi.createObjectURL(blob);
  const anchor = documentRef.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', filename);
  if (documentRef.body && typeof documentRef.body.appendChild === 'function') {
    documentRef.body.appendChild(anchor);
  }
  anchor.click();
  if (documentRef.body && typeof documentRef.body.removeChild === 'function' && anchor._parent) {
    documentRef.body.removeChild(anchor);
  }
  if (typeof urlApi.revokeObjectURL === 'function') urlApi.revokeObjectURL(url);
  return { url, filename, json };
}

/**
 * Full export orchestrator: read state -> build payload -> trigger download.
 *
 * @param {Storage|undefined} storage
 * @param {object} [downloadOpts]
 */
export function exportVisited(storage, downloadOpts) {
  const payload = buildExportPayloadFromStorage(storage);
  return triggerExportDownload(payload, downloadOpts);
}

// --- Import: validation (never touches storage) ---------------------------

/**
 * Pure: parses raw text as JSON. Never throws — returns a result object so
 * callers can fail safely on any malformed/corrupt input.
 *
 * @param {string} text
 * @returns {{ ok: true, data: any } | { ok: false, error: string }}
 */
export function parseImportJson(text) {
  try {
    const data = JSON.parse(text);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: 'That file is not valid JSON and could not be read.' };
  }
}

/**
 * Pure: validates a parsed import payload against design.md §5's shape
 * BEFORE anything is allowed to touch existing state. Checks
 * `exportedFrom === "knewzly-atlas"`, `schemaVersion === 1`, and that
 * `visited` is an array of strings — foreign or malformed shapes are all
 * rejected with a clear, specific reason.
 *
 * @param {any} data
 * @returns {{ ok: true, visited: string[] } | { ok: false, error: string }}
 */
export function validateImportPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'That file does not look like a Knewzly Atlas progress file.' };
  }
  if (data.exportedFrom !== EXPORTED_FROM) {
    return { ok: false, error: 'That file was not exported from the Knewzly Atlas (unrecognized source) and was not imported.' };
  }
  if (data.schemaVersion !== EXPORT_SCHEMA_VERSION) {
    return { ok: false, error: `That file uses an unsupported version (expected ${EXPORT_SCHEMA_VERSION}) and was not imported.` };
  }
  if (!Array.isArray(data.visited) || !data.visited.every((id) => typeof id === 'string')) {
    return { ok: false, error: 'That file is missing a valid visited-anchor list and was not imported.' };
  }
  return { ok: true, visited: [...data.visited] };
}

/**
 * Pure: parse + validate in one step — the single gate every import path
 * (file input, drag-drop, programmatic) must go through before any existing
 * state is touched.
 *
 * @param {string} text
 * @returns {{ ok: true, visited: string[] } | { ok: false, error: string }}
 */
export function parseAndValidateImportText(text) {
  const parsed = parseImportJson(text);
  if (!parsed.ok) return parsed;
  return validateImportPayload(parsed.data);
}

// --- Import: applying a validated payload ----------------------------------

/**
 * Pure: union of two id lists, deduped, existing ids first (order-preserving)
 * then any new imported ids in their original order.
 *
 * @param {string[]} existingIds
 * @param {string[]} importedIds
 */
export function mergeVisitedIds(existingIds, importedIds) {
  const merged = [...existingIds];
  for (const id of importedIds) {
    if (!merged.includes(id)) merged.push(id);
  }
  return merged;
}

/**
 * Pure: overwrite — the imported set becomes the new state (deduped,
 * order-preserving), existing ids are discarded.
 *
 * @param {string[]} importedIds
 */
export function overwriteVisitedIds(importedIds) {
  const result = [];
  for (const id of importedIds) {
    if (!result.includes(id)) result.push(id);
  }
  return result;
}

/**
 * Applies a validated imported id list against current state using the
 * chosen mode, and persists the result via T6's writeVisited (no duplicated
 * storage logic). Returns the new state and whether the write actually
 * succeeded, mirroring T6's markVisited return shape.
 *
 * @param {Storage|undefined} storage
 * @param {'merge'|'overwrite'} mode
 * @param {{version: number, visited: string[]}} existingState
 * @param {string[]} importedIds
 */
export function applyImport(storage, mode, existingState, importedIds) {
  if (mode !== 'merge' && mode !== 'overwrite') {
    throw new Error(`applyImport: mode must be "merge" or "overwrite", got ${JSON.stringify(mode)}`);
  }
  const visited = mode === 'merge' ? mergeVisitedIds(existingState.visited, importedIds) : overwriteVisitedIds(importedIds);
  const state = { version: SCHEMA_VERSION, visited };
  const persisted = writeVisited(storage, state);
  return { state, persisted };
}

// --- Import: reading a File --------------------------------------------

/**
 * Reads a browser File/Blob's contents as text. Prefers the modern
 * `file.text()` method (standard on File since it extends Blob); falls back
 * to FileReader for older environments. Never throws directly — callers get
 * a plain string or must catch a rejection and treat it as "unreadable file"
 * (the same malformed-file path as bad JSON).
 *
 * @param {File|Blob|{text: () => Promise<string>}} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  if (file && typeof file.text === 'function') {
    return file.text();
  }
  if (typeof FileReader !== 'undefined' && file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
      reader.readAsText(file);
    });
  }
  return Promise.reject(new Error('No way to read this file as text (no .text() and no FileReader available).'));
}

/**
 * Full import orchestrator (FR-010/US-005): read the file -> parse+validate
 * (never touching storage until this passes) -> if existing local state has
 * entries, ask the caller-supplied `promptMergeOrOverwrite` which mode to
 * use (never silently picks one) -> apply and persist.
 *
 * On any failure (unreadable file, malformed JSON, wrong exportedFrom/
 * schemaVersion, wrong shape) this function returns a `{ ok: false, error }`
 * result WITHOUT calling `writeVisited` at all — existing state is
 * mechanically untouched, not just "should be" untouched, because the write
 * call is never reached.
 *
 * @param {File|Blob|{text: () => Promise<string>}} file
 * @param {Storage|undefined} storage
 * @param {{
 *   promptMergeOrOverwrite: (existingCount: number, importedCount: number) => Promise<'merge'|'overwrite'|'cancel'>,
 * }} opts
 * @returns {Promise<
 *   | { ok: true, mode: 'merge'|'overwrite'|'direct', state: object, persisted: boolean }
 *   | { ok: false, error: string, cancelled?: boolean }
 * >}
 */
export async function importFromFile(file, storage, opts) {
  if (!opts || typeof opts.promptMergeOrOverwrite !== 'function') {
    throw new Error('importFromFile requires opts.promptMergeOrOverwrite — import must never silently pick merge or overwrite.');
  }

  let text;
  try {
    text = await readFileAsText(file);
  } catch (err) {
    return { ok: false, error: 'That file could not be read.' };
  }

  const validated = parseAndValidateImportText(text);
  if (!validated.ok) {
    // Validation failed BEFORE any storage read/write below runs — existing
    // state is provably untouched (see test/export-import.test.js).
    return { ok: false, error: validated.error };
  }

  const existingState = readVisited(storage);

  if (existingState.visited.length === 0) {
    // Nothing to merge or overwrite — apply directly (design.md §5: prompt
    // only "when existing visited state is present").
    const { state, persisted } = applyImport(storage, 'overwrite', existingState, validated.visited);
    return { ok: true, mode: 'direct', state, persisted };
  }

  const choice = await opts.promptMergeOrOverwrite(existingState.visited.length, validated.visited.length);
  if (choice !== 'merge' && choice !== 'overwrite') {
    // Learner cancelled (or the prompt returned anything else) — never
    // silently apply either mode; leave existing state exactly as it was.
    return { ok: false, error: 'Import cancelled — existing progress was not changed.', cancelled: true };
  }

  const { state, persisted } = applyImport(storage, choice, existingState, validated.visited);
  return { ok: true, mode: choice, state, persisted };
}

// --- DOM: minimal accessible UI (export button, import control, prompt) ---

/**
 * Renders the merge/overwrite prompt as three real, focusable buttons
 * (Merge / Overwrite / Cancel) into `root` — not a native `confirm()`, which
 * can't express a three-way choice, and not silently defaulted. Resolves
 * with the learner's choice.
 *
 * @param {HTMLElement} root
 * @param {number} existingCount
 * @param {number} importedCount
 * @returns {Promise<'merge'|'overwrite'|'cancel'>}
 */
export function renderMergeOverwritePrompt(root, existingCount, importedCount) {
  return new Promise((resolve) => {
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'import-prompt';
    wrap.setAttribute('role', 'alertdialog');
    wrap.setAttribute('aria-label', 'Choose how to import your progress');

    const message = document.createElement('p');
    message.textContent =
      `You already have ${existingCount} visited ${existingCount === 1 ? 'anchor' : 'anchors'} saved on this device, ` +
      `and this file has ${importedCount}. Merge keeps both. Overwrite replaces your current progress with the file's.`;
    wrap.appendChild(message);

    const makeButton = (label, value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.className = `import-prompt-${value}`;
      button.addEventListener('click', () => {
        root.innerHTML = '';
        resolve(value);
      });
      wrap.appendChild(button);
      return button;
    };

    makeButton('Merge (keep both)', 'merge');
    makeButton('Overwrite (use file only)', 'overwrite');
    makeButton('Cancel', 'cancel');

    root.appendChild(wrap);
  });
}

/**
 * Renders a plain-text status/error message (FR-010's "clear message" on
 * rejection, or a success confirmation) into `root`, real DOM text — not a
 * color-only or icon-only indicator.
 *
 * @param {HTMLElement} root
 * @param {string} message
 * @param {'error'|'success'} kind
 */
export function renderImportStatus(root, message, kind = 'success') {
  if (!root) return;
  root.innerHTML = '';
  const p = document.createElement('p');
  p.className = `import-status import-status-${kind}`;
  p.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  p.textContent = message;
  root.appendChild(p);
}

/**
 * Wires the export button and the import file input on the page, using
 * `renderMergeOverwritePrompt` for the merge/overwrite choice and
 * `renderImportStatus` for the resulting message. Purely additive — does
 * not touch T3/T5/T6's own markup or listeners.
 *
 * @param {{
 *   exportButton?: HTMLElement,
 *   importInput?: HTMLElement,
 *   promptRoot?: HTMLElement,
 *   statusRoot?: HTMLElement,
 *   storage?: Storage,
 * }} opts
 */
export function initExportImport({
  exportButton,
  importInput,
  promptRoot,
  statusRoot,
  storage = typeof localStorage !== 'undefined' ? localStorage : undefined,
} = {}) {
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      try {
        exportVisited(storage);
        renderImportStatus(statusRoot, 'Your progress was downloaded as a JSON file.', 'success');
      } catch (err) {
        renderImportStatus(statusRoot, 'Sorry — the export download could not be started in this browser.', 'error');
      }
    });
  }

  if (importInput) {
    importInput.addEventListener('change', async () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;
      const result = await importFromFile(file, storage, {
        promptMergeOrOverwrite: (existingCount, importedCount) =>
          promptRoot ? renderMergeOverwritePrompt(promptRoot, existingCount, importedCount) : Promise.resolve('cancel'),
      });
      if (!result.ok) {
        renderImportStatus(statusRoot, result.error, 'error');
      } else {
        renderImportStatus(statusRoot, `Import complete — you now have ${result.state.visited.length} visited anchors saved.`, 'success');
      }
      importInput.value = '';
    });
  }
}

// Auto-initialize when loaded directly by the browser as a page module
// (mirrors T3/T4/T5/T6/T9's identical guard — a no-op under `node --test`,
// which never defines a global `document`).
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const exportButton = document.getElementById('export-progress-button');
    const importInput = document.getElementById('import-progress-input');
    if (!exportButton && !importInput) return;
    initExportImport({
      exportButton,
      importInput,
      promptRoot: document.getElementById('import-prompt-root'),
      statusRoot: document.getElementById('import-status-root'),
    });
  });
}
