import { createHash, randomUUID } from 'node:crypto';

import {
  validateAnchor,
  validateHistoryContent,
  validateRelationship,
} from './history-content-validator.js';

const DRAFT_SCHEMA_VERSION = 1;

function clone(value) {
  return structuredClone(value);
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanStringArray(value) {
  return Array.isArray(value)
    ? value.map(cleanString).filter(Boolean)
    : [];
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function stableErrors(errors) {
  const unique = new Map();
  for (const error of errors) {
    unique.set(`${error.code}\0${error.path}\0${error.message}`, error);
  }
  return [...unique.values()].sort((left, right) => (
    left.path.localeCompare(right.path)
    || left.code.localeCompare(right.code)
    || left.message.localeCompare(right.message)
  ));
}

function normalizeAnchor(anchor) {
  if (!anchor || typeof anchor !== 'object' || Array.isArray(anchor)) return null;
  const normalized = {
    id: cleanString(anchor.id),
    title: cleanString(anchor.title),
    date: {
      display: cleanString(anchor.date?.display),
      sortKey: anchor.date?.sortKey,
    },
    lane: cleanString(anchor.lane),
    story: cleanString(anchor.story),
    people: cleanStringArray(anchor.people),
    topics: cleanStringArray(anchor.topics),
    claimType: cleanString(anchor.claimType),
    confidence: cleanString(anchor.confidence),
    source: {
      label: cleanString(anchor.source?.label),
      url: cleanString(anchor.source?.url),
      accessedDate: cleanString(anchor.source?.accessedDate),
    },
  };
  const themes = cleanStringArray(anchor.themes);
  if (themes.length > 0) normalized.themes = themes;
  return normalized;
}

function normalizeRelationship(relationship) {
  return {
    id: cleanString(relationship?.id),
    from: cleanString(relationship?.from),
    to: cleanString(relationship?.to),
    type: cleanString(relationship?.type),
    confidence: cleanString(relationship?.confidence),
    claimType: cleanString(relationship?.claimType),
    label: cleanString(relationship?.label),
  };
}

function normalizeCapture(capture) {
  return {
    workingTitle: cleanString(capture?.workingTitle),
    whyItMatters: cleanString(capture?.whyItMatters),
    sourceUrls: cleanStringArray(capture?.sourceUrls),
  };
}

export function createDraft(
  input = {},
  { now = () => new Date().toISOString(), createId = randomUUID } = {},
) {
  const timestamp = now();
  const draft = {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    draftId: cleanString(input.draftId) || createId(),
    createdAt: cleanString(input.createdAt) || timestamp,
    updatedAt: cleanString(input.updatedAt) || timestamp,
    capture: normalizeCapture(input.capture),
    anchor: normalizeAnchor(input.anchor),
    relationships: Array.isArray(input.relationships)
      ? input.relationships.map(normalizeRelationship)
      : [],
  };
  const complete = validateCapture(draft.capture).length === 0
    && draft.anchor !== null
    && validateAnchor(draft.anchor).length === 0
    && candidateSemanticErrors(draft.anchor).length === 0
    && draft.relationships.every((relationship) => validateRelationship(relationship).length === 0);
  return { ...draft, state: complete ? 'complete' : 'incomplete' };
}

export function validateCapture(capture) {
  const normalized = normalizeCapture(capture);
  const errors = [];
  for (const field of ['workingTitle', 'whyItMatters']) {
    if (!normalized[field]) {
      errors.push({
        code: 'capture.required',
        path: `capture.${field}`,
        message: `${field === 'workingTitle' ? 'Working title' : 'Why it matters'} is required for quick capture.`,
      });
    }
  }
  if (normalized.sourceUrls.length === 0) {
    errors.push({
      code: 'capture.required',
      path: 'capture.sourceUrls',
      message: 'At least one HTTPS source URL is required for quick capture.',
    });
  } else {
    normalized.sourceUrls.forEach((sourceUrl, index) => {
      if (!isHttpsUrl(sourceUrl)) {
        errors.push({
          code: 'source.https-required',
          path: `capture.sourceUrls[${index}]`,
          message: 'Source URLs must use HTTPS and include a hostname.',
        });
      }
    });
  }
  return errors;
}

function candidateSemanticErrors(anchor) {
  const errors = [];
  if (!cleanString(anchor?.date?.display)) {
    errors.push({ code: 'date.display-required', path: 'anchor.date.display', message: 'A learner-facing displayed date is required.' });
  }
  if (!isHttpsUrl(anchor?.source?.url)) {
    errors.push({ code: 'source.https-required', path: 'anchor.source.url', message: 'The canonical source URL must use HTTPS and include a hostname.' });
  }
  if (!isCalendarDate(anchor?.source?.accessedDate ?? '')) {
    errors.push({ code: 'date.invalid', path: 'anchor.source.accessedDate', message: 'The accessed date must be a real calendar date in YYYY-MM-DD form.' });
  }
  return errors;
}

export function serializeCanonicalDocument(document) {
  return `${JSON.stringify(document, null, 2)}\n`;
}

export function digestCanonicalDocument(document) {
  return createHash('sha256').update(serializeCanonicalDocument(document), 'utf8').digest('hex');
}

function previewText(anchor, relationships) {
  const relationshipText = relationships.length === 0
    ? 'No proposed relationships; the anchor will be unconnected.'
    : relationships.map((relationship) => (
      `${relationship.from} ${relationship.type} ${relationship.to}: ${relationship.label}`
    )).join('\n');
  return [
    'Draft preview — not published',
    `${anchor.date.display} — ${anchor.title} (${anchor.lane})`,
    anchor.story,
    `Claim type: ${anchor.claimType}. Confidence: ${anchor.confidence}.`,
    `Source: ${anchor.source.label} — ${anchor.source.url} — accessed ${anchor.source.accessedDate}.`,
    relationshipText,
    'Content structure valid. This is not an independent verification that the historical claim is true.',
  ].join('\n');
}

export function prepareCandidate({ draft, anchorsDocument, relationshipsDocument }) {
  const normalizedDraft = createDraft(draft, {
    now: () => cleanString(draft?.updatedAt) || cleanString(draft?.createdAt) || '1970-01-01T00:00:00.000Z',
    createId: () => cleanString(draft?.draftId) || 'draft',
  });
  const errors = [...validateCapture(normalizedDraft.capture)];
  const warnings = [];

  if (!normalizedDraft.anchor) {
    errors.push({ code: 'anchor.required', path: 'anchor', message: 'Complete anchor fields are required for preview and promotion.' });
  } else {
    errors.push(...validateAnchor(normalizedDraft.anchor, { path: 'anchor' }));
    errors.push(...candidateSemanticErrors(normalizedDraft.anchor));
  }

  normalizedDraft.relationships.forEach((relationship, index) => {
    errors.push(...validateRelationship(relationship, { path: `relationships[${index}]` }));
  });

  const canonicalAnchors = Array.isArray(anchorsDocument?.anchors) ? anchorsDocument.anchors : [];
  const canonicalRelationships = Array.isArray(relationshipsDocument?.relationships)
    ? relationshipsDocument.relationships
    : [];
  const existingAnchorIds = new Set(canonicalAnchors.map(({ id }) => id));
  const existingRelationshipIds = new Set(canonicalRelationships.map(({ id }) => id));

  if (normalizedDraft.anchor && existingAnchorIds.has(normalizedDraft.anchor.id)) {
    errors.push({
      code: 'anchor.duplicate',
      path: 'anchor.id',
      message: `Anchor ID "${normalizedDraft.anchor.id}" already exists.`,
    });
  }

  const candidateRelationshipIds = new Set();
  const resolvableAnchorIds = new Set(existingAnchorIds);
  if (normalizedDraft.anchor?.id) resolvableAnchorIds.add(normalizedDraft.anchor.id);
  normalizedDraft.relationships.forEach((relationship, index) => {
    if (existingRelationshipIds.has(relationship.id) || candidateRelationshipIds.has(relationship.id)) {
      errors.push({
        code: 'relationship.duplicate',
        path: `relationships[${index}].id`,
        message: `Relationship ID "${relationship.id}" already exists or is repeated in this draft.`,
      });
    }
    candidateRelationshipIds.add(relationship.id);
    for (const endpoint of ['from', 'to']) {
      if (relationship[endpoint] && !resolvableAnchorIds.has(relationship[endpoint])) {
        errors.push({
          code: 'relationship.endpoint-unresolved',
          path: `relationships[${index}].${endpoint}`,
          message: `Endpoint "${relationship[endpoint]}" does not resolve to an existing or same-draft anchor.`,
        });
      }
    }
  });

  if (normalizedDraft.relationships.length === 0) {
    warnings.push({
      code: 'relationship.none',
      path: 'relationships',
      message: 'This valid candidate has no proposed relationships and will be unconnected.',
    });
  }

  const initialErrors = stableErrors(errors);
  if (initialErrors.length > 0) return { ok: false, errors: initialErrors, warnings };

  const augmentedAnchors = {
    ...clone(anchorsDocument),
    anchors: [...clone(canonicalAnchors), clone(normalizedDraft.anchor)],
  };
  const augmentedRelationships = {
    ...clone(relationshipsDocument),
    relationships: [...clone(canonicalRelationships), ...clone(normalizedDraft.relationships)],
  };
  const finalValidation = validateHistoryContent(augmentedAnchors, augmentedRelationships);
  if (!finalValidation.ok) {
    return { ok: false, errors: stableErrors(finalValidation.errors), warnings };
  }

  const relationshipIds = normalizedDraft.relationships.map(({ id }) => id);
  return {
    ok: true,
    errors: [],
    warnings,
    data: {
      draftState: 'complete',
      anchor: clone(normalizedDraft.anchor),
      relationships: clone(normalizedDraft.relationships),
      anchorsDocument: augmentedAnchors,
      relationshipsDocument: augmentedRelationships,
      baseDigests: {
        anchors: digestCanonicalDocument(anchorsDocument),
        relationships: digestCanonicalDocument(relationshipsDocument),
      },
      diff: {
        anchorIds: [normalizedDraft.anchor.id],
        relationshipIds,
        paths: [
          'content/anchors.json',
          ...(relationshipIds.length > 0 ? ['content/relationships.json'] : []),
        ],
      },
      preview: {
        label: 'Draft preview — not published',
        structureStatus: 'Content structure valid',
        historicalClaimVerified: false,
        anchor: clone(normalizedDraft.anchor),
        relationships: clone(normalizedDraft.relationships),
        text: previewText(normalizedDraft.anchor, normalizedDraft.relationships),
      },
    },
  };
}
