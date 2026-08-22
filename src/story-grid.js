// StoryGrid / StoryCard — formalizes present-day-newspaper-concept.html's
// story-card pattern (design.md §4) against content/today-stories.json data
// (design.md §5). FR-005, FR-006 (trace connection stated in text),
// FR-011 (provenance visible on every story).
//
// Full "trace to origin" navigation into the Atlas ContextDrawer is T9's
// job (blocked on this task + T5). Here we only render the story→anchor
// connection as explicit text, per FR-006's "stated in text, not implied by
// proximity alone" — satisfied even before T9 wires the actual navigation.

function textOrFallback(value, fallback) {
  return value && String(value).trim() ? String(value) : fallback;
}

/**
 * @param {object} story - one entry from today-stories.json's `stories` array
 * @returns {HTMLElement}
 */
export function createStoryCard(story) {
  const card = document.createElement('article');
  card.className = 'story-card';
  card.setAttribute('role', 'listitem');
  if (story.id) card.dataset.storyId = story.id;
  if (story.category) card.dataset.category = story.category;

  const category = document.createElement('p');
  category.className = 'story-card-category';
  category.textContent = textOrFallback(story.category, 'uncategorized');
  card.appendChild(category);

  const heading = document.createElement('h3');
  heading.className = 'story-card-headline';
  heading.textContent = textOrFallback(story.headline, '(untitled story)');
  card.appendChild(heading);

  if (story.dek) {
    const dek = document.createElement('p');
    dek.className = 'story-card-dek';
    dek.textContent = story.dek;
    card.appendChild(dek);
  }

  const meta = document.createElement('div');
  meta.className = 'story-card-meta';

  // Provenance (FR-011): source name + published date, always shown, never
  // presented as verified fact without attribution.
  const source = document.createElement('p');
  source.className = 'story-card-source';
  const src = story.source || {};
  const sourceText = `${textOrFallback(src.name, 'Unknown source')} · ${textOrFallback(src.publishedDate, 'undated')}`;
  if (src.url) {
    const link = document.createElement('a');
    link.href = src.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = sourceText;
    source.appendChild(link);
  } else {
    source.textContent = sourceText;
  }
  meta.appendChild(source);

  // Trace-to-origin connection, stated explicitly in text (FR-006).
  if (Array.isArray(story.traceToAnchors) && story.traceToAnchors.length > 0) {
    const trace = document.createElement('p');
    trace.className = 'story-card-trace';
    trace.textContent = `Traces to → ${textOrFallback(story.traceLabel, story.traceToAnchors.join(', '))}`;
    meta.appendChild(trace);
  }

  card.appendChild(meta);
  return card;
}

/**
 * @param {HTMLElement} container
 * @param {object[]} stories
 */
export function renderStoryGrid(container, stories) {
  container.innerHTML = '';
  container.setAttribute('role', 'list');

  if (!Array.isArray(stories) || stories.length === 0) {
    renderStoryGridEmpty(container);
    return;
  }

  for (const story of stories) {
    container.appendChild(createStoryCard(story));
  }
}

/**
 * Explicit empty state (design.md §9 Edge Cases) — zero stories is shown
 * plainly, never as a blank/broken-looking panel.
 */
export function renderStoryGridEmpty(container, message = 'No current stories are available right now.') {
  container.innerHTML = '';
  const empty = document.createElement('p');
  empty.className = 'story-grid-empty';
  empty.textContent = message;
  container.appendChild(empty);
}

/**
 * Explicit fetch-failure state — used when today-stories.json itself could
 * not be loaded at all. Never left as an empty/misleadingly-normal panel
 * (T8 Acceptance Criteria).
 */
export function renderStoryGridError(container, message = "Today's stories could not be loaded.") {
  container.innerHTML = '';
  const error = document.createElement('p');
  error.className = 'story-grid-error';
  error.setAttribute('role', 'alert');
  error.textContent = message;
  container.appendChild(error);
}
