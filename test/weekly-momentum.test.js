import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyLedger, canonicalizeUrl, clusterTodayStories, eligibleTodayStories, selectDiverseEntries, validateWeeklyLedger } from '../src/weekly-momentum.js';

const NOW = '2026-08-31T18:00:00.000Z';

function story(id, category, headline, publishedDate, sourceName = 'Fixture Wire') {
  return {
    id,
    category,
    headline,
    source: { name: sourceName, url: `https://${id}.example/story`, publishedDate },
  };
}

function rankedEntry(id, category, score) {
  return {
    leadStoryId: id,
    memberStoryIds: [id],
    category,
    publishedAt: NOW,
    momentumScore: score,
    signals: {
      coverage: { state: 'observed', independentOutletCount: 1, sampledDomains: ['fixture.example'] },
      hackerNews: { state: 'not_observed' },
      recency: { state: 'observed', ageHours: 0 },
      bluesky: { state: 'not_configured' },
    },
  };
}

test('buildWeeklyLedger: representative fixture clusters canonical Today stories and publishes only canonical references', () => {
  const result = buildWeeklyLedger({
    todayStories: {
      stories: [
        {
          id: 'acme-atlas-release',
          category: 'models',
          headline: 'Acme releases Atlas model',
          source: { name: 'Canonical Wire', url: 'https://canonical.example/acme-atlas', publishedDate: '2026-08-31T12:00:00.000Z' },
        },
        {
          id: 'acme-atlas-report',
          category: 'models',
          headline: 'Acme releases Atlas model update',
          source: { name: 'Second Canonical Wire', url: 'https://canonical.example/acme-atlas-report', publishedDate: '2026-08-31T10:00:00.000Z' },
        },
      ],
    },
    gdeltResults: [
      { url: 'https://coverage-one.example/atlas', title: 'Acme releases Atlas model today', domain: 'coverage-one.example' },
      { url: 'https://coverage-two.example/atlas', title: 'Acme releases Atlas model today', domain: 'coverage-two.example' },
      { url: 'https://coverage-three.example/atlas', title: 'Acme releases Atlas model today', domain: 'coverage-three.example' },
    ],
    hackerNewsItems: [
      { id: 42, url: 'https://canonical.example/acme-atlas', title: 'Untrusted third-party headline', score: 300, descendants: 30 },
    ],
    now: '2026-08-31T18:00:00.000Z',
  });

  assert.equal(result.status, 'partial', 'one eligible cluster is an honestly limited-supply edition');
  assert.deepEqual(result.entries, [
    {
      rank: 1,
      leadStoryId: 'acme-atlas-release',
      memberStoryIds: ['acme-atlas-release', 'acme-atlas-report'],
      category: 'models',
      publishedAt: '2026-08-31T12:00:00.000Z',
      momentumScore: result.entries[0].momentumScore,
      signals: {
        coverage: {
          state: 'observed',
          independentOutletCount: 4,
          sampledDomains: ['canonical.example', 'coverage-one.example', 'coverage-three.example', 'coverage-two.example'],
        },
        hackerNews: { state: 'observed', points: 300, comments: 30, itemIds: [42] },
        recency: { state: 'observed', ageHours: 6 },
        bluesky: { state: 'not_configured' },
      },
    },
  ]);
  assert.ok(result.entries[0].momentumScore > 0);
  assert.equal(JSON.stringify(result).includes('Untrusted third-party headline'), false);
});

test('eligibility is UTC, inclusive at the exact seven-day boundary, and excludes invalid and future dates', () => {
  const result = eligibleTodayStories({
    stories: [
      story('boundary', 'research', 'Exact boundary', '2026-08-24T18:00:00.000Z'),
      story('current', 'research', 'Current', NOW),
      story('old', 'research', 'Too old', '2026-08-24T17:59:59.999Z'),
      story('future', 'research', 'Future', '2026-08-31T18:00:00.001Z'),
      story('bad-date', 'research', 'Bad date', 'not-a-date'),
      story('impossible-date', 'research', 'Impossible date', '2026-02-31'),
      { id: 'undated', category: 'research', headline: 'Undated', source: { name: 'Fixture Wire' } },
    ],
  }, { now: NOW });
  assert.deepEqual(result.map((item) => item.id), ['boundary', 'current']);
});

test('normalization removes known tracking data but preserves meaningful path and query identity', () => {
  assert.equal(
    canonicalizeUrl('https://WWW.Example.com:443/a/story/?utm_source=feed&topic=ai#section'),
    'https://example.com/a/story?topic=ai',
  );
  assert.equal(canonicalizeUrl('http://example.com/story'), undefined);
});

test('clustering refuses an adversarial same-category pair without four substantive overlapping tokens', () => {
  const stories = [
    story('model-launch', 'models', 'Atlas model launch improves coding', '2026-08-31T12:00:00.000Z'),
    story('model-policy', 'models', 'Atlas model faces new policy debate', '2026-08-31T11:00:00.000Z'),
  ];
  assert.equal(clusterTodayStories(stories).length, 2);
});

test('clustering chooses its lead by newest time, then allowlist order, then stable story ID', () => {
  const tied = [
    story('a-story', 'models', 'Atlas model release for developers', '2026-08-31T12:00:00.000Z', 'Later Wire'),
    story('z-story', 'models', 'Atlas model release for developers', '2026-08-31T12:00:00.000Z', 'Earlier Wire'),
  ];
  const [cluster] = clusterTodayStories(tied, { allowlistOrder: { 'Earlier Wire': 0, 'Later Wire': 1 } });
  assert.equal(cluster.lead.id, 'z-story');
});

test('missing HN evidence is distinct from observed zero and its score is renormalized', () => {
  const todayStories = { stories: [story('no-hn', 'research', 'A sufficiently specific research result', '2026-08-31T12:00:00.000Z')] };
  const common = { todayStories, gdeltResults: [], now: NOW };
  const missing = buildWeeklyLedger({ ...common, hackerNewsItems: [] });
  const observedZero = buildWeeklyLedger({ ...common, hackerNewsItems: [{ id: 7, url: 'https://no-hn.example/story', title: 'anything', score: 0, descendants: 0 }] });
  assert.equal(missing.entries[0].signals.hackerNews.state, 'not_observed');
  assert.deepEqual(observedZero.entries[0].signals.hackerNews, { state: 'observed', points: 0, comments: 0, itemIds: [7] });
  assert.ok(missing.entries[0].momentumScore > observedZero.entries[0].momentumScore);
});

test('provider failure produces explicit partial evidence and both core failures produce unavailable output', () => {
  const todayStories = { stories: [story('provider-story', 'research', 'A sufficiently specific research result', '2026-08-31T12:00:00.000Z')] };
  const partial = buildWeeklyLedger({
    todayStories,
    now: NOW,
    providerStates: { gdelt: { status: 'unavailable' }, hackerNews: { status: 'ok' } },
  });
  assert.equal(partial.status, 'partial');
  assert.deepEqual(partial.entries[0].signals.coverage, { state: 'provider_unavailable' });
  const unavailable = buildWeeklyLedger({
    todayStories,
    now: NOW,
    previousLastSuccessfulAt: '2026-08-30T18:00:00.000Z',
    providerStates: { gdelt: { status: 'unavailable' }, hackerNews: { status: 'unavailable' } },
  });
  assert.equal(unavailable.status, 'unavailable');
  assert.deepEqual(unavailable.entries, []);
  assert.equal(unavailable.lastSuccessfulAt, '2026-08-30T18:00:00.000Z');
});

test('selection caps a well-supplied category at 40% without padding to twelve', () => {
  const entries = [
    ...Array.from({ length: 6 }, (_, index) => rankedEntry(`models-${index}`, 'models', 100 - index)),
    ...Array.from({ length: 3 }, (_, index) => rankedEntry(`research-${index}`, 'research', 90 - index)),
    ...Array.from({ length: 3 }, (_, index) => rankedEntry(`labor-${index}`, 'labor', 80 - index)),
  ];
  const selected = selectDiverseEntries(entries);
  const counts = selected.reduce((byCategory, entry) => {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    return byCategory;
  }, Object.create(null));
  assert.equal(selected.length, 10);
  assert.equal(counts.models, 4);
  assert.equal(counts.research, 3);
  assert.equal(counts.labor, 3);
});

test('selection relaxes only for a scarce alternative category to retain eight eligible clusters', () => {
  const entries = [
    ...Array.from({ length: 7 }, (_, index) => rankedEntry(`models-${index}`, 'models', 100 - index)),
    rankedEntry('research-0', 'research', 80),
  ];
  const selected = selectDiverseEntries(entries);
  assert.equal(selected.length, 8);
  assert.equal(selected.filter((entry) => entry.category === 'research').length, 1);
});

test('selection does not overfill after relaxing a scarce category cap to the minimum eight', () => {
  const entries = [
    ...Array.from({ length: 19 }, (_, index) => rankedEntry(`models-${index}`, 'models', 100 - index)),
    rankedEntry('research-0', 'research', 1),
  ];
  const selected = selectDiverseEntries(entries);
  assert.equal(selected.length, 8);
  assert.equal(selected.filter((entry) => entry.category === 'models').length, 7);
  assert.equal(selected.filter((entry) => entry.category === 'research').length, 1);
});

test('the executable publication gate rejects invalid references, rank gaps, and zero-filled missing signals', () => {
  const todayStories = { stories: [story('valid-story', 'research', 'A sufficiently specific research result', '2026-08-31T12:00:00.000Z')] };
  const valid = buildWeeklyLedger({ todayStories, now: NOW });
  const invalid = structuredClone(valid);
  invalid.entries[0].leadStoryId = 'missing-story';
  invalid.entries[0].memberStoryIds = ['missing-story'];
  invalid.entries[0].rank = 2;
  invalid.entries[0].signals.hackerNews = { state: 'not_observed', points: 0 };
  const errors = validateWeeklyLedger(invalid, todayStories);
  assert.ok(errors.some((error) => error.includes('does not resolve')));
  assert.ok(errors.some((error) => error.includes('rank 1 is missing')));
  assert.ok(errors.some((error) => error.includes('additional properties')));
});

test('the executable publication gate rejects invalid timestamps and state/entry combinations', () => {
  const todayStories = { stories: [story('valid-story', 'research', 'A sufficiently specific research result', '2026-08-31T12:00:00.000Z')] };
  const valid = buildWeeklyLedger({ todayStories, now: NOW });
  const invalid = structuredClone(valid);
  invalid.windowStart = '2026-08-24T18:00:00.000+01:00';
  invalid.status = 'unavailable';
  const errors = validateWeeklyLedger(invalid, todayStories);
  assert.ok(errors.some((error) => error.includes('date-time') || error.includes('must match pattern')));
  assert.ok(errors.some((error) => error.includes('must NOT have more than 0 items')));
});

test('observed numeric provider evidence requires a retrieval timestamp', () => {
  const todayStories = { stories: [story('valid-story', 'research', 'A sufficiently specific research result', '2026-08-31T12:00:00.000Z')] };
  const invalid = buildWeeklyLedger({ todayStories, now: NOW });
  delete invalid.providers.gdelt.sampledAt;
  const errors = validateWeeklyLedger(invalid, todayStories);
  assert.ok(errors.some((error) => error.includes("must have required property 'sampledAt'")));
});

test('the publication gate rejects contradictory relational state against canonical Today content', () => {
  const todayStories = {
    stories: Array.from({ length: 8 }, (_, index) => story(
      `semantic-${index}`,
      index < 3 ? 'models' : index < 6 ? 'research' : 'labor',
      `Specific semantic result number ${index}`,
      '2026-08-31T12:00:00.000Z',
    )),
  };
  const valid = buildWeeklyLedger({ todayStories, now: NOW });
  assert.equal(valid.status, 'fresh');

  const freshWithUnavailableCore = structuredClone(valid);
  freshWithUnavailableCore.providers.gdelt.status = 'unavailable';
  assert.ok(validateWeeklyLedger(freshWithUnavailableCore, todayStories).some((error) => error.includes('fresh requires both core providers')));

  const invertedWindow = structuredClone(valid);
  invertedWindow.windowStart = invertedWindow.windowEnd;
  assert.ok(validateWeeklyLedger(invertedWindow, todayStories).some((error) => error.includes('windowStart must be before windowEnd')));

  const outsideWindow = structuredClone(valid);
  outsideWindow.entries[0].publishedAt = '2026-08-20T12:00:00.000Z';
  assert.ok(validateWeeklyLedger(outsideWindow, todayStories).some((error) => error.includes('is outside the declared window')));

  const inconsistentCategory = structuredClone(valid);
  inconsistentCategory.entries[0].category = 'compute-energy';
  assert.ok(validateWeeklyLedger(inconsistentCategory, todayStories).some((error) => error.includes('does not match canonical Today lead category')));

  const leadMissingFromMembers = structuredClone(valid);
  leadMissingFromMembers.entries[0].memberStoryIds = [leadMissingFromMembers.entries[1].leadStoryId];
  assert.ok(validateWeeklyLedger(leadMissingFromMembers, todayStories).some((error) => error.includes('must include leadStoryId')));

  const duplicatedMember = structuredClone(valid);
  duplicatedMember.entries[1].memberStoryIds = [duplicatedMember.entries[1].leadStoryId, duplicatedMember.entries[0].leadStoryId];
  assert.ok(validateWeeklyLedger(duplicatedMember, todayStories).some((error) => error.includes('appears in multiple clusters')));
});

test('the publication gate requires every entry signal state to agree with its provider state', () => {
  const todayStories = { stories: [story('provider-state-story', 'research', 'A sufficiently specific research result', '2026-08-31T12:00:00.000Z')] };
  const valid = buildWeeklyLedger({ todayStories, now: NOW });
  assert.deepEqual(validateWeeklyLedger(valid, todayStories), []);

  const mappings = [
    ['gdelt', 'coverage', { state: 'observed', independentOutletCount: 1, sampledDomains: ['fixture.example'] }],
    ['hackerNews', 'hackerNews', { state: 'observed', points: 0, comments: 0, itemIds: [] }],
    ['bluesky', 'bluesky', { state: 'observed', interactions: 0 }],
  ];
  for (const [provider, signal, observedSignal] of mappings) {
    const unavailable = structuredClone(valid);
    unavailable.providers[provider].status = 'unavailable';
    unavailable.entries[0].signals[signal] = observedSignal;
    assert.ok(
      validateWeeklyLedger(unavailable, todayStories).some((error) => error.includes(`provider ${provider} status unavailable requires ${signal} state provider_unavailable`)),
      `${provider} unavailable state must reject observed ${signal}`,
    );

    const notConfigured = structuredClone(valid);
    notConfigured.providers[provider].status = 'not_configured';
    notConfigured.entries[0].signals[signal] = observedSignal;
    assert.ok(
      validateWeeklyLedger(notConfigured, todayStories).some((error) => error.includes(`provider ${provider} status not_configured requires ${signal} state not_configured`)),
      `${provider} not-configured state must reject observed ${signal}`,
    );
  }
});

test('identical inputs and clock produce byte-equivalent logical output with stable tie-breaks', () => {
  const todayStories = {
    stories: [
      story('z-story', 'research', 'A sufficiently specific research result', '2026-08-31T12:00:00.000Z'),
      story('a-story', 'labor', 'A sufficiently specific labor result', '2026-08-31T12:00:00.000Z'),
    ],
  };
  const first = buildWeeklyLedger({ todayStories, now: NOW });
  const second = buildWeeklyLedger({ todayStories, now: NOW });
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(first.entries.map((entry) => entry.leadStoryId), ['a-story', 'z-story']);
});
