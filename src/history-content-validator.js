import { createRequire } from 'node:module';

import Ajv2020 from 'ajv/dist/2020.js';

import { validateContent } from './content-loader.js';

const require = createRequire(import.meta.url);
const anchorsSchema = require('../content/anchors.schema.json');
const relationshipsSchema = require('../content/relationships.schema.json');

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateAnchorsDocument = ajv.compile(anchorsSchema);
const validateRelationshipsDocument = ajv.compile(relationshipsSchema);
const validateAnchorRecord = ajv.compile(anchorsSchema.$defs.anchor);
const validateRelationshipRecord = ajv.compile(relationshipsSchema.$defs.relationship);

function pointerSegments(pointer = '') {
  return pointer
    .split('/')
    .slice(1)
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));
}

function appendPath(base, segment) {
  if (/^\d+$/.test(segment)) return `${base}[${segment}]`;
  return base ? `${base}.${segment}` : segment;
}

function errorPath(base, error) {
  let path = pointerSegments(error.instancePath).reduce(appendPath, base);
  if (error.keyword === 'required' && error.params?.missingProperty) {
    path = appendPath(path, error.params.missingProperty);
  }
  return path || base || 'content';
}

function schemaErrors(errors, base) {
  return (errors ?? []).map((error) => ({
    code: `schema.${error.keyword}`,
    path: errorPath(base, error),
    message: `${errorPath(base, error)} ${error.message ?? 'is invalid'}.`,
  }));
}

function duplicateErrors(items, kind, pathPrefix) {
  const seen = new Set();
  const errors = [];
  items.forEach((item, index) => {
    if (typeof item?.id !== 'string' || !item.id) return;
    if (seen.has(item.id)) {
      errors.push({
        code: `${kind}.duplicate`,
        path: `${pathPrefix}[${index}].id`,
        message: `${kind === 'anchor' ? 'Anchor' : 'Relationship'} ID "${item.id}" is duplicated.`,
      });
    }
    seen.add(item.id);
  });
  return errors;
}

export function validateAnchor(anchor, { path = 'anchor' } = {}) {
  const ok = validateAnchorRecord(anchor);
  return ok ? [] : schemaErrors(validateAnchorRecord.errors, path);
}

export function validateRelationship(relationship, { path = 'relationship' } = {}) {
  const ok = validateRelationshipRecord(relationship);
  return ok ? [] : schemaErrors(validateRelationshipRecord.errors, path);
}

export function validateHistoryContent(anchorsDocument, relationshipsDocument) {
  const errors = [];
  if (!validateAnchorsDocument(anchorsDocument)) {
    errors.push(...schemaErrors(validateAnchorsDocument.errors, ''));
  }
  if (!validateRelationshipsDocument(relationshipsDocument)) {
    errors.push(...schemaErrors(validateRelationshipsDocument.errors, ''));
  }

  const anchors = Array.isArray(anchorsDocument?.anchors) ? anchorsDocument.anchors : [];
  const relationships = Array.isArray(relationshipsDocument?.relationships)
    ? relationshipsDocument.relationships
    : [];
  errors.push(...duplicateErrors(anchors, 'anchor', 'anchors'));
  errors.push(...duplicateErrors(relationships, 'relationship', 'relationships'));

  const anchorIds = new Set(anchors.map(({ id }) => id));
  relationships.forEach((relationship, index) => {
    for (const endpoint of ['from', 'to']) {
      if (relationship?.[endpoint] && !anchorIds.has(relationship[endpoint])) {
        errors.push({
          code: 'relationship.endpoint-unresolved',
          path: `relationships[${index}].${endpoint}`,
          message: `Relationship "${relationship.id ?? '(no id)'}" ${endpoint} endpoint "${relationship[endpoint]}" does not resolve to an anchor.`,
        });
      }
    }
  });

  const compatibilityErrors = validateContent({
    anchors: anchorsDocument,
    relationships: relationshipsDocument,
  });
  for (const message of compatibilityErrors) {
    errors.push({
      code: 'content.compatibility',
      path: 'content',
      message,
    });
  }

  return { ok: errors.length === 0, errors };
}
