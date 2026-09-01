import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publishWeeklyLedger, refreshPopularThisWeek } from '../scripts/refresh-popular-this-week.js';

const NOW = '2026-08-31T18:00:00.000Z';
const todayStories = {
  stories: [{
    id: 'canonical-story', category: 'models', headline: 'Atlas model release',
    source: { name: 'Canonical', url: 'https://canonical.example/atlas', publishedDate: '2026-08-31T12:00:00.000Z' },
  }],
};
const providerResults = {
  gdelt: { status: 'ok', sampledAt: NOW, queryCount: 6, articles: [{ url: 'https://coverage.example/atlas', title: 'Atlas model release', domain: 'coverage.example' }] },
  hackerNews: { status: 'unavailable', items: [], itemStates: {} },
};

test('one provider failure builds a partial candidate without passing third-party headlines into entries; both failures are unavailable', async () => {
  const partial = await refreshPopularThisWeek({ todayStories, now: NOW, providerResults, dryRun: true });
  assert.equal(partial.document.status, 'partial');
  assert.equal(JSON.stringify(partial.document).includes('Atlas model release'), false);

  const unavailable = await refreshPopularThisWeek({
    todayStories,
    now: NOW,
    dryRun: true,
    providerResults: { gdelt: { status: 'unavailable', articles: [] }, hackerNews: { status: 'unavailable', items: [] } },
  });
  assert.equal(unavailable.document.status, 'unavailable');
  assert.deepEqual(unavailable.document.entries, []);
});

test('incomplete GDELT plus an unavailable HN sample cannot become a fresh or partial publication', async () => {
  const result = await refreshPopularThisWeek({
    todayStories,
    now: NOW,
    dryRun: true,
    providerResults: {
      gdelt: { status: 'unavailable', attemptedQueries: 6, successfulQueries: 1, articles: [{ url: 'https://coverage.example/atlas', title: 'Atlas model release', domain: 'coverage.example' }] },
      hackerNews: { status: 'unavailable', sampledIds: 2, successfulItemRequests: 0, items: [], itemStates: { failed: 2 } },
    },
  });
  assert.equal(result.document.status, 'unavailable');
  assert.deepEqual(result.document.entries, []);
});

test('an unavailable refresh retains only the previous successful timestamp as context, never stale entries', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'knewzly-weekly-'));
  const output = join(dir, 'popular-this-week.json');
  await writeFile(output, JSON.stringify({ lastSuccessfulAt: '2026-08-30T18:00:00.000Z', entries: [{ stale: true }] }));
  const result = await refreshPopularThisWeek({
    todayStories,
    now: NOW,
    outputPath: output,
    dryRun: true,
    providerResults: { gdelt: { status: 'unavailable', articles: [] }, hackerNews: { status: 'unavailable', items: [] } },
  });
  assert.equal(result.document.lastSuccessfulAt, '2026-08-30T18:00:00.000Z');
  assert.deepEqual(result.document.entries, []);
});

test('a future previous-success timestamp is not carried into an earlier refresh window', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'knewzly-weekly-'));
  const output = join(dir, 'popular-this-week.json');
  await writeFile(output, JSON.stringify({ lastSuccessfulAt: '2026-09-01T18:00:00.000Z' }));
  const result = await refreshPopularThisWeek({
    todayStories,
    now: NOW,
    outputPath: output,
    dryRun: true,
    providerResults: { gdelt: { status: 'unavailable', articles: [] }, hackerNews: { status: 'unavailable', items: [] } },
  });
  assert.equal(result.document.lastSuccessfulAt, undefined);
});

test('dry-run performs provider reads but never writes the output bytes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'knewzly-weekly-'));
  const output = join(dir, 'popular-this-week.json');
  await writeFile(output, 'prior bytes\n');
  const before = await readFile(output, 'utf8');
  const result = await refreshPopularThisWeek({ todayStories, now: NOW, outputPath: output, dryRun: true, providerResults });
  assert.equal(result.dryRun, true);
  assert.equal(await readFile(output, 'utf8'), before);
});

test('validated same-directory temp publication preserves previous bytes on validation or rename failure', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'knewzly-weekly-'));
  const output = join(dir, 'popular-this-week.json');
  await writeFile(output, 'prior bytes\n');
  const prior = await readFile(output, 'utf8');

  await assert.rejects(publishWeeklyLedger({ document: { nope: true }, todayStories, outPath: output }), /validation/i);
  assert.equal(await readFile(output, 'utf8'), prior);

  const document = (await refreshPopularThisWeek({ todayStories, now: NOW, dryRun: true, providerResults })).document;
  await assert.rejects(publishWeeklyLedger({ document, todayStories, outPath: output, renameImpl: async () => { throw new Error('rename failed'); } }), /rename failed/);
  assert.equal(await readFile(output, 'utf8'), prior);
});
