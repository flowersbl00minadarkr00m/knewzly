import Ajv2020 from 'ajv/dist/2020.js';
import weeklySchema from '../content/popular-this-week.schema.json' with { type: 'json' };
import defaultConfig from '../content/popular-query-config.json' with { type: 'json' };

const HOURS_IN_WEEK = 168;
const DEFAULT_METHODOLOGY_VERSION = 'weekly-momentum-v1';
const nonSubstantiveWords = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'from', 'in', 'into', 'of', 'on', 'or', 'the', 'to', 'with', 'new', 'latest', 'update']);

function isUtcTimestamp(value) {
  if (typeof value !== 'string' || !value.endsWith('Z')) return false;
  const date = new Date(value);
  return !Number.isNaN(date.valueOf()) && date.toISOString() === value;
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat('date-time', { type: 'string', validate: isUtcTimestamp });
const validateSchema = ajv.compile(weeklySchema);

function asDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return new Date(value.valueOf());
  if (typeof value !== 'string' || !value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.valueOf()) || !date.toISOString().startsWith(value) ? undefined : date;
  }
  const date = new Date(value);
  const sourceDate = /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0];
  return Number.isNaN(date.valueOf()) || (sourceDate && !date.toISOString().startsWith(sourceDate)) ? undefined : date;
}

function toIso(value, label) {
  const date = asDate(value);
  if (!date) throw new TypeError(`${label} must be a valid timestamp`);
  return date.toISOString();
}

function normaliseConfig(config) {
  return {
    ...defaultConfig,
    ...config,
    matching: { ...defaultConfig.matching, ...config?.matching, cluster: { ...defaultConfig.matching.cluster, ...config?.matching?.cluster } },
    scoring: { ...defaultConfig.scoring, ...config?.scoring },
  };
}

function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/** Canonicalizes a safe HTTPS URL without discarding meaningful identity. */
export function canonicalizeUrl(value, config = defaultConfig) {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.hash = '';
    const known = new Set((config.matching?.trackingParameters ?? defaultConfig.matching.trackingParameters).map((parameter) => parameter.toLowerCase()));
    for (const key of [...url.searchParams.keys()]) {
      if (known.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return undefined;
  }
}

/** Normalizes text for conservative, explainable story matching. */
export function normalizeHeadline(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word && !nonSubstantiveWords.has(word))
    .join(' ');
}

function tokenSet(value) {
  return new Set(normalizeHeadline(value).split(' ').filter(Boolean));
}

export function headlineSimilarity(first, second) {
  const left = tokenSet(first);
  const right = tokenSet(second);
  if (!left.size || !right.size) return { overlap: 0, jaccard: 0 };
  const overlap = [...left].filter((token) => right.has(token)).length;
  return { overlap, jaccard: overlap / new Set([...left, ...right]).size };
}

function sourcePublishedAt(story) {
  return asDate(story?.source?.publishedDate);
}

/** Keeps only stories inside the inclusive rolling UTC seven-day window. */
export function eligibleTodayStories(todayStories, { now }) {
  const windowEnd = asDate(now);
  if (!windowEnd) throw new TypeError('now must be a valid timestamp');
  const windowStart = new Date(windowEnd.valueOf() - HOURS_IN_WEEK * 60 * 60 * 1000);
  const stories = Array.isArray(todayStories?.stories) ? todayStories.stories : Array.isArray(todayStories) ? todayStories : [];
  return stories.filter((story) => {
    const publishedAt = sourcePublishedAt(story);
    return Boolean(story?.id && story?.category && publishedAt && publishedAt >= windowStart && publishedAt <= windowEnd);
  });
}

function compareLeadCandidates(first, second, allowlistOrder) {
  const firstTime = sourcePublishedAt(first).valueOf();
  const secondTime = sourcePublishedAt(second).valueOf();
  if (firstTime !== secondTime) return secondTime - firstTime;
  const firstOrder = allowlistOrder[first.source?.name] ?? Number.MAX_SAFE_INTEGER;
  const secondOrder = allowlistOrder[second.source?.name] ?? Number.MAX_SAFE_INTEGER;
  if (firstOrder !== secondOrder) return firstOrder - secondOrder;
  return String(first.id).localeCompare(String(second.id));
}

function storiesMatch(first, second, config) {
  const firstUrl = canonicalizeUrl(first.source?.url, config);
  const secondUrl = canonicalizeUrl(second.source?.url, config);
  if (firstUrl && secondUrl && firstUrl === secondUrl) return true;
  if (first.category !== second.category) return false;
  const firstDate = sourcePublishedAt(first);
  const secondDate = sourcePublishedAt(second);
  const maxDifference = config.matching.cluster.maxHoursApart * 60 * 60 * 1000;
  if (Math.abs(firstDate - secondDate) > maxDifference) return false;
  const { overlap, jaccard } = headlineSimilarity(first.headline, second.headline);
  return overlap >= config.matching.cluster.minimumSubstantiveTokenOverlap && jaccard >= config.matching.cluster.minimumJaccardSimilarity;
}

/** Groups canonical Today seeds with URL-first, conservative headline matching. */
export function clusterTodayStories(stories, { config = defaultConfig, allowlistOrder = {} } = {}) {
  const resolvedConfig = normaliseConfig(config);
  const sortedStories = [...stories].sort((first, second) => String(first.id).localeCompare(String(second.id)));
  const parent = sortedStories.map((_, index) => index);
  const find = (index) => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const join = (first, second) => { parent[find(second)] = find(first); };

  for (let first = 0; first < sortedStories.length; first += 1) {
    for (let second = first + 1; second < sortedStories.length; second += 1) {
      if (storiesMatch(sortedStories[first], sortedStories[second], resolvedConfig)) join(first, second);
    }
  }

  const groups = new Map();
  sortedStories.forEach((story, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), story]);
  });
  return [...groups.values()].map((members) => {
    const ordered = [...members].sort((first, second) => compareLeadCandidates(first, second, allowlistOrder));
    return { lead: ordered[0], members: ordered };
  });
}

function findMatchedCluster(clusters, record, config, minimumJaccard) {
  const url = canonicalizeUrl(record?.url, config);
  const exact = url && clusters.filter(({ members }) => members.some((story) => canonicalizeUrl(story.source?.url, config) === url));
  if (exact?.length === 1) return exact[0];

  const candidates = clusters
    .map((cluster) => ({ cluster, similarity: headlineSimilarity(cluster.lead.headline, record?.title) }))
    .filter(({ similarity }) => similarity.jaccard >= minimumJaccard)
    .sort((first, second) => second.similarity.jaccard - first.similarity.jaccard || String(first.cluster.lead.id).localeCompare(String(second.cluster.lead.id)));
  return candidates.length === 1 || (candidates.length && candidates[0].similarity.jaccard > candidates[1].similarity.jaccard) ? candidates[0]?.cluster : undefined;
}

function provider(status, fallbackStatus, now, countField, count) {
  const source = status ?? { status: fallbackStatus };
  const result = { status: source.status ?? fallbackStatus };
  if (result.status === 'ok') {
    result.sampledAt = toIso(source.sampledAt ?? now, 'provider sampledAt');
    if (countField) result[countField] = Number.isInteger(source[countField]) ? source[countField] : count;
  }
  return result;
}

function attachEvidence(clusters, gdeltResults, hackerNewsItems, providerStates, config) {
  const evidence = new Map(clusters.map((cluster) => [cluster, { gdelt: [], hackerNews: [] }]));
  if (providerStates.gdelt.status === 'ok') {
    for (const result of gdeltResults) {
      const cluster = findMatchedCluster(clusters, result, config, config.matching.cluster.minimumJaccardSimilarity);
      if (cluster) evidence.get(cluster).gdelt.push(result);
    }
  }
  if (providerStates.hackerNews.status === 'ok') {
    for (const item of hackerNewsItems) {
      const cluster = findMatchedCluster(clusters, item, config, config.matching.hackerNewsMinimumJaccardSimilarity);
      if (cluster) evidence.get(cluster).hackerNews.push(item);
    }
  }
  return evidence;
}

function logarithmicRatio(value, cap) {
  return Math.min(Math.log1p(value) / Math.log1p(cap), 1);
}

function scoreEntry(signals, config) {
  const components = [];
  if (signals.coverage.state === 'observed') components.push([config.scoring.coverageWeight, logarithmicRatio(signals.coverage.independentOutletCount, config.scoring.coverageOutletCap)]);
  if (signals.hackerNews.state === 'observed') {
    const hn = 0.7 * logarithmicRatio(signals.hackerNews.points, config.scoring.hackerNewsPointsCap)
      + 0.3 * logarithmicRatio(signals.hackerNews.comments, config.scoring.hackerNewsCommentsCap);
    components.push([config.scoring.hackerNewsWeight, hn]);
  }
  components.push([config.scoring.recencyWeight, 1 - signals.recency.ageHours / HOURS_IN_WEEK]);
  const weightTotal = components.reduce((total, [weight]) => total + weight, 0);
  return components.reduce((total, [weight, value]) => total + weight * value, 0) / weightTotal;
}

function buildSignals(cluster, evidence, providerStates, now) {
  const domains = new Set(cluster.members.map((story) => hostnameFromUrl(story.source?.url)).filter(Boolean));
  if (providerStates.gdelt.status === 'ok') {
    for (const result of evidence.gdelt) {
      const domain = String(result?.domain ?? hostnameFromUrl(result?.url) ?? '').toLowerCase().replace(/^www\./, '');
      if (domain) domains.add(domain);
    }
  }
  const coverage = providerStates.gdelt.status === 'not_configured'
    ? { state: 'not_configured' }
    : {
        state: 'observed',
        basis: providerStates.gdelt.status === 'ok' ? 'gdelt_sample' : 'canonical_today_sources',
        independentOutletCount: domains.size,
        sampledDomains: [...domains].sort().slice(0, 5),
      };
  const hnById = new Map();
  for (const item of evidence.hackerNews) if (Number.isInteger(item?.id) && !hnById.has(item.id)) hnById.set(item.id, item);
  const hnItems = [...hnById.values()].sort((first, second) => first.id - second.id);
  const hackerNews = providerStates.hackerNews.status !== 'ok'
    ? { state: providerStates.hackerNews.status === 'not_configured' ? 'not_configured' : 'provider_unavailable' }
    : !hnItems.length
      ? { state: 'not_observed' }
      : {
          state: 'observed',
          points: Math.max(...hnItems.map((item) => Number.isInteger(item.score) && item.score >= 0 ? item.score : 0)),
          comments: hnItems.reduce((total, item) => total + (Number.isInteger(item.descendants) && item.descendants >= 0 ? item.descendants : 0), 0),
          itemIds: hnItems.slice(0, 5).map((item) => item.id),
        };
  const ageHours = (asDate(now) - sourcePublishedAt(cluster.lead)) / (60 * 60 * 1000);
  return { coverage, hackerNews, recency: { state: 'observed', ageHours }, bluesky: { state: 'not_configured' } };
}

function compareRanked(first, second) {
  if (first.momentumScore !== second.momentumScore) return second.momentumScore - first.momentumScore;
  const firstCoverage = first.signals.coverage.independentOutletCount ?? -1;
  const secondCoverage = second.signals.coverage.independentOutletCount ?? -1;
  if (firstCoverage !== secondCoverage) return secondCoverage - firstCoverage;
  if (first.publishedAt !== second.publishedAt) return second.publishedAt.localeCompare(first.publishedAt);
  return first.leadStoryId.localeCompare(second.leadStoryId);
}

/** Selects no more than twelve entries while preserving category breadth where supply permits. */
export function selectDiverseEntries(entries) {
  const ranked = [...entries].sort(compareRanked);
  if (ranked.length < 8) return ranked;
  const targetCount = Math.min(12, ranked.length);
  const categoryCap = Math.floor(targetCount * 0.4);
  const selected = [];
  const skipped = [];
  const counts = new Map();
  for (const entry of ranked) {
    if ((counts.get(entry.category) ?? 0) < categoryCap) {
      selected.push(entry);
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    } else {
      skipped.push(entry);
    }
    if (selected.length === targetCount) break;
  }
  // A two-category or scarce-category edition can make the 40% cap
  // mathematically incompatible with the required minimum of eight. Relax
  // only enough to retain that minimum after all qualifying alternatives were
  // selected; otherwise the cap remains in force.
  if (selected.length < 8) {
    for (const entry of skipped) {
      if (selected.length === 8) break;
      selected.push(entry);
    }
  }
  return selected.sort(compareRanked);
}

function crossReferenceErrors(document, todayStories) {
  const canonicalStories = Array.isArray(todayStories?.stories) ? todayStories.stories : Array.isArray(todayStories) ? todayStories : [];
  const storiesById = new Map(canonicalStories.filter((story) => story?.id).map((story) => [story.id, story]));
  const canonicalIds = new Set(storiesById.keys());
  const errors = [];
  const ranks = new Set();
  const memberOwners = new Map();
  const windowStart = asDate(document?.windowStart);
  const windowEnd = asDate(document?.windowEnd);
  const lastAttemptedAt = asDate(document?.lastAttemptedAt);
  const lastSuccessfulAt = asDate(document?.lastSuccessfulAt);
  if (windowStart && windowEnd && windowStart >= windowEnd) errors.push('windowStart must be before windowEnd');
  if (lastAttemptedAt && windowEnd && lastAttemptedAt.valueOf() !== windowEnd.valueOf()) errors.push('lastAttemptedAt must equal windowEnd');
  if (lastSuccessfulAt && ((lastAttemptedAt && lastSuccessfulAt > lastAttemptedAt) || (windowEnd && lastSuccessfulAt > windowEnd))) {
    errors.push('lastSuccessfulAt must not be later than lastAttemptedAt or windowEnd');
  }
  const gdeltStatus = document?.providers?.gdelt?.status;
  const hackerNewsStatus = document?.providers?.hackerNews?.status;
  const eligibleTodayStoriesInWindow = windowEnd
    ? eligibleTodayStories({ stories: canonicalStories }, { now: windowEnd }).length
    : 0;
  if (document?.status === 'fresh' && (gdeltStatus !== 'ok' || hackerNewsStatus !== 'ok')) {
    errors.push('fresh requires both core providers to be ok');
  }
  if (document?.status === 'partial' && gdeltStatus !== 'ok' && hackerNewsStatus !== 'ok') {
    errors.push('partial requires at least one core provider to be ok');
  }
  if (document?.status === 'unavailable'
    && eligibleTodayStoriesInWindow > 0
    && !(gdeltStatus === 'unavailable' && hackerNewsStatus === 'unavailable')) {
    errors.push('unavailable requires both core providers unavailable or no eligible Today stories');
  }
  const entries = Array.isArray(document?.entries) ? document.entries : [];
  if (document?.status === 'fresh' && entries.length < 8) {
    errors.push('fresh requires at least eight entries');
  }
  if (document?.status === 'partial' && entries.length >= 8 && gdeltStatus === 'ok' && hackerNewsStatus === 'ok') {
    errors.push('partial with eight or more entries requires a degraded core provider');
  }
  entries.forEach((entry) => {
    if (!canonicalIds.has(entry.leadStoryId)) errors.push(`entry leadStoryId "${entry.leadStoryId}" does not resolve to Today content`);
    const leadStory = storiesById.get(entry.leadStoryId);
    if (leadStory && entry.category !== leadStory.category) {
      errors.push(`entry category "${entry.category}" does not match canonical Today lead category "${leadStory.category}"`);
    }
    const publishedAt = asDate(entry.publishedAt);
    const canonicalPublishedAt = leadStory && sourcePublishedAt(leadStory);
    if (publishedAt && canonicalPublishedAt && publishedAt.valueOf() !== canonicalPublishedAt.valueOf()) {
      errors.push(`entry publishedAt "${entry.publishedAt}" does not match canonical Today lead published timestamp`);
    }
    if (publishedAt && windowStart && windowEnd && (publishedAt < windowStart || publishedAt > windowEnd)) {
      errors.push(`entry publishedAt "${entry.publishedAt}" is outside the declared window`);
    }
    const coverage = entry?.signals?.coverage;
    if (gdeltStatus === 'unavailable' && entries.length > 0
      && (coverage?.state !== 'observed' || coverage.basis !== 'canonical_today_sources')) {
      errors.push('GDELT-unavailable populated edition requires observed canonical_today_sources coverage');
    }
    if (gdeltStatus === 'ok' && coverage?.state === 'observed' && coverage.basis !== 'gdelt_sample') {
      errors.push('GDELT-ok observed coverage must identify gdelt_sample basis');
    }
    for (const [providerName, signalName] of [['gdelt', 'coverage'], ['hackerNews', 'hackerNews'], ['bluesky', 'bluesky']]) {
      const providerStatus = document?.providers?.[providerName]?.status;
      const signalState = entry?.signals?.[signalName]?.state;
      const canonicalTodayCoverage = providerName === 'gdelt'
        && signalState === 'observed'
        && entry?.signals?.coverage?.basis === 'canonical_today_sources';
      if (providerStatus === 'unavailable' && signalState !== 'provider_unavailable' && !canonicalTodayCoverage) {
        errors.push(`provider ${providerName} status unavailable requires ${signalName} state provider_unavailable`);
      }
      if (providerStatus === 'not_configured' && signalState !== 'not_configured') {
        errors.push(`provider ${providerName} status not_configured requires ${signalName} state not_configured`);
      }
      if (providerStatus === 'ok' && !['observed', 'not_observed'].includes(signalState)) {
        errors.push(`provider ${providerName} status ok requires ${signalName} state observed or not_observed`);
      }
    }
    const memberStoryIds = Array.isArray(entry.memberStoryIds) ? entry.memberStoryIds : [];
    if (!memberStoryIds.includes(entry.leadStoryId)) errors.push(`entry rank ${entry.rank} memberStoryIds must include leadStoryId "${entry.leadStoryId}"`);
    for (const storyId of memberStoryIds) {
      if (!canonicalIds.has(storyId)) errors.push(`entry memberStoryId "${storyId}" does not resolve to Today content`);
      const previousOwner = memberOwners.get(storyId);
      if (previousOwner !== undefined && previousOwner !== entry.rank) errors.push(`entry memberStoryId "${storyId}" appears in multiple clusters`);
      memberOwners.set(storyId, entry.rank);
    }
    if (gdeltStatus === 'unavailable' && entry?.signals?.coverage?.state === 'observed') {
      const coverage = entry.signals.coverage;
      const canonicalDomains = [...new Set(memberStoryIds
        .map((storyId) => hostnameFromUrl(storiesById.get(storyId)?.source?.url))
        .filter(Boolean))].sort();
      if (coverage.basis !== 'canonical_today_sources') {
        errors.push('GDELT-unavailable observed coverage must identify canonical_today_sources basis');
      }
      if (coverage.independentOutletCount !== canonicalDomains.length) {
        errors.push('canonical Today coverage count must equal distinct member-source domains');
      }
      if (JSON.stringify(coverage.sampledDomains) !== JSON.stringify(canonicalDomains.slice(0, 5))) {
        errors.push('canonical Today coverage sampledDomains must match member-source domains');
      }
    }
    if (ranks.has(entry.rank)) errors.push(`entry rank ${entry.rank} is duplicated`);
    ranks.add(entry.rank);
  });
  for (let rank = 1; rank <= ranks.size; rank += 1) if (!ranks.has(rank)) errors.push(`entry rank ${rank} is missing`);
  return errors;
}

/** Returns schema and canonical-Today reference errors; an empty list is publishable. */
export function validateWeeklyLedger(document, todayStories) {
  const valid = validateSchema(document);
  const schemaErrors = valid ? [] : validateSchema.errors.map((error) => `${error.instancePath || '/'} ${error.message}`);
  return [...schemaErrors, ...crossReferenceErrors(document, todayStories)];
}

/** Throws a publication-gate error instead of permitting an invalid weekly document. */
export function assertValidWeeklyLedger(document, todayStories) {
  const errors = validateWeeklyLedger(document, todayStories);
  if (errors.length) throw new Error(`Weekly Ledger validation failed: ${errors.join('; ')}`);
  return document;
}

/** Pure, deterministic Weekly Ledger publication builder. */
export function buildWeeklyLedger({ todayStories, gdeltResults = [], hackerNewsItems = [], providerStates = {}, now, config, allowlistOrder = {}, previousLastSuccessfulAt } = {}) {
  const resolvedConfig = normaliseConfig(config);
  const windowEnd = asDate(now);
  if (!windowEnd) throw new TypeError('now must be a valid timestamp');
  const nowIso = windowEnd.toISOString();
  const providers = {
    gdelt: provider(providerStates.gdelt, 'ok', nowIso, 'queryCount', resolvedConfig.queries.length),
    hackerNews: provider(providerStates.hackerNews, 'ok', nowIso, 'itemCount', hackerNewsItems.length),
    bluesky: provider(providerStates.bluesky, 'not_configured', nowIso),
  };
  const eligible = eligibleTodayStories(todayStories, { now: nowIso });
  const clusters = clusterTodayStories(eligible, { config: resolvedConfig, allowlistOrder });
  const evidence = attachEvidence(clusters, gdeltResults, hackerNewsItems, providers, resolvedConfig);
  const scored = clusters.map((cluster) => {
    const signals = buildSignals(cluster, evidence.get(cluster), providers, nowIso);
    return {
      leadStoryId: cluster.lead.id,
      memberStoryIds: cluster.members.map((story) => story.id),
      category: cluster.lead.category,
      publishedAt: sourcePublishedAt(cluster.lead).toISOString(),
      momentumScore: scoreEntry(signals, resolvedConfig),
      signals,
    };
  });
  const selected = selectDiverseEntries(scored).map((entry, index) => ({ rank: index + 1, ...entry }));
  const coreProvidersSucceeded = providers.gdelt.status === 'ok' && providers.hackerNews.status === 'ok';
  const status = !eligible.length || (!coreProvidersSucceeded && providers.gdelt.status !== 'ok' && providers.hackerNews.status !== 'ok')
    ? 'unavailable'
    : selected.length < 8 || !coreProvidersSucceeded ? 'partial' : 'fresh';
  const document = {
    schemaVersion: 1,
    methodologyVersion: DEFAULT_METHODOLOGY_VERSION,
    windowStart: new Date(windowEnd.valueOf() - HOURS_IN_WEEK * 60 * 60 * 1000).toISOString(),
    windowEnd: nowIso,
    lastAttemptedAt: nowIso,
    ...(status === 'unavailable' ? (previousLastSuccessfulAt ? { lastSuccessfulAt: toIso(previousLastSuccessfulAt, 'previousLastSuccessfulAt') } : {}) : { lastSuccessfulAt: nowIso }),
    status,
    providers,
    entries: status === 'unavailable' ? [] : selected,
  };
  return assertValidWeeklyLedger(document, todayStories);
}
