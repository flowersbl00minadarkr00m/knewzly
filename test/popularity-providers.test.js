import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GDELT_QUERIES,
  fetchGdeltEvidence,
  fetchHackerNewsEvidence,
  fetchJsonBounded,
} from '../src/popularity-providers.js';
import { buildWeeklyLedger } from '../src/weekly-momentum.js';

const NOW = '2026-08-31T18:00:00.000Z';
const gdeltFixture = JSON.parse(await readFile(new URL('../content/fixtures/providers/gdelt.json', import.meta.url), 'utf8'));
const hnFixture = JSON.parse(await readFile(new URL('../content/fixtures/providers/hacker-news.json', import.meta.url), 'utf8'));

function jsonResponse(value, init) {
  return new Response(JSON.stringify(value), { status: 200, headers: { 'content-type': 'application/json' }, ...init });
}

test('GDELT uses exactly six reviewed HTTPS queries and retains only accepted evidence fields', async () => {
  const urls = [];
  const result = await fetchGdeltEvidence({
    now: NOW,
    fetchImpl: async (url, options) => {
      urls.push([String(url), options]);
      return jsonResponse(gdeltFixture);
    },
  });
  assert.equal(GDELT_QUERIES.length, 6);
  assert.equal(urls.length, 6);
  assert.ok(urls.every(([url, options]) => url.startsWith('https://api.gdeltproject.org/api/v2/doc/doc?') && options.redirect === 'error'));
  assert.equal(result.status, 'ok');
  assert.equal(result.articles.length, 6);
  assert.deepEqual(Object.keys(result.articles[0]).sort(), ['domain', 'language', 'seendate', 'sourcecountry', 'title', 'url']);
  assert.equal(result.articles[0].url.includes('utm_source'), false);
});

test('GDELT returns unavailable for timeout, non-2xx, redirect, oversized, malformed, and unsafe responses without throwing', async () => {
  const badFetches = [
    async () => { throw new DOMException('timed out', 'AbortError'); },
    async () => new Response('{}', { status: 503 }),
    async () => Object.assign(jsonResponse({ articles: [] }), { redirected: true }),
    async () => new Response('{"articles":[]}', { status: 200, headers: { 'content-length': String(3 * 1024 * 1024) } }),
    async () => new Response('not json', { status: 200 }),
    async () => jsonResponse({ articles: [{ url: 'http://unsafe.example/story', title: 'Unsafe' }] }),
  ];
  for (const fetchImpl of badFetches) {
    const result = await fetchGdeltEvidence({ fetchImpl, now: NOW });
    assert.equal(result.status, 'unavailable');
    assert.equal(result.articles.length, 0);
  }
});

test('GDELT marks five-of-six query failures unavailable and reports attempted versus successful counts truthfully', async () => {
  let call = 0;
  const result = await fetchGdeltEvidence({
    now: NOW,
    fetchImpl: async () => (++call === 1 ? jsonResponse(gdeltFixture) : new Response('{}', { status: 500 })),
  });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.articles.length, 0);
  assert.equal(result.attemptedQueries, 6);
  assert.equal(result.successfulQueries, 1);
  assert.equal(result.itemStates.failedQueries, 5);
});

test('GDELT derives coverage domains from canonical URLs, so spoofed response domains cannot inflate breadth', async () => {
  let call = 0;
  const result = await fetchGdeltEvidence({
    now: NOW,
    fetchImpl: async () => jsonResponse({
      articles: [{
        ...gdeltFixture.articles[0],
        url: 'https://same-host.example/atlas',
        title: 'Atlas model release',
        domain: `spoof-${++call}.example`,
      }],
    }),
  });
  assert.equal(result.status, 'ok');
  assert.ok(result.articles.every((article) => article.domain === 'same-host.example'));
  const document = buildWeeklyLedger({
    now: NOW,
    gdeltResults: result.articles,
    hackerNewsItems: [],
    providerStates: { gdelt: { status: 'ok', sampledAt: NOW, queryCount: 6 }, hackerNews: { status: 'unavailable' } },
    todayStories: {
      stories: [{
        id: 'canonical-story', category: 'models', headline: 'Atlas model release',
        source: { name: 'Canonical', url: 'https://canonical.example/atlas', publishedDate: '2026-08-31T12:00:00.000Z' },
      }],
    },
  });
  assert.equal(document.entries[0].signals.coverage.independentOutletCount, 2);
});

test('HN caps beststories at 300, fetches with concurrency ten, filters unsafe/out-of-window/dead records, and labels item states', async () => {
  const ids = Array.from({ length: 305 }, (_, index) => index + 1);
  let inFlight = 0;
  let maximum = 0;
  const result = await fetchHackerNewsEvidence({
    now: NOW,
    fetchImpl: async (url) => {
      const path = String(url);
      if (path.endsWith('beststories.json')) return jsonResponse(ids);
      inFlight += 1;
      maximum = Math.max(maximum, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight -= 1;
      const id = Number(path.match(/item\/(\d+)\.json/)?.[1]);
      if (id === 2) return jsonResponse({ ...hnFixture.items['102'], id, dead: true });
      if (id === 3) return jsonResponse({ id, type: 'story', time: 1, title: 'Old', url: 'https://example.test/old', score: 0, descendants: 0 });
      if (id === 4) return jsonResponse({ id, type: 'story', time: 1788177600, title: 'Unsafe', url: 'http://example.test/unsafe', score: 1, descendants: 0 });
      return jsonResponse({ ...hnFixture.items['101'], id, url: `https://example.test/${id}` });
    },
  });
  assert.equal(result.status, 'ok');
  assert.equal(result.sampledIds, 300);
  assert.ok(maximum <= 10);
  assert.equal(result.itemStates.dead, 1);
  assert.equal(result.itemStates.outsideWindow, 1);
  assert.equal(result.itemStates.unsafeUrl, 1);
  assert.equal(result.items.length, 297);
  assert.deepEqual(Object.keys(result.items[0]).sort(), ['descendants', 'id', 'score', 'title', 'url']);
});

test('HN beststories or item-request failures are unavailable rather than healthy partial samples', async () => {
  const unavailable = await fetchHackerNewsEvidence({ fetchImpl: async () => new Response('{}', { status: 500 }), now: NOW });
  assert.equal(unavailable.status, 'unavailable');

  const partial = await fetchHackerNewsEvidence({
    now: NOW,
    fetchImpl: async (url) => String(url).endsWith('beststories.json')
      ? jsonResponse([1, 2])
      : String(url).includes('/1.json') ? jsonResponse({ ...hnFixture.items['101'], id: 1 }) : new Response('{}', { status: 500 }),
  });
  assert.equal(partial.status, 'unavailable');
  assert.equal(partial.items.length, 0);
  assert.equal(partial.itemStates.failed, 1);
  assert.equal(partial.successfulItemRequests, 1);

  const allFailed = await fetchHackerNewsEvidence({
    now: NOW,
    fetchImpl: async (url) => String(url).endsWith('beststories.json') ? jsonResponse([1, 2]) : new Response('{}', { status: 500 }),
  });
  assert.equal(allFailed.status, 'unavailable');
  assert.equal(allFailed.items.length, 0);
  assert.equal(allFailed.itemStates.failed, 2);
});

test('shared network reader rejects non-HTTPS URLs before a request is made', async () => {
  await assert.rejects(fetchJsonBounded('http://example.test/nope', { fetchImpl: async () => { throw new Error('must not fetch'); } }), /HTTPS/);
});

test('shared network reader aborts a genuinely hung fetch at the configured timeout', async () => {
  let aborted = false;
  await assert.rejects(
    fetchJsonBounded('https://example.test/hung', {
      timeoutMs: 10,
      fetchImpl: (_url, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => {
        aborted = true;
        reject(new DOMException('request timed out', 'AbortError'));
      }, { once: true })),
    }),
    /timed out/,
  );
  assert.equal(aborted, true);
});

test('shared network reader cancels a chunked response that exceeds the limit without content-length', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(8));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    fetchJsonBounded('https://example.test/chunked', {
      maxBytes: 12,
      fetchImpl: async () => new Response(stream, { status: 200, headers: { 'content-type': 'application/json' } }),
    }),
    /exceeds 12 byte limit/,
  );
  assert.equal(cancelled, true);
});
