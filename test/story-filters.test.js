// test/story-filters.test.js — coverage for src/story-filters.js (pure
// logic) and src/section-nav.js (DOM), the Today panel category filters
// (FR-014/D-013).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  getAvailableCategories,
  filterStoriesByCategory,
  CATEGORY_LABELS,
  ALL_CATEGORIES_ID,
} from '../src/story-filters.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('getAvailableCategories', async (t) => {
  await t.test('always starts with an "All" chip', () => {
    const result = getAvailableCategories([]);
    assert.deepEqual(result, [{ id: ALL_CATEGORIES_ID, label: 'All' }]);
  });

  await t.test('includes only categories that actually appear in the given stories', () => {
    const stories = [{ category: 'research' }, { category: 'models' }, { category: 'research' }];
    const result = getAvailableCategories(stories);
    assert.deepEqual(result.map((c) => c.id), ['all', 'models', 'research']);
  });

  await t.test('never produces a chip for a category with zero stories', () => {
    const result = getAvailableCategories([{ category: 'research' }]);
    assert.ok(!result.some((c) => c.id === 'labor'), 'labor has no stories, so no chip for it');
  });

  await t.test('an unrecognized category still gets a chip (falls back to its raw id as the label)', () => {
    const result = getAvailableCategories([{ category: 'mystery-category' }]);
    const chip = result.find((c) => c.id === 'mystery-category');
    assert.ok(chip);
    assert.equal(chip.label, 'mystery-category');
  });

  await t.test('stories with no category set are ignored, not turned into a blank chip', () => {
    const result = getAvailableCategories([{}, { category: '' }, { category: undefined }]);
    assert.deepEqual(result, [{ id: ALL_CATEGORIES_ID, label: 'All' }]);
  });
});

test('filterStoriesByCategory', async (t) => {
  const stories = [
    { id: 'a', category: 'models' },
    { id: 'b', category: 'research' },
    { id: 'c', category: 'models' },
  ];

  await t.test('"all" (or no id) returns every story, unfiltered', () => {
    assert.deepEqual(filterStoriesByCategory(stories, 'all'), stories);
    assert.deepEqual(filterStoriesByCategory(stories, undefined), stories);
  });

  await t.test('a real category id returns only matching stories', () => {
    const result = filterStoriesByCategory(stories, 'models');
    assert.deepEqual(result.map((s) => s.id), ['a', 'c']);
  });

  await t.test('a category with zero matches returns an empty array, not an error', () => {
    assert.deepEqual(filterStoriesByCategory(stories, 'labor'), []);
  });

  await t.test('a missing/null stories array fails toward an empty list, not a throw', () => {
    assert.deepEqual(filterStoriesByCategory(null, 'models'), []);
  });
});

test('CATEGORY_LABELS stays in sync with content/category-keywords.json\'s real seed vocabulary', () => {
  // Regression guard: a filter chip's label and a story's real seeded
  // category (scripts/categorize-story.js) must never drift apart —
  // every CATEGORY_LABELS key should be a real category-keywords.json key.
  const keywordMap = JSON.parse(
    readFileSync(path.join(__dirname, '../content/category-keywords.json'), 'utf8'),
  );
  const realCategoryIds = new Set(Object.keys(keywordMap.categories));
  for (const id of Object.keys(CATEGORY_LABELS)) {
    assert.ok(realCategoryIds.has(id), `CATEGORY_LABELS has "${id}" but content/category-keywords.json's categories does not`);
  }
});

// --- DOM tests for section-nav.js ---------------------------------------

class FakeClassList {
  constructor() { this._set = new Set(); }
  add(c) { this._set.add(c); }
  toString() { return [...this._set].join(' '); }
}

class FakeElement {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this._attrs = {};
    this.dataset = {};
    this._classList = new FakeClassList();
    this._listeners = {};
    this._text = '';
  }
  get classList() { return this._classList; }
  set className(v) {
    this._classList = new FakeClassList();
    v.split(' ').filter(Boolean).forEach((c) => this._classList.add(c));
  }
  setAttribute(name, value) { this._attrs[name] = String(value); }
  getAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name) ? this._attrs[name] : null; }
  appendChild(child) { this.children.push(child); return child; }
  set textContent(v) { this._text = v; this.children = []; }
  get textContent() {
    if (this.children.length === 0) return this._text;
    return this.children.map((c) => c.textContent).join('');
  }
  set innerHTML(v) { this.children = []; this._text = ''; }
  addEventListener(type, fn) { (this._listeners[type] ??= []).push(fn); }
  click() { (this._listeners.click || []).forEach((fn) => fn()); }
}

globalThis.document = {
  createElement(tag) { return new FakeElement(tag); },
};

const { renderSectionNav } = await import('../src/section-nav.js');

test('renderSectionNav', async (t) => {
  const categories = [
    { id: 'all', label: 'All' },
    { id: 'models', label: 'Models' },
    { id: 'research', label: 'Research' },
  ];

  await t.test('renders one real, focusable button per category with real text labels', () => {
    const container = new FakeElement('nav');
    renderSectionNav(container, categories, 'all', () => {});
    assert.equal(container.children.length, 3);
    assert.deepEqual(container.children.map((b) => b.textContent), ['All', 'Models', 'Research']);
    assert.ok(container.children.every((b) => b.tagName === 'button'));
  });

  await t.test('the active category is exposed via aria-pressed, not color alone', () => {
    const container = new FakeElement('nav');
    renderSectionNav(container, categories, 'models', () => {});
    const pressed = container.children.filter((b) => b.getAttribute('aria-pressed') === 'true');
    assert.equal(pressed.length, 1);
    assert.equal(pressed[0].dataset.filter, 'models');
    assert.equal(container.children.find((b) => b.dataset.filter === 'all').getAttribute('aria-pressed'), 'false');
  });

  await t.test('clicking a chip calls onSelect with that chip\'s category id', () => {
    const container = new FakeElement('nav');
    const selected = [];
    renderSectionNav(container, categories, 'all', (id) => selected.push(id));
    container.children.find((b) => b.dataset.filter === 'research').click();
    assert.deepEqual(selected, ['research']);
  });

  await t.test('re-rendering replaces the previous chips rather than appending to them', () => {
    const container = new FakeElement('nav');
    renderSectionNav(container, categories, 'all', () => {});
    renderSectionNav(container, [{ id: 'all', label: 'All' }], 'all', () => {});
    assert.equal(container.children.length, 1);
  });
});
