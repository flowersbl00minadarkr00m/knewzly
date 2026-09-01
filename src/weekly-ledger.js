// Fixture-driven Weekly Ledger renderer (Feature 003, Task T3).
// This module only joins already-loaded same-origin data and writes inside the
// supplied container. Fetching and Today-page placement remain T4 concerns.

import { traceAnchorUrl } from './trace-to-origin.js';

const HOURS = 60 * 60 * 1000;
const renderSurfaces = new WeakMap();

function asDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function storiesFrom(todayStories) {
  return Array.isArray(todayStories?.stories) ? todayStories.stories : Array.isArray(todayStories) ? todayStories : [];
}

function labelForProvider(name) {
  return name === 'hackerNews' ? 'Hacker News' : name === 'gdelt' ? 'GDELT' : name === 'bluesky' ? 'Bluesky' : name;
}

function readableState(state) {
  if (state === 'not_observed') return 'not observed';
  if (state === 'provider_unavailable') return 'unavailable';
  if (state === 'not_configured') return 'not configured';
  if (state === 'error') return 'unavailable';
  return state || 'unavailable';
}

function appendText(parent, tagName, className, value) {
  const element = parent.ownerDocument.createElement(tagName);
  if (className) element.className = className;
  element.textContent = value;
  parent.appendChild(element);
  return element;
}

function appendLink(parent, { href, text, className, external = false }) {
  const link = parent.ownerDocument.createElement('a');
  if (className) link.className = className;
  link.href = href;
  link.setAttribute('href', href);
  link.textContent = text;
  if (external) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  parent.appendChild(link);
  return link;
}

/** Returns the browser-only freshness floor without changing the published edition. */
export function effectiveLedgerState(weeklyDocument, { now = new Date() } = {}) {
  const published = weeklyDocument?.status;
  const attemptedAt = asDate(weeklyDocument?.lastAttemptedAt);
  const current = asDate(now);
  if (!current || !attemptedAt || !['fresh', 'partial', 'unavailable'].includes(published)) {
    return { status: 'unavailable', reason: 'missing-or-invalid-refresh-time', ageHours: null };
  }

  const ageHours = Math.max(0, (current.valueOf() - attemptedAt.valueOf()) / HOURS);
  if (ageHours > 24) return { status: 'unavailable', reason: 'older-than-24-hours', ageHours };
  if (ageHours > 12 && published === 'fresh') return { status: 'partial', reason: 'older-than-12-hours', ageHours };
  return { status: published, reason: 'published-state', ageHours };
}

/** Joins weekly references to the supplied canonical Today stories; no provider content is admitted. */
export function joinWeeklyLedger(weeklyDocument, todayStories) {
  const byId = new Map(storiesFrom(todayStories).filter((story) => story?.id).map((story) => [story.id, story]));
  const entries = Array.isArray(weeklyDocument?.entries) ? weeklyDocument.entries : [];
  const resolved = [];
  const unresolved = [];

  for (const entry of entries) {
    const memberStoryIds = Array.isArray(entry?.memberStoryIds) ? entry.memberStoryIds : ['(missing memberStoryIds)'];
    const referenceIds = [entry?.leadStoryId ?? '(missing leadStoryId)', ...memberStoryIds];
    const unresolvedForEntry = [...new Set(referenceIds.filter((storyId) => !byId.has(storyId)))];
    if (unresolvedForEntry.length) {
      unresolved.push(...unresolvedForEntry);
      continue;
    }
    resolved.push({ entry, story: byId.get(entry.leadStoryId) });
  }
  return { resolved, unresolved };
}

export function filterWeeklyLedger(entries, category = 'all') {
  if (!category || String(category).toLowerCase() === 'all') return entries;
  return entries.filter(({ entry }) => entry.category === category);
}

function renderMethodology(section, weeklyDocument) {
  const details = section.ownerDocument.createElement('details');
  details.className = 'weekly-ledger-methodology';
  const summary = section.ownerDocument.createElement('summary');
  summary.textContent = 'How this weekly momentum list is built';
  details.appendChild(summary);
  appendText(details, 'p', '', `This edition covers the rolling seven days from ${weeklyDocument?.windowStart ?? 'the recorded window'} to ${weeklyDocument?.windowEnd ?? 'the recorded window'}. It ranks observed weekly momentum, not universal popularity.`);
  appendText(details, 'p', '', 'Rows show raw sampled coverage, Hacker News, and recency evidence when observed. Missing evidence stays explicitly unavailable or not observed; no composite score is shown.');
  section.appendChild(details);
}

function renderProviderStatus(section, providers, state) {
  const providerStatus = section.ownerDocument.createElement('p');
  providerStatus.className = 'weekly-ledger-providers';
  const items = Object.entries(providers && typeof providers === 'object' ? providers : {})
    .map(([name, provider]) => `${labelForProvider(name)}: ${readableState(provider?.status)}`);
  providerStatus.textContent = items.length ? `Provider evidence — ${items.join('; ')}.` : 'Provider evidence is unavailable.';
  section.appendChild(providerStatus);
  if (state === 'partial') appendText(section, 'p', 'weekly-ledger-degraded', 'Partial weekly momentum — reduced evidence basis. Available rankings use only observed evidence.');
}

function renderRefreshContext(section, weeklyDocument) {
  appendText(
    section,
    'p',
    'weekly-ledger-refresh-context',
    `Last attempted update: ${weeklyDocument?.lastAttemptedAt ?? 'unknown'}. Last successful update: ${weeklyDocument?.lastSuccessfulAt ?? 'unknown'}.`,
  );
}

function renderEvidence(article, signals = {}) {
  const evidence = article.ownerDocument.createElement('ul');
  evidence.className = 'weekly-ledger-evidence weekly-ledger-wrap-anywhere';
  const coverage = signals.coverage;
  appendText(evidence, 'li', '', coverage?.state === 'observed'
    ? `Observed sampled coverage: ${coverage.independentOutletCount} independent outlets.`
    : `Sampled coverage: ${readableState(coverage?.state)}.`);
  const hackerNews = signals.hackerNews;
  appendText(evidence, 'li', '', hackerNews?.state === 'observed'
    ? `Hacker News: ${hackerNews.points} points · ${hackerNews.comments} comments.`
    : `Hacker News: ${readableState(hackerNews?.state)}.`);
  const recency = signals.recency;
  appendText(evidence, 'li', '', recency?.state === 'observed'
    ? `Recency: observed at ${recency.ageHours} hours old when refreshed.`
    : `Recency: ${readableState(recency?.state)}.`);
  const bluesky = signals.bluesky;
  if (bluesky?.state && bluesky.state !== 'not_configured') appendText(evidence, 'li', '', `Bluesky: ${readableState(bluesky.state)}.`);
  article.appendChild(evidence);
}

function renderEntry(list, { entry, story }, atlasPath) {
  const item = list.ownerDocument.createElement('li');
  item.className = 'weekly-ledger-item';
  item.value = Number(entry.rank);
  item.setAttribute('value', String(entry.rank));
  const article = list.ownerDocument.createElement('article');
  article.className = 'weekly-ledger-entry weekly-ledger-wrap-anywhere';
  article.setAttribute('data-global-rank', String(entry.rank));
  article.setAttribute('data-category', entry.category ?? 'uncategorized');
  appendText(article, 'p', 'weekly-ledger-rank', `Rank ${entry.rank}`);
  appendText(article, 'p', 'weekly-ledger-category', entry.category ?? 'uncategorized');
  appendText(article, 'h3', 'weekly-ledger-headline', story.headline || '(untitled canonical Today story)');

  const source = story.source ?? {};
  const sourceText = `${source.name || 'Unknown source'} · ${source.publishedDate || 'undated'}`;
  const sourceLine = article.ownerDocument.createElement('p');
  sourceLine.className = 'weekly-ledger-source';
  if (source.url) appendLink(sourceLine, { href: source.url, text: sourceText, external: true });
  else sourceLine.textContent = sourceText;
  article.appendChild(sourceLine);
  renderEvidence(article, entry.signals);

  const anchorId = Array.isArray(story.traceToAnchors) ? story.traceToAnchors.find((id) => typeof id === 'string' && id) : null;
  const traceUrl = anchorId ? traceAnchorUrl(anchorId, { atlasPath }) : null;
  if (traceUrl) appendLink(article, { href: traceUrl, text: `Trace to origin: ${story.traceLabel || anchorId}`, className: 'weekly-ledger-trace' });

  item.appendChild(article);
  list.appendChild(item);
}

function renderSurface(container) {
  let surface = renderSurfaces.get(container);
  if (surface) return surface;

  const section = container.ownerDocument.createElement('section');
  const metadata = container.ownerDocument.createElement('div');
  metadata.className = 'weekly-ledger-metadata';
  const status = container.ownerDocument.createElement('p');
  status.className = 'weekly-ledger-filter-status';
  status.setAttribute('aria-live', 'polite');
  const body = container.ownerDocument.createElement('div');
  body.className = 'weekly-ledger-body';
  section.appendChild(metadata);
  section.appendChild(status);
  section.appendChild(body);
  container.replaceChildren(section);
  surface = { section, metadata, status, body };
  renderSurfaces.set(container, surface);
  return surface;
}

/**
 * Renders an isolated ledger. It performs no fetches and never reads or writes
 * outside `container`, so a missing weekly document cannot disturb Today.
 */
export function renderWeeklyLedger(container, weeklyDocument, todayStories, {
  category = 'all',
  now = new Date(),
  atlasPath = 'atlas.html',
  diagnostics = console,
  reducedMotion = false,
} = {}) {
  if (!container?.ownerDocument) return null;
  const freshness = effectiveLedgerState(weeklyDocument, { now });
  const joined = joinWeeklyLedger(weeklyDocument, todayStories);
  if (joined.unresolved.length) diagnostics?.warn?.(`Weekly Ledger skipped ${joined.unresolved.length} unresolved Today reference${joined.unresolved.length === 1 ? '' : 's'}: ${joined.unresolved.join(', ')}.`);

  let state = freshness.status;
  if (state !== 'unavailable' && joined.resolved.length === 0) state = 'unavailable';
  else if (state === 'fresh' && joined.unresolved.length) state = 'partial';

  const { section, metadata, status, body } = renderSurface(container);
  metadata.replaceChildren();
  body.replaceChildren();
  section.className = `weekly-ledger weekly-ledger--${state}${reducedMotion ? ' weekly-ledger--reduced-motion' : ''}`;
  section.setAttribute('data-weekly-ledger-state', state);
  section.setAttribute('data-reduced-motion', String(Boolean(reducedMotion)));
  appendText(metadata, 'p', 'weekly-ledger-kicker', 'Weekly momentum · rolling 7 days');
  appendText(metadata, 'h2', 'weekly-ledger-heading', 'Popular This Week');
  renderMethodology(metadata, weeklyDocument);
  renderProviderStatus(metadata, weeklyDocument?.providers, state);
  renderRefreshContext(metadata, weeklyDocument);
  if (freshness.reason === 'older-than-12-hours') {
    appendText(metadata, 'p', 'weekly-ledger-aging', `This edition was last attempted at ${weeklyDocument.lastAttemptedAt}; it is more than 12 hours old, so it is shown as partial.`);
  }

  if (state === 'unavailable') {
    const unavailable = freshness.reason === 'older-than-24-hours'
      ? 'Weekly momentum is unavailable because this edition is older than 24 hours. Rankings are hidden until a fresh edition is available.'
      : 'Weekly momentum is unavailable. Rankings are hidden until a trustworthy edition is available.';
    status.textContent = unavailable;
    appendText(body, 'p', 'weekly-ledger-unavailable', 'A new trustworthy edition is needed before rankings can return.');
    return { state, renderedEntries: 0, unresolvedIds: joined.unresolved };
  }

  const filtered = filterWeeklyLedger(joined.resolved, category);
  status.textContent = category && String(category).toLowerCase() !== 'all'
    ? `Showing ${filtered.length} weekly entries in ${category}.`
    : `Showing ${filtered.length} weekly entries.`;
  if (filtered.length === 0) {
    appendText(body, 'p', 'weekly-ledger-empty', `No weekly entries are available in ${category}.`);
    return { state, renderedEntries: 0, unresolvedIds: joined.unresolved };
  }

  const list = section.ownerDocument.createElement('ol');
  list.className = 'weekly-ledger-list';
  filtered.forEach((joinedEntry) => renderEntry(list, joinedEntry, atlasPath));
  body.appendChild(list);
  return { state, renderedEntries: filtered.length, unresolvedIds: joined.unresolved };
}
