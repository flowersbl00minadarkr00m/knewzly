import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createDraft,
  prepareCandidate,
  serializeCanonicalDocument,
  validateCapture,
} from '../src/history-authoring.js';
import { validateHistoryContent } from '../src/history-content-validator.js';

const [canonicalAnchors, canonicalRelationships] = await Promise.all([
  readFile(new URL('../content/anchors.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../content/relationships.json', import.meta.url), 'utf8').then(JSON.parse),
]);

const fixedNow = () => '2026-09-02T00:00:00.000Z';
const fixedId = () => 'draft-feature-004';

function representativeDraft(overrides = {}) {
  const base = {
    draftId: 'draft-feature-004',
    schemaVersion: 1,
    createdAt: '2026-09-02T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    capture: {
      workingTitle: '  A representative history anchor  ',
      whyItMatters: '  It proves the authoring seam without publishing test content.  ',
      sourceUrls: ['  https://example.com/history/source  '],
    },
    anchor: {
      id: 'feature-004-test-anchor',
      title: 'A representative history anchor',
      date: { display: '2026', sortKey: 2026 },
      lane: 'north-america',
      story: 'A learner-readable account with its uncertainty and provenance kept visible.',
      people: ['Example Researcher'],
      topics: ['authoring safety'],
      themes: ['history inbox'],
      claimType: 'fact',
      confidence: 'high',
      source: {
        label: 'Example primary source',
        url: 'https://example.com/history/source',
        accessedDate: '2026-09-01',
      },
    },
    relationships: [{
      id: 'feature-004-test-anchor-turing',
      from: 'feature-004-test-anchor',
      to: 'turing',
      type: 'influenced',
      confidence: 'documented',
      claimType: 'fact',
      label: 'Representative candidate → Turing test fixture connection.',
    }],
  };
  return structuredClone({ ...base, ...overrides });
}

function prepare(draft = representativeDraft()) {
  return prepareCandidate({
    draft,
    anchorsDocument: canonicalAnchors,
    relationshipsDocument: canonicalRelationships,
  });
}

test('T2 quick capture normalizes deterministically and remains incomplete', () => {
  const input = {
    capture: {
      workingTitle: '  Working title ',
      whyItMatters: ' Why this belongs in the atlas. ',
      sourceUrls: [' https://example.com/source '],
    },
  };
  const original = structuredClone(input);
  const draft = createDraft(input, { now: fixedNow, createId: fixedId });

  assert.deepEqual(input, original, 'normalization must not mutate caller input');
  assert.equal(draft.schemaVersion, 1);
  assert.equal(draft.draftId, 'draft-feature-004');
  assert.equal(draft.createdAt, '2026-09-02T00:00:00.000Z');
  assert.equal(draft.updatedAt, '2026-09-02T00:00:00.000Z');
  assert.equal(draft.state, 'incomplete');
  assert.deepEqual(draft.capture, {
    workingTitle: 'Working title',
    whyItMatters: 'Why this belongs in the atlas.',
    sourceUrls: ['https://example.com/source'],
  });
  assert.deepEqual(validateCapture(draft.capture), []);

  const invalid = validateCapture({
    workingTitle: '',
    whyItMatters: '',
    sourceUrls: ['http://example.com/not-secure'],
  });
  assert.deepEqual(
    invalid.map(({ code, path }) => [code, path]),
    [
      ['capture.required', 'capture.workingTitle'],
      ['capture.required', 'capture.whyItMatters'],
      ['source.https-required', 'capture.sourceUrls[0]'],
    ],
  );
});

test('T2 real schemas and current canonical corpus validate', () => {
  const result = validateHistoryContent(canonicalAnchors, canonicalRelationships);
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.deepEqual(result.errors, []);

  const broken = structuredClone(canonicalAnchors);
  delete broken.anchors[0].source;
  const invalid = validateHistoryContent(broken, canonicalRelationships);
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.some(({ code, path }) => code === 'schema.required' && path.endsWith('.source')));
});

test('T2 representative candidate appends without mutation or reordering', () => {
  const draft = representativeDraft();
  const beforeDraft = structuredClone(draft);
  const beforeAnchors = structuredClone(canonicalAnchors);
  const beforeRelationships = structuredClone(canonicalRelationships);

  const result = prepare(draft);
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.equal(createDraft(draft).state, 'complete');
  assert.deepEqual(result.errors, []);
  assert.deepEqual(draft, beforeDraft);
  assert.deepEqual(canonicalAnchors, beforeAnchors);
  assert.deepEqual(canonicalRelationships, beforeRelationships);

  assert.deepEqual(
    result.data.anchorsDocument.anchors.slice(0, -1),
    canonicalAnchors.anchors,
  );
  assert.deepEqual(
    result.data.relationshipsDocument.relationships.slice(0, -1),
    canonicalRelationships.relationships,
  );
  assert.equal(result.data.anchorsDocument.anchors.at(-1).id, 'feature-004-test-anchor');
  assert.equal(result.data.relationshipsDocument.relationships.at(-1).id, 'feature-004-test-anchor-turing');
  assert.deepEqual(result.data.diff, {
    anchorIds: ['feature-004-test-anchor'],
    relationshipIds: ['feature-004-test-anchor-turing'],
    paths: ['content/anchors.json', 'content/relationships.json'],
  });
  assert.equal(result.data.preview.label, 'Draft preview — not published');
  assert.equal(result.data.preview.structureStatus, 'Content structure valid');
  assert.equal(result.data.preview.historicalClaimVerified, false);
  assert.match(result.data.preview.text, /not an independent verification/i);
  assert.match(result.data.baseDigests.anchors, /^[a-f0-9]{64}$/);
  assert.match(result.data.baseDigests.relationships, /^[a-f0-9]{64}$/);
});

test('T2 zero relationships remains promotable with an explicit warning', () => {
  const result = prepare(representativeDraft({ relationships: [] }));
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.deepEqual(result.data.diff.relationshipIds, []);
  assert.ok(result.warnings.some(({ code }) => code === 'relationship.none'));
});

test('T2 invalid candidates fail closed with stable field-linked errors', () => {
  const existingRelationshipId = canonicalRelationships.relationships[0].id;
  const cases = [
    ['duplicate anchor', (draft) => { draft.anchor.id = canonicalAnchors.anchors[0].id; }, 'anchor.duplicate', 'anchor.id'],
    ['duplicate relationship', (draft) => { draft.relationships[0].id = existingRelationshipId; }, 'relationship.duplicate', 'relationships[0].id'],
    ['missing endpoint', (draft) => { draft.relationships[0].to = 'missing-anchor'; }, 'relationship.endpoint-unresolved', 'relationships[0].to'],
    ['bad anchor id', (draft) => { draft.anchor.id = 'Not Valid'; }, 'schema.pattern', 'anchor.id'],
    ['bad lane', (draft) => { draft.anchor.lane = 'antarctica'; }, 'schema.enum', 'anchor.lane'],
    ['bad anchor claim', (draft) => { draft.anchor.claimType = 'hypothesis'; }, 'schema.enum', 'anchor.claimType'],
    ['bad anchor confidence', (draft) => { draft.anchor.confidence = 'certain'; }, 'schema.enum', 'anchor.confidence'],
    ['bad sort date', (draft) => { draft.anchor.date.sortKey = '2026'; }, 'schema.type', 'anchor.date.sortKey'],
    ['bad accessed date', (draft) => { draft.anchor.source.accessedDate = '2026-02-30'; }, 'date.invalid', 'anchor.source.accessedDate'],
    ['non-HTTPS source', (draft) => { draft.anchor.source.url = 'http://example.com/source'; }, 'source.https-required', 'anchor.source.url'],
    ['bad relationship type', (draft) => { draft.relationships[0].type = 'resembles'; }, 'schema.enum', 'relationships[0].type'],
    ['bad relationship confidence', (draft) => { draft.relationships[0].confidence = 'high'; }, 'schema.enum', 'relationships[0].confidence'],
    ['bad relationship claim', (draft) => { draft.relationships[0].claimType = 'hypothesis'; }, 'schema.enum', 'relationships[0].claimType'],
  ];

  for (const [label, mutate, expectedCode, expectedPath] of cases) {
    const draft = representativeDraft();
    mutate(draft);
    const result = prepare(draft);
    assert.equal(result.ok, false, `${label} must fail closed`);
    assert.equal(result.data, undefined, `${label} must not expose promotable documents`);
    assert.ok(
      result.errors.some(({ code, path }) => code === expectedCode && path === expectedPath),
      `${label}: expected ${expectedCode} at ${expectedPath}, got ${JSON.stringify(result.errors)}`,
    );
  }
});

test('T2 identical inputs produce deterministic logical output and canonical bytes', () => {
  const first = prepare();
  const second = prepare();
  assert.deepEqual(first, second);
  assert.equal(first.ok, true);

  const anchorBytes = serializeCanonicalDocument(first.data.anchorsDocument);
  const relationshipBytes = serializeCanonicalDocument(first.data.relationshipsDocument);
  assert.ok(anchorBytes.endsWith('\n'));
  assert.ok(relationshipBytes.endsWith('\n'));
  assert.deepEqual(JSON.parse(anchorBytes), first.data.anchorsDocument);
  assert.deepEqual(JSON.parse(relationshipBytes), first.data.relationshipsDocument);
});
