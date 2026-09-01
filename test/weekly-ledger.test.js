import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.className = '';
    this._text = '';
  }

  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = children; this._text = ''; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this.children.length ? this.children.map((child) => child.textContent).join('') : this._text; }
  querySelectorAll(selector) { return descendants(this).filter((element) => matches(element, selector)); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

class FakeDocument {
  createElement(tagName) { return new FakeElement(tagName, this); }
}

function descendants(root) {
  const found = [];
  for (const child of root.children) {
    found.push(child, ...descendants(child));
  }
  return found;
}

function matches(element, selector) {
  const attribute = selector.match(/\[([^=\]]+)(?:="([^"]*)")?\]/);
  const tag = selector.replace(/\[[^\]]+\]/g, '').replace(/^\./, '');
  const tagMatches = !tag || (selector.startsWith('.') ? element.className.split(/\s+/).includes(tag) : element.tagName === tag.toUpperCase());
  if (!tagMatches) return false;
  return !attribute || (element.getAttribute(attribute[1]) !== null && (attribute[2] === undefined || element.getAttribute(attribute[1]) === attribute[2]));
}

function root() {
  const document = new FakeDocument();
  return { document, container: document.createElement('div') };
}

function todayStories() {
  return [{
    id: 'fixture-story-turing', category: 'research', headline: 'Canonical fixture headline',
    source: { name: 'Canonical source', url: 'https://example.test/story', publishedDate: '2026-08-31' },
    traceToAnchors: ['turing'], traceLabel: 'Turing’s machine question',
  }, {
    id: 'fixture-story-no-trace', category: 'policy', headline: 'A verylongunbrokentokenfortheledgerwithoutanyspaces',
    source: { name: 'Another source', url: 'https://example.test/no-trace', publishedDate: '2026-08-30' }, traceToAnchors: [],
  }];
}

async function fixture() {
  return JSON.parse(await readFile(new URL('../content/fixtures/popular-this-week.json', import.meta.url), 'utf8'));
}

test('Weekly Ledger joins only canonical Today stories into an ordered, source-aware semantic surface', async () => {
  const { renderWeeklyLedger } = await import('../src/weekly-ledger.js');
  const { container } = root();
  renderWeeklyLedger(container, await fixture(), todayStories(), { now: '2026-08-31T20:00:00.000Z' });

  const section = container.querySelector('section');
  assert.equal(section.getAttribute('data-weekly-ledger-state'), 'fresh');
  assert.equal(section.querySelector('h2').textContent, 'Popular This Week');
  assert.equal(section.querySelector('details').querySelector('summary').textContent, 'How this weekly momentum list is built');
  assert.match(section.textContent, /Last attempted update: 2026-08-31T18:00:00.000Z/);
  assert.match(section.textContent, /Last successful update: 2026-08-31T18:00:00.000Z/);
  const item = section.querySelector('li');
  assert.equal(item.querySelector('article').getAttribute('data-global-rank'), '1');
  assert.match(item.textContent, /Rank 1/);
  assert.match(item.textContent, /Canonical fixture headline/);
  assert.match(item.textContent, /Observed sampled coverage: 14 independent outlets/);
  assert.match(item.textContent, /Hacker News: 624 points · 183 comments/);
  assert.doesNotMatch(item.textContent, /0\.82|score/i);
  assert.equal(item.querySelector('a[href="atlas.html?anchor=turing"]').textContent, 'Trace to origin: Turing’s machine question');
});

test('Weekly Ledger degrades unresolved references and shows explicit missing evidence without treating it as zero', async () => {
  const { renderWeeklyLedger } = await import('../src/weekly-ledger.js');
  const document = await fixture();
  document.status = 'partial';
  document.providers.hackerNews.status = 'error';
  document.entries[0].signals.hackerNews = { state: 'provider_unavailable' };
  document.entries.push({ ...structuredClone(document.entries[0]), rank: 2, leadStoryId: 'removed-story', memberStoryIds: ['removed-story'] });
  const diagnostics = { messages: [], warn(message) { this.messages.push(message); } };
  const { container } = root();
  renderWeeklyLedger(container, document, todayStories(), { now: '2026-08-31T20:00:00.000Z', diagnostics });

  const section = container.querySelector('section');
  assert.equal(section.getAttribute('data-weekly-ledger-state'), 'partial');
  assert.match(section.textContent, /reduced evidence basis/i);
  assert.match(section.textContent, /Hacker News: unavailable/);
  assert.doesNotMatch(section.textContent, /Hacker News: 0/);
  assert.equal(section.querySelector('ol').children.length, 1);
  assert.match(diagnostics.messages[0], /1 unresolved/i);
});

test('Weekly Ledger requires every member reference to resolve before rendering an entry', async () => {
  const { renderWeeklyLedger } = await import('../src/weekly-ledger.js');
  const document = await fixture();
  document.entries[0].memberStoryIds.push('missing-member-story');
  const diagnostics = { messages: [], warn(message) { this.messages.push(message); } };
  const { container } = root();
  renderWeeklyLedger(container, document, todayStories(), { now: '2026-08-31T20:00:00.000Z', diagnostics });

  assert.equal(container.querySelector('section').getAttribute('data-weekly-ledger-state'), 'unavailable');
  assert.equal(container.querySelectorAll('ol').length, 0);
  assert.match(diagnostics.messages[0], /missing-member-story/);
});

test('Weekly Ledger visibly exposes both update timestamps for a published partial edition', async () => {
  const { renderWeeklyLedger } = await import('../src/weekly-ledger.js');
  const document = await fixture();
  document.status = 'partial';
  const { container } = root();
  renderWeeklyLedger(container, document, todayStories(), { now: '2026-08-31T20:00:00.000Z' });
  assert.match(container.textContent, /Last attempted update: 2026-08-31T18:00:00.000Z/);
  assert.match(container.textContent, /Last successful update: 2026-08-31T18:00:00.000Z/);
});

test('Weekly Ledger filter keeps global ranks, preserves no-trace stories, and announces scoped empty states politely', async () => {
  const { renderWeeklyLedger } = await import('../src/weekly-ledger.js');
  const document = await fixture();
  document.entries.push({
    ...structuredClone(document.entries[0]), rank: 4, leadStoryId: 'fixture-story-no-trace', memberStoryIds: ['fixture-story-no-trace'], category: 'policy',
  });
  const { container } = root();
  renderWeeklyLedger(container, document, todayStories(), { now: '2026-08-31T20:00:00.000Z', category: 'policy' });

  const status = container.querySelector('[aria-live="polite"]');
  assert.equal(status.textContent, 'Showing 1 weekly entries in policy.');
  const article = container.querySelector('article');
  assert.equal(article.getAttribute('data-global-rank'), '4');
  assert.equal(container.querySelector('ol').children[0].value, 4, 'the semantic ordered-list value remains the global rank');
  assert.match(article.textContent, /verylongunbrokentokenfortheledgerwithoutanyspaces/);
  assert.match(article.className, /weekly-ledger-wrap-anywhere/);
  assert.equal(article.querySelector('.weekly-ledger-trace'), null, 'an honest no-trace story has no invented action');

  renderWeeklyLedger(container, document, todayStories(), { now: '2026-08-31T20:00:00.000Z', category: 'compute' });
  const updatedStatus = container.querySelector('[aria-live="polite"]');
  assert.strictEqual(updatedStatus, status, 'an already-mounted live region is updated rather than replaced');
  assert.equal(updatedStatus.textContent, 'Showing 0 weekly entries in compute.');
  assert.match(container.textContent, /No weekly entries are available in compute/);
  assert.equal(container.querySelectorAll('ol').length, 0);
});

test('Weekly Ledger aging suppresses rankings after 24 hours and exposes reduced-motion and wrapping hooks', async () => {
  const { effectiveLedgerState, renderWeeklyLedger } = await import('../src/weekly-ledger.js');
  const document = await fixture();
  assert.equal(effectiveLedgerState(document, { now: '2026-09-01T07:00:00.000Z' }).status, 'partial');
  const agingRoot = root();
  renderWeeklyLedger(agingRoot.container, document, todayStories(), { now: '2026-09-01T07:00:00.000Z' });
  assert.match(agingRoot.container.textContent, /last attempted at 2026-08-31T18:00:00.000Z/i);
  assert.equal(effectiveLedgerState(document, { now: '2026-09-02T19:00:00.000Z' }).status, 'unavailable');

  const { container } = root();
  renderWeeklyLedger(container, document, todayStories(), { now: '2026-09-02T19:00:00.000Z', reducedMotion: true });
  const section = container.querySelector('section');
  assert.equal(section.getAttribute('data-weekly-ledger-state'), 'unavailable');
  assert.equal(section.getAttribute('data-reduced-motion'), 'true');
  assert.equal(section.querySelectorAll('li').length, 0);
  assert.match(section.textContent, /older than 24 hours/i);
});

test('Weekly Ledger leaves all DOM outside the supplied container untouched and performs no fetch', async () => {
  const { renderWeeklyLedger } = await import('../src/weekly-ledger.js');
  const { document, container } = root();
  const outside = document.createElement('p');
  outside.textContent = 'Today content remains intact';
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = () => { fetchCalls += 1; throw new Error('renderer must not fetch'); };
  try {
    renderWeeklyLedger(container, await fixture(), todayStories(), { now: '2026-08-31T20:00:00.000Z' });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(outside.textContent, 'Today content remains intact');
  assert.equal(fetchCalls, 0);
});

test('Weekly Ledger treats an empty published edition as unavailable instead of a blank ranking', async () => {
  const { renderWeeklyLedger } = await import('../src/weekly-ledger.js');
  const document = await fixture();
  document.entries = [];
  const { container } = root();
  renderWeeklyLedger(container, document, todayStories(), { now: '2026-08-31T20:00:00.000Z' });
  assert.equal(container.querySelector('section').getAttribute('data-weekly-ledger-state'), 'unavailable');
  assert.match(container.textContent, /rankings are hidden/i);
});
