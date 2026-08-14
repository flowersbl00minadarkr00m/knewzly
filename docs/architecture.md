# How it works

Knewzly ships as two static pages sharing one content layer, no backend and no
build step.

## Content as data

Everything the atlas shows — anchors, typed relationships, source allowlist —
lives in versioned JSON under `content/`, validated against JSON Schemas in
the same folder. `src/content-loader.js` is the only module that reads it;
every view (timeline, constellation, Today) renders from the same loaded set.

## Atlas (`atlas.html`)

- **Timeline view** (`src/timeline-canvas.js`): the anchor spine laid out on a
  shared, intentionally non-proportional time axis across regional/philosophy
  lanes.
- **Constellation view** (`src/constellation-view.js`): the same anchors and
  relationships as a force-directed graph, toggled from the timeline.
- **Relationships & context** (`src/relationship-layer.js`,
  `src/context-drawer.js`): typed edges between anchors, with a drawer for an
  anchor's people/sources/story.
- **Visited state** (`src/visited-tracker.js`, `src/export-import.js`):
  tracked in `localStorage`, exportable/importable as a versioned JSON file —
  no account, nothing leaves the browser.

## Today (`today.html`)

A bounded, curated news panel that traces current AI stories back to the
historical anchor they descend from.

- A scheduled job (`scripts/refresh-today.js`, `.github/workflows/refresh-today.yml`)
  fetches from a small, human-reviewed source allowlist (`content/source-allowlist.json`)
  and publishes `content/today-stories.json` — nothing is fetched client-side.
- `scripts/categorize-story.js` tags each story against a fixed keyword
  vocabulary (`content/category-keywords.json`) for the section filters.
- `src/story-grid.js` renders the stories; `src/story-filters.js` +
  `src/section-nav.js` drive the category filter chips; `src/trace-to-origin.js`
  links each story to the anchor it traces to; `src/freshness-banner.js` warns
  when the feed is stale or the refresh job failed, rather than silently
  showing old news as current.

## Content trust model

Only sources on `content/source-allowlist.json` are ever fetched, and new
stories pass through `content/review-queue.json` for human review before
publication — there is no automated, unreviewed ingestion.
