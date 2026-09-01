import Ajv2020 from 'ajv/dist/2020.js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const schema = require('../content/today-stories.schema.json');

function isIsoDate(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isIsoDateTime(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;

  const [, date, hour, minute, second, offsetHour, offsetMinute] = match;
  if (
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    (offsetHour !== undefined && (Number(offsetHour) > 23 || Number(offsetMinute) > 59))
  ) {
    return false;
  }

  return isIsoDate(date) && !Number.isNaN(Date.parse(value));
}

function isPublicHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: true });
ajv.addFormat('date', { type: 'string', validate: isIsoDate });
ajv.addFormat('date-time', { type: 'string', validate: isIsoDateTime });
ajv.addFormat('https-url', { type: 'string', validate: isPublicHttpsUrl });

// Compile once here so runtime readers, content tests, and publication use the
// exact same executable contract rather than independent handwritten checks.
const validateSchema = ajv.compile(schema);

export function validateTodayStoriesSchema(todayStories) {
  if (validateSchema(todayStories)) return [];
  return validateSchema.errors.map((error) => {
    const location = error.instancePath || '/';
    if (error.keyword === 'format' && error.params.format === 'https-url') {
      return `today-stories.json${location} must be a public HTTPS URL`;
    }
    return `today-stories.json${location} ${error.message}`;
  });
}

/**
 * The only Today rule outside JSON Schema: non-empty traces must point to
 * actual anchors in the companion content file.
 */
export function validateTodayStories(todayStories, anchors) {
  const errors = validateTodayStoriesSchema(todayStories);
  const anchorIds = new Set(
    Array.isArray(anchors?.anchors)
      ? anchors.anchors.map((anchor) => anchor?.id).filter((id) => typeof id === 'string')
      : []
  );

  for (const story of Array.isArray(todayStories?.stories) ? todayStories.stories : []) {
    if (!Array.isArray(story?.traceToAnchors)) continue;
    for (const anchorId of story.traceToAnchors) {
      if (!anchorIds.has(anchorId)) {
        errors.push(
          `today-story "${story.id ?? '(no id)'}" has traceToAnchors entry "${anchorId}" which does not resolve to any anchor id`
        );
      }
    }
  }

  return errors;
}
