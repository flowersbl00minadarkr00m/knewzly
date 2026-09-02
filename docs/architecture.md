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

## Local History Inbox

`npm run history:inbox` starts `scripts/history-inbox-server.js` as a loopback-only Node service on `127.0.0.1` with an ephemeral port and random per-process token. The server exposes only an allowlist of Inbox and production-renderer assets. Mutations require the exact local Origin, Host, token, JSON content type, and bounded request size; the tool performs no outbound fetch, Git operation, or deployment action.

Drafts are written atomically to `.knewzly/history-inbox.json`. The store is versioned and its nested draft and receipt shapes are validated on every read. A malformed store puts the Inbox into named read-only mode so canonical content remains available for inspection but cannot be promoted.

Preview reuses the production drawer, Timeline, and Constellation renderers against canonical content plus the draft. The UI labels every candidate as unpublished and invalidates the preview after any form mutation. Structural validation never claims that a historical assertion is independently verified.

Promotion is an explicit local transaction over `content/anchors.json` and `content/relationships.json`. It rechecks preview digests, rebuilds the candidate from the saved draft, validates staged bytes, stores originals under `.knewzly/history-inbox-backups/<transaction-id>/`, replaces both files, and validates the final content. A write failure restores both original byte sequences. If restoration itself fails, further promotion locks and the error names the backup location; stop the server, copy the affected original file or files back from that directory, validate with `npm test`, and restart only after the corpus is repaired.

The Inbox, server, local state, backups, and authoring-only modules are excluded by `.vercelignore`. Production remains a static learner site. Maintainers review `git diff`, run tests, and choose whether to commit and push separately; the Inbox never crosses that release boundary.
