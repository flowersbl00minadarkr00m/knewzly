import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, validateContent } from '../src/content-loader.js';
import { validateTodayStories } from '../src/today-stories-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, '..', 'content', 'fixtures');
const INVALID = path.join(FIXTURES, 'invalid');

/** Node-friendly reader for tests — no dev server needed. */
function fsReader(basePath) {
  return async (relPath) => {
    const file = relPath.replace(/^content\//, '');
    const full = path.join(basePath, file);
    return JSON.parse(await readFile(full, 'utf-8'));
  };
}

describe('T1: content schema + ContentLoader + validator', () => {
  test('loadContent reads all three fixture files via an injected reader', async () => {
    const content = await loadContent({ basePath: 'content/', reader: fsReader(FIXTURES) });
    assert.ok(Array.isArray(content.anchors.anchors), 'anchors.anchors should be an array');
    assert.ok(Array.isArray(content.relationships.relationships), 'relationships.relationships should be an array');
    assert.ok(Array.isArray(content.todayStories.stories), 'todayStories.stories should be an array');
  });

  test('valid anchor and relationship fixtures pass validateContent with zero errors', async () => {
    const content = await loadContent({ basePath: 'content/', reader: fsReader(FIXTURES) });
    const errors = validateContent({ anchors: content.anchors, relationships: content.relationships });
    assert.deepEqual(errors, [], `expected no validation errors, got: ${JSON.stringify(errors, null, 2)}`);
  });

  test('validator catches a dangling relationship ID (negative-path proof)', async () => {
    const anchors = JSON.parse(await readFile(path.join(FIXTURES, 'anchors.json'), 'utf-8'));
    const relationships = JSON.parse(await readFile(path.join(INVALID, 'dangling-relationship.json'), 'utf-8'));
    const errors = validateContent({ anchors, relationships });
    assert.ok(errors.length > 0, 'expected at least one validation error');
    assert.ok(
      errors.some((e) => e.includes('anchor-that-does-not-exist')),
      `expected an error naming the dangling id, got: ${JSON.stringify(errors)}`
    );
  });

  test('validator catches missing required provenance fields (negative-path proof)', async () => {
    const anchors = JSON.parse(await readFile(path.join(INVALID, 'missing-fields.json'), 'utf-8'));
    const errors = validateContent({ anchors, relationships: { relationships: [] } });
    assert.ok(errors.length > 0, 'expected at least one validation error');
    for (const field of ['claimType', 'confidence', 'source']) {
      assert.ok(
        errors.some((e) => e.includes(field)),
        `expected an error mentioning missing field "${field}", got: ${JSON.stringify(errors)}`
      );
    }
  });

  test('validator flags an invalid freshnessState', () => {
    const errors = validateContent({
      anchors: { anchors: [] },
      relationships: { relationships: [] },
      todayStories: { freshnessState: 'not-a-real-state', stories: [] },
    });
    assert.ok(errors.some((e) => e.includes('freshnessState')));
  });

  test('validator flags a today-story tracing to a nonexistent anchor', () => {
    const errors = validateContent({
      anchors: { anchors: [{ id: 'real-anchor' }] },
      relationships: { relationships: [] },
      todayStories: {
        freshnessState: 'fresh',
        stories: [
          {
            id: 'story-1',
            category: 'research',
            headline: 'Test',
            source: { name: 'Test', publishedDate: '2026-08-10' },
            traceToAnchors: ['nonexistent-anchor'],
          },
        ],
      },
    });
    assert.ok(errors.some((e) => e.includes('nonexistent-anchor')));
  });

  test('canonical Today validator accepts current production-shaped URL IDs and empty traces', async () => {
    const root = path.join(__dirname, '..', 'content');
    const [anchors, todayStories] = await Promise.all([
      readFile(path.join(root, 'anchors.json'), 'utf-8').then(JSON.parse),
      readFile(path.join(root, 'today-stories.json'), 'utf-8').then(JSON.parse),
    ]);
    assert.deepEqual(validateTodayStories(todayStories, anchors), []);
  });

  test('canonical Today validator rejects structural mutations and dangling non-empty traces', () => {
    const valid = {
      lastUpdated: '2026-08-31T23:47:49.525Z',
      freshnessState: 'fresh',
      stories: [{
        id: 'https://example.com/feed/123',
        category: 'research',
        headline: 'A valid story',
        source: { name: 'Example', url: 'https://example.com/story', publishedDate: '2026-08-31' },
        traceToAnchors: [],
      }],
    };
    const anchors = { anchors: [{ id: 'real-anchor' }] };
    const mutations = [
      { mutate: (candidate) => { candidate.stories = {}; }, label: 'stories type' },
      { mutate: (candidate) => { delete candidate.stories[0].headline; }, label: 'required story field' },
      { mutate: (candidate) => { candidate.stories[0].source.publishedDate = '2026-02-30'; }, label: 'source date' },
      { mutate: (candidate) => { candidate.freshnessState = 'live'; }, label: 'freshness enum' },
      { mutate: (candidate) => { candidate.stories[0].source.url = 'http://example.com/story'; }, label: 'HTTPS source URL' },
      { mutate: (candidate) => { candidate.stories[0].traceToAnchors = ['missing-anchor']; }, label: 'dangling trace' },
    ];

    for (const { mutate, label } of mutations) {
      const candidate = structuredClone(valid);
      mutate(candidate);
      assert.ok(validateTodayStories(candidate, anchors).length > 0, `expected ${label} mutation to fail`);
    }
  });
});
