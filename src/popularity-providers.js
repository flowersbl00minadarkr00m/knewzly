import defaultConfig from '../content/popular-query-config.json' with { type: 'json' };
import { canonicalizeUrl } from './weekly-momentum.js';

export const REQUEST_TIMEOUT_MS = 10_000;
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const HN_STORY_LIMIT = 300;
export const HN_ITEM_CONCURRENCY = 10;
export const GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc';
export const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0/';
export const GDELT_QUERIES = Object.freeze(defaultConfig.queries.map(({ category, query }) => Object.freeze({ category, query })));

function isoNow(value) {
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (Number.isNaN(date.valueOf())) throw new TypeError('now must be a valid timestamp');
  return date.toISOString();
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

async function readBoundedText(response, maxBytes) {
  const declaredSize = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) throw new Error(`response exceeds ${maxBytes} byte limit`);
  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error(`response exceeds ${maxBytes} byte limit`);
    return text;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new Error(`response exceeds ${maxBytes} byte limit`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

/** Fetches one JSON response through the shared HTTPS, timeout, redirect, and size boundary. */
export async function fetchJsonBounded(url, {
  fetchImpl = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
  maxBytes = MAX_RESPONSE_BYTES,
} = {}) {
  if (!isHttpsUrl(url)) throw new TypeError('only credential-free HTTPS URLs are allowed');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      redirect: 'error',
      headers: { accept: 'application/json' },
    });
    if (!response?.ok) throw new Error(`provider returned HTTP ${response?.status ?? 'unknown'}`);
    if (response.redirected) throw new Error('provider redirect was rejected');
    const contentType = response.headers?.get?.('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) throw new Error('provider did not return JSON content');
    const body = await readBoundedText(response, maxBytes);
    try {
      return JSON.parse(body);
    } catch {
      throw new Error('provider returned malformed JSON');
    }
  } finally {
    clearTimeout(timeout);
  }
}

function safeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function hostFromUrl(url) {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
}

function normalizeGdeltArticle(article) {
  const url = canonicalizeUrl(article?.url, defaultConfig);
  const title = safeString(article?.title);
  const seendate = safeString(article?.seendate);
  if (!url || !title || !seendate) return undefined;
  const domain = safeString(article?.domain)?.toLowerCase().replace(/^www\./, '') ?? hostFromUrl(url);
  return {
    url,
    title,
    seendate,
    domain,
    ...(safeString(article.language) ? { language: article.language.trim() } : {}),
    ...(safeString(article.sourcecountry) ? { sourcecountry: article.sourcecountry.trim() } : {}),
  };
}

/** Gets evidence only from the six reviewed GDELT category queries. */
export async function fetchGdeltEvidence({
  fetchImpl = fetch,
  now = new Date(),
  timeoutMs = REQUEST_TIMEOUT_MS,
  maxBytes = MAX_RESPONSE_BYTES,
} = {}) {
  const sampledAt = isoNow(now);
  const requests = GDELT_QUERIES.map(async ({ query }) => {
    const url = new URL(GDELT_ENDPOINT);
    url.search = new URLSearchParams({ mode: 'artlist', format: 'json', timespan: '7d', sort: 'datedesc', maxrecords: '250', query }).toString();
    const payload = await fetchJsonBounded(url, { fetchImpl, timeoutMs, maxBytes });
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.articles)) throw new Error('GDELT response has no articles array');
    const accepted = payload.articles.map(normalizeGdeltArticle);
    // Treat a malformed or unsafe article as a bad provider batch rather than
    // silently treating unknown external data as known zero coverage.
    if (accepted.some((article) => !article)) throw new Error('GDELT response contains an unsafe or malformed article');
    return { accepted, rejected: 0 };
  });
  const settled = await Promise.allSettled(requests);
  const successes = settled.filter((result) => result.status === 'fulfilled');
  const articles = successes.flatMap((result) => result.value.accepted);
  const rejectedArticles = successes.reduce((count, result) => count + result.value.rejected, 0);
  const failedQueries = settled.length - successes.length;
  return {
    status: successes.length ? 'ok' : 'unavailable',
    ...(successes.length ? { sampledAt, queryCount: GDELT_QUERIES.length } : {}),
    articles,
    itemStates: { accepted: articles.length, rejected: rejectedArticles, failedQueries },
  };
}

function withinWindow(unixSeconds, now) {
  if (!Number.isInteger(unixSeconds) || unixSeconds < 0) return false;
  const date = new Date(unixSeconds * 1000);
  const end = new Date(now);
  const start = new Date(end.valueOf() - 7 * 24 * 60 * 60 * 1000);
  return date >= start && date <= end;
}

function normalizeHackerNewsItem(item, expectedId, now) {
  if (!item || typeof item !== 'object') return { state: 'malformed' };
  if (item.dead === true) return { state: 'dead' };
  if (item.type !== 'story') return { state: 'wrongType' };
  if (!withinWindow(item.time, now)) return { state: Number.isInteger(item.time) ? 'outsideWindow' : 'malformed' };
  if (!Number.isInteger(item.id) || item.id !== expectedId || !safeString(item.title) || !Number.isInteger(item.score) || item.score < 0 || !Number.isInteger(item.descendants) || item.descendants < 0) {
    return { state: 'malformed' };
  }
  if (item.url !== undefined && !canonicalizeUrl(item.url, defaultConfig)) return { state: 'unsafeUrl' };
  return {
    state: 'accepted',
    item: {
      id: item.id,
      ...(item.url ? { url: canonicalizeUrl(item.url, defaultConfig) } : {}),
      title: item.title.trim(),
      score: item.score,
      descendants: item.descendants,
    },
  };
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

/** Samples official HN best stories with a bounded concurrent item fetch. */
export async function fetchHackerNewsEvidence({
  fetchImpl = fetch,
  now = new Date(),
  timeoutMs = REQUEST_TIMEOUT_MS,
  maxBytes = MAX_RESPONSE_BYTES,
} = {}) {
  const sampledAt = isoNow(now);
  let bestStoryIds;
  try {
    bestStoryIds = await fetchJsonBounded(new URL('beststories.json', HN_BASE_URL), { fetchImpl, timeoutMs, maxBytes });
    if (!Array.isArray(bestStoryIds) || bestStoryIds.some((id) => !Number.isInteger(id) || id < 0)) throw new Error('HN beststories has an invalid shape');
  } catch {
    return { status: 'unavailable', items: [], sampledIds: 0, itemStates: { failed: 1 } };
  }
  const sampledIds = bestStoryIds.slice(0, HN_STORY_LIMIT);
  const states = await mapWithConcurrency(sampledIds, HN_ITEM_CONCURRENCY, async (id) => {
    try {
      const item = await fetchJsonBounded(new URL(`item/${id}.json`, HN_BASE_URL), { fetchImpl, timeoutMs, maxBytes });
      return normalizeHackerNewsItem(item, id, now);
    } catch {
      return { state: 'failed' };
    }
  });
  const itemStates = { accepted: 0, dead: 0, wrongType: 0, outsideWindow: 0, unsafeUrl: 0, malformed: 0, failed: 0 };
  for (const { state } of states) itemStates[state] += 1;
  return {
    status: 'ok',
    sampledAt,
    itemCount: itemStates.accepted,
    sampledIds: sampledIds.length,
    items: states.filter(({ state }) => state === 'accepted').map(({ item }) => item),
    itemStates,
  };
}
