# Feature: Global History Atlas (F01)

> Status: Approved
> Source: `.ai/sdd/PLAN.md` (F01, F03 boundary bundled per Henry's decision — see D-002); non-binding spike at `artifacts/planning/f01-global-history-atlas/`

## Overview

The Global History Atlas is Knewzly's entry experience: a curated, browsable history of AI and innovation, organized by time and region, with typed relationships connecting events across lanes. Learners select anchor events to read their story, sources, and connections. A bounded Today panel lets learners trace a current AI news story back to the historical anchor(s) it descends from. Engaging with an anchor — directly or via a Today trace — highlights it as visited, and that visited state persists on the learner's device and can be exported/re-imported without requiring an account.

This spec covers F01 (atlas browsing, typed relationships, visited state) bundled with the bounded F03 news-trace loop needed to make the "read news → see it connect to history" journey demoable end to end, per Henry's explicit scope decision (D-002). Within that bounded loop, **live sourcing is in scope**: the Today panel keeps a small curated-current-news slice current via a scheduled curated-source feed from a reviewed allowlist of reputable AI-news sources, with source provenance, last-updated/freshness visibility, and truthful stale/error states (D-007, D-008; FR-005, FR-011, FR-015). The **full F03 Today panel breadth** — the topic taxonomy, the refresh policy, near-real-time multi-source automation, and broader news sourcing — remains a separate future spec and is Out of Scope here.

## Business Context

Per `.ai/steering/product.md` and `.ai/sdd/PLAN.md`, Knewzly's value proposition is combining time, geography, and current news into a connected regional story of AI history, understandable to a 16-year-old without flattening nuance. This feature is the first testable slice of that promise: it proves a learner can orient on the curated spine, inspect a typed relationship with its evidence, and see a live connection from something they just read back to where it came from.

Success signal for this slice: a learner can complete the loop (browse → select anchor → read story/relationships → open a Today story → see it trace to an anchor → see that anchor highlighted as visited) without instruction, and the highlighted state is still there when they return later on the same device.

## User Stories

### US-001: Browse the curated spine

**As a** curious learner
**I want to** see AI/innovation history laid out on a shared time axis with regional and philosophy lanes
**So that** I can orient on when and where things happened relative to each other

**Acceptance Criteria:**
- [ ] The atlas displays a curated pilot set of at least 8 and no more than 10 anchor events (per D-003) spanning at least 3 of the ten connective clusters named in `.ai/sdd/PLAN.md` ("Curated Balanced Anchor Spine").
- [ ] Anchors are positioned on a shared time axis with at least one regional lane and the persistent Philosophy lane visible.
- [ ] Each anchor is a real, keyboard-focusable selection target exposing its date, title, and region/lane in its accessible name.

### US-002: Inspect an anchor and its relationships

**As a** curious or guided learner
**I want to** select an anchor and see its story, key people, sources, and typed connections to other anchors
**So that** I can explain where an idea came from and what it influenced

**Acceptance Criteria:**
- [ ] Selecting an anchor opens a context drawer that keeps the atlas/timeline visible.
- [ ] The drawer shows a simple-English story, key people, related topics, and source attribution for the anchor.
- [ ] Every relationship connected to the anchor is shown with its type (from the seven-item vocabulary in `.ai/sdd/PLAN.md`: influenced, enabled, reacted against, iterated on, institutionalized, regulated, conceptual lens), and is available as text — not conveyed by color or line style alone.
- [ ] Selecting a relationship (by pointer or keyboard) focuses that relationship's endpoints and visibly de-emphasizes unrelated arcs; the equivalent focus state is available through the text relationship list.
- [ ] Contested or indirect relationships are visually and textually distinguished from higher-confidence ones.

### US-003: Trace a Today story back to its origin

**As a** guided learner
**I want to** open a current AI news story and follow a visible link to the historical anchor(s) it descends from
**So that** I understand today's AI developments as continuations of earlier ideas, not isolated events

**Acceptance Criteria:**
- [ ] A bounded Today panel/attachment shows a small curated set of current-news stories that is kept current by a live-news capability (D-007; exact sourcing is a design decision).
- [ ] Each Today story exposes a "trace to origin" action linking to one or more of the pilot anchor events.
- [ ] Following a trace-to-origin action opens or scrolls to the linked anchor's context drawer, and the connection is explained in text (not implied by proximity alone).

### US-004: See and keep progress

**As a** returning learner
**I want to** see which anchors I've already engaged with, and have that state remain the next time I visit on the same device
**So that** I can track my own progress without creating an account

**Acceptance Criteria:**
- [ ] An anchor becomes visually marked as "visited" after the learner opens its context drawer directly, or reaches it via a Today trace-to-origin action.
- [ ] The visited marking is not the only way the state is conveyed (also available in the text anchor list) and is not color-only.
- [ ] After closing and reopening the app on the same device/browser, previously visited anchors are still marked visited.
- [ ] Clearing the device's local storage for the app resets visited state (expected/acceptable behavior, not a defect).

### US-005: Export and re-import progress

**As a** learner who wants to keep or move their progress
**I want to** export my visited-anchor progress to a file, and load it back in later
**So that** my progress isn't only trapped in one browser profile, without needing an account

**Acceptance Criteria:**
- [ ] The learner can trigger an export action that produces a downloadable file containing their visited-anchor state.
- [ ] The learner can trigger an import action that loads a previously exported file and restores the visited state it contains.
- [ ] Importing a file does not silently discard existing visited state without confirming with the learner first (e.g., merge or overwrite choice).
- [ ] Importing a malformed or unrecognized file fails safely with a clear message and does not corrupt existing local progress.

## Functional Requirements

### FR-001: Curated pilot spine — Must Have

WHEN the atlas loads
THE SYSTEM SHALL display a curated pilot set of 8-10 anchor events across a shared time axis and regional/Philosophy lanes
SO THAT a learner can orient on a representative slice of AI/innovation history without facing the full future spine

### FR-002: Anchor selection and context drawer — Must Have

WHEN a learner selects an anchor
THE SYSTEM SHALL open a context drawer showing the anchor's story, key people, sources, and typed relationships while keeping the atlas visible
SO THAT the learner can inspect the anchor without losing temporal/regional context

### FR-003: Typed relationship display — Must Have

WHEN an anchor has one or more relationships to other anchors
THE SYSTEM SHALL expose each relationship's type, direction, and evidence/confidence status in both a visual arc and an equivalent text list
SO THAT the connection's meaning is never conveyed by color or position alone

### FR-004: Relationship focus — Must Have

WHEN a learner selects a relationship (by pointer or keyboard)
THE SYSTEM SHALL visually focus that relationship's endpoints and de-emphasize unrelated relationships, with the same focus reflected in the text relationship list
SO THAT the learner can trace one ancestry line without visual clutter

### FR-005: Bounded Today panel — Must Have

WHEN the atlas is loaded
THE SYSTEM SHALL show a bounded set of current AI news stories in a Today panel/attachment, with a live-news capability that keeps this slice current before release (D-007)
SO THAT the learner has a small, trustworthy current-events entry point rather than an open-ended feed

### FR-006: Trace to origin — Must Have

WHEN a learner activates a Today story's "trace to origin" action
THE SYSTEM SHALL navigate to and open the linked historical anchor's context drawer, with the relationship between the story and the anchor stated in text
SO THAT the learner sees the causal/contextual link explicitly, not implied

### FR-007: Visited state — Must Have

WHEN a learner opens an anchor's context drawer directly, or reaches an anchor via a Today trace-to-origin action
THE SYSTEM SHALL mark that anchor as visited, using a non-color-only visual indicator and a matching text-list state
SO THAT the learner has a persistent record of their own engagement

### FR-008: Local persistence of visited state — Must Have

WHEN a learner's visited-anchor state changes
THE SYSTEM SHALL persist that state on the learner's device (no account required) so it survives closing and reopening the app in the same browser/profile
SO THAT progress isn't lost between sessions without requiring sign-in

### FR-009: Export progress — Must Have

WHEN a learner triggers the export action
THE SYSTEM SHALL produce a downloadable file containing the learner's current visited-anchor state
SO THAT the learner can keep or move their progress outside the browser

### FR-010: Import progress — Must Have

WHEN a learner triggers the import action with a previously exported file
THE SYSTEM SHALL restore the visited-anchor state from that file, prompting the learner to choose merge or overwrite if existing local state is present, and shall fail safely with a clear message on an invalid file
SO THAT the learner can restore or move progress without data loss or silent corruption

### FR-011: Provenance baseline — Must Have

WHEN an anchor, relationship, or Today story is displayed
THE SYSTEM SHALL expose its source attribution, publication/access date or freshness, claim type (fact, interpretation, or conceptual analogy), and confidence/contested status
SO THAT every claim in the atlas is inspectable per `.ai/steering/principles.md` P-004

### FR-012: Reduced motion equivalent — Should Have

THE SYSTEM SHALL provide a reduced-motion equivalent for all transitions (drawer open/close, arc focus, panel changes) with no loss of information

### FR-013: Responsive narrow layout — Should Have

THE SYSTEM SHALL replace the wide desktop canvas with stacked, date-indexed lane cards and a full-height drawer below a defined narrow-width breakpoint, preserving the same relationships as a text list

### FR-014: Topic filtering — Could Have

THE SYSTEM SHALL allow filtering the atlas and/or Today panel by common or user-defined topics

### FR-015: Today freshness and degraded-state transparency — Must Have

WHEN a Today story or the bounded Today panel is displayed
THE SYSTEM SHALL make the slice's last-updated/freshness timestamp visible and present a truthful stale or error state (rather than implying live freshness when the source is stale, unavailable, or failed)
SO THAT a learner is never misled about how current the slice is, per NFR-004

## Non-Functional Requirements

### NFR-001: Usability

- Learner-facing copy (event stories, relationship labels, Today summaries) must be understandable to a 16-year-old reader without flattening historical nuance, per `.ai/steering/principles.md` P-002.
- The first-use experience must include a guided entry point (e.g., one pre-selected anchor or suggested starting trace) so a new learner is not asked to decode an empty atlas alone.

### NFR-002: Accessibility — WCAG 2.2 AAA (per D-005)

- Sampled normal text contrast must be at least 7:1.
- Non-inline interactive controls must be at least 44×44 CSS px.
- Lane headings/groups must be semantic (not visual-only groupings).
- No meaning may be conveyed by color alone anywhere in the atlas, drawer, relationship arcs, or visited-state indicators.
- Full keyboard operability for anchor selection, relationship selection, drawer open/close (with focus return), and import/export actions.
- A reduced-motion equivalent must exist with no information loss (see FR-012).
- No horizontal page overflow at 320px, 360px, 390px, 640px, 720px, and 1440px CSS widths.
- This NFR sets the acceptance bar for this feature; it does not itself constitute a claim of independent AAA certification, which requires a separate reviewer verification pass (see Verification Strategy in the future `design.md`).

### NFR-003: Data integrity / privacy

- Visited-state data stored locally must not be transmitted off-device as part of this feature (no server sync in this spec — see Out of Scope).
- Exported progress files must not contain more than anchor identifiers and visited/engagement metadata — no device fingerprinting or personally identifying data.
- Import of a malformed file must never corrupt or silently overwrite existing valid local state without learner confirmation (see FR-010).

### NFR-004: Content trustworthiness

- Every anchor, relationship, and Today story must carry the provenance baseline in FR-011; none may be presented as verified fact without a source.
- Any anchor, relationship, or Today content that is placeholder/simulated prior to real source verification must be visibly labeled as such and must not be indistinguishable from sourced content.

## Out of Scope

- The full 24-30 event curated spine (this spec targets a pilot set of 8-10; the full spine is a follow-up content-curation task).
- User accounts, authentication, and cross-device/server-side sync of visited state (D-004: local + export/import only).
- Beyond the bounded news-trace loop in this spec, the broader F03 Today panel scope remains Out of Scope: topic taxonomy design, provider/framework/news-API selection, the refresh/freshness policy, and full automated live-news ingestion are design work (undecided at the requirements stage, per D-007). This spec keeps a bounded live-news capability and visible freshness/stale/error states as Must Have (FR-005, FR-015). The broad present-day AI ecosystem pulse (PLAN.md candidate F07) and full automated historical-source ingestion (PLAN.md Phase 3 F06) remain Out of Scope.
- Quizzes, saved trails, guided regional comparisons (Phase 2 features per `.ai/sdd/PLAN.md`).
- Automated source ingestion (Phase 3, F06).
- Archie or any AI-generated explanation/answer surface (explicitly excluded from F01 per `product-design-review.md`).
- Any node/relationship "unlocking" that hides or restricts access to content — the full pilot spine is always visible and browsable; visited state is a highlight/tracking layer only (D-001).
- Selecting the implementation stack, framework, hosting, or specific storage technology (design work, not requirements).

## Decisions

### D-001: Visited state is a tracking layer, not access gating

**Decision:** The curated pilot spine is always fully visible and browsable. "Progress" means a visited/highlighted marker on engaged anchors, never hidden or locked content.
**Reason:** Henry confirmed this explicitly; it also avoids conflicting with `.ai/steering/principles.md` Decision Rule #2 ("comprehension over decorative complexity") and the "progressive disclosure" gap already flagged in `product-design-review.md`, which recommends defaulting to visible anchors with detail (not access) deferred to the drawer.
**Source:** Direct user instruction (chat decision, this session)
**Impacts:** US-004, FR-007, Out of Scope

### D-002: This spec bundles a minimal F03 news-trace loop into F01

**Decision:** Requirements include a bounded Today panel and a "trace to origin" action (US-003, FR-005, FR-006) even though `.ai/sdd/PLAN.md` scopes Today's full behavior as a separate F03 feature.
**Reason:** Henry explicitly chose to include the news-trace loop so the MVP end-to-end story (read news → see it connect to history) is testable in one spec, rather than waiting on a separate F03 spec.
**Source:** Direct user instruction (chat decision, this session)
**Impacts:** Overview, US-003, FR-005, FR-006, Out of Scope (full F03 scope remains excluded)

### D-003: MVP acceptance criteria target an 8-10 anchor pilot set, not the full spine

**Decision:** FR-001's acceptance criteria are written against a pilot set of 8-10 anchors rather than the full 24-30 event spine described in `.ai/sdd/PLAN.md`.
**Reason:** Henry confirmed the full spine is a real content-curation effort that shouldn't block this feature's Must Have scope.
**Source:** Direct user instruction (chat decision, this session)
**Impacts:** US-001, FR-001, Out of Scope; the exact pilot event list is resolved via D-006 (fast follow-up curation pass)

### D-004: Local, exportable persistence — no accounts

**Decision:** Visited state persists in local device storage and can be exported to a file and re-imported; no user accounts, authentication, or server-side sync are in scope.
**Reason:** Henry wants durable local persistence with portability (export) without committing to an auth/DB subsystem, which doesn't exist anywhere in the project yet and would be a much larger addition.
**Source:** Direct user instruction (chat decision, this session)
**Impacts:** US-004, US-005, FR-008, FR-009, FR-010, NFR-003, Out of Scope

### D-005: Accessibility target is WCAG 2.2 AAA

**Decision:** NFR-002 targets AAA-level criteria (7:1 contrast, 44px targets, full keyboard/reduced-motion parity), matching the bar the concurrent independent review has been applying to the non-binding prototype.
**Reason:** Henry chose to hold this spec to the same bar already being verified against in `artifacts/planning/f01-global-history-atlas/design-spike.md` rather than a lower AA baseline.
**Source:** Direct user instruction (chat decision, this session)
**Impacts:** NFR-002

### D-006: Pilot anchor list and sources resolved in a fast follow-up pass

**Decision:** The exact 8-10 pilot anchor events and their source references will be curated in a fast follow-up content-curation pass, using the example events in `artifacts/planning/f01-global-history-atlas/prototype.html` as the starting draft. The resolved list (events, sources, and initial relationships) must be locked before implementation tasks are finalized (i.e., before `tasks.md` is written toward `tasks:approved`).
**Reason:** Henry chose Q-001 Option A — defer the content list so requirements can move toward design now. The specific events are content (a separate, source-verification-heavy effort per FR-011/NFR-004), not the interactive product behavior this requirement scope defines; the prototype already provides a grounded starting draft, so the deferral is cheap and explicitly tracked rather than open-ended.
**Source:** Direct user instruction — Henry chose Q-001 Option A (2026-08-05)
**Impacts:** US-001, FR-001; forward constraint that the resolved pilot list precede finalized implementation tasks

### D-007: Bounded live-news capability is Must Have before release (draft)

**Status:** draft — this is a requirements decision Henry clarified, not approval
**Decision:** A bounded live-news capability is Must Have before release. The Today panel must be able to display current AI news that is kept current (live), with source provenance, last-updated/freshness visibility, truthful stale/error states, and trace-to-origin behavior (FR-005, FR-006, FR-011, FR-015). This supersedes the earlier pure manual/static curation framing for the MVP slice.
**Reason:** Henry clarified that live news is required before release; a static or infrequently-updated slice would not satisfy the current-news promise central to the Today experience.
**Not decided here (design/tasks):** No provider, framework, news API, RSS implementation, polling/refresh interval, or architecture is chosen at the requirements stage; these remain design decisions once design.md/tasks.md exist. The broad present-day AI ecosystem pulse (PLAN.md candidate F07) and full automated historical-source ingestion (PLAN.md Phase 3 F06) remain Out of Scope.
**Source:** Direct user instruction (chat decision, this session, 2026-08-05) — draft, not approval
**Impacts:** US-003, FR-005, FR-006, FR-011, FR-015, Out of Scope; supersedes manual-only framing in Q-002/FR-005

### D-008: Today freshness/editorial model — bounded scheduled curated-source feed (draft)

**Status:** draft — records Henry's choice of the Today editorial model; not approval
**Decision:** The release editorial/freshness model for the bounded Today panel is a **scheduled curated-source feed**: a small, reviewed allowlist of reputable AI-news sources refreshed on a defined schedule, showing a bounded, vetted slice with source provenance, last-updated/freshness visibility, and truthful stale/error states. This is Henry's Option A. Near-real-time multi-source automation is not in scope for release.
**Reason:** A bounded scheduled curated-source feed satisfies the D-007 live-news-before-release requirement at the smallest scope and cost, keeps the slice bounded and provenance-verifiable, and avoids the larger near-real-time automation/moderation burden. The exact schedule, interval, and source list are design/content decisions, not fixed here.
**Design inputs (non-binding, from the World Monitor reference project):** patterns to carry into design.md, not freezes: a freshness status taxonomy (fresh/stale/very_stale/no_data/error) with per-source thresholds; the "multi-source freshness clock reduces with min(), fail closed on an undatable source" rule; a pubdate-required gate (drop undated/future-dated items while counting drops); per-source tier + topic + region + state-affiliation/propaganda-risk metadata for trust; and allowlist-driven ingestion with a build-time/CI feed validator. None of these select a provider, framework, news API, RSS implementation, polling interval, or architecture here.
**Source:** Direct user instruction — Henry chose Option A and requested World Monitor as reference (2026-08-05); draft
**Impacts:** FR-005, FR-015, D-007; Out of Scope (near-real-time multi-source automation excluded from release); informs design.md/tasks.md and the curated-source allowlist content work

## Questions

### Q-001: Exact pilot anchor list and sources

**Status:** resolved — Option A (2026-08-05; recorded as D-006)
**Resolution:** Henry chose Option A. The exact pilot anchor list and sources will be curated in a fast follow-up content-curation pass starting from the prototype examples (`artifacts/planning/f01-global-history-atlas/prototype.html`), and must be resolved before implementation tasks are finalized. Requirements may be approved with this as a tracked follow-up; `design.md`/`tasks.md` will carry the resolved list before implementation tasks are written.
**Why it matters:** FR-001's acceptance criteria reference "8-10 anchor events spanning at least 3 clusters," but the exact events, their sources, and their initial relationships are not yet chosen. This affects whether FR-001 through FR-011 are concretely testable.
**Recommended:** Option A — resolve this as a short follow-up content-curation pass (using the non-binding spike's example events as a starting draft) before moving to `design.md`, so design isn't blocked but implementation tasks have real content to point at.

| Option | Answer | Choose this if... | Impact |
|--------|--------|-------------------|--------|
| A | Curate the pilot list in a fast follow-up pass, referencing `artifacts/planning/f01-global-history-atlas/prototype.html`'s example events as a starting point | You want to keep moving toward design now | Requirements can be approved with this as a tracked follow-up; `design.md`/`tasks.md` will need the resolved list before implementation tasks are written |
| B | Resolve the exact list now, before approving requirements | You want the spec fully concrete before design starts | Adds a content-research step before this requirements.md can be approved |
| Custom | Other approach | Neither fits | Update this question's resolution accordingly |

### Q-002: Today story curation source for MVP

**Status:** resolved (draft) — live news required before release (D-007); freshness/editorial model = bounded scheduled curated-source feed (D-008, Option A)
**Resolution:** Henry clarified that live news is required before release, superseding the manual-only recommendation below. Recorded as D-007 (draft, not approval): a bounded live-news capability is Must Have before release with source provenance, last-updated/freshness visibility, truthful stale/error states, and trace-to-origin behavior. No provider, framework, API, RSS implementation, polling interval, or architecture is chosen here. The freshness/editorial model is resolved as a bounded scheduled curated-source feed (D-008, Option A), with World Monitor as a non-binding design reference.
**Why it matters:** FR-005 requires a small curated set of current AI news stories, but who curates it and how it is kept current affects whether the Today panel can go stale, which touches NFR-004 (content trustworthiness).
**Superseded history:** The original manual/reviewed-curation-only recommendation for this question and its manual-vs-live option table are obsolete. They were superseded by Henry's later clarifications: live news is required before release (D-007), and the release editorial/freshness model is a **bounded scheduled curated-source feed** (D-008, Option A), with World Monitor retained as a non-binding design reference only. No provider, framework, news API, RSS implementation, polling interval, or architecture is chosen here.

## Glossary

- **Anchor (event):** A concise, selectable timeline unit representing a historical AI/innovation milestone.
- **Lane:** A regional or thematic (e.g., Philosophy) grouping that anchors belong to, arranged in parallel along the shared time axis.
- **Typed relationship / arc:** A labeled connection between two anchors using the seven-item vocabulary (influenced, enabled, reacted against, iterated on, institutionalized, regulated, conceptual lens).
- **Visited state:** A per-anchor marker indicating the learner has engaged with that anchor, directly or via a Today trace-to-origin action. Never gates access.
- **Trace to origin:** The action linking a current Today news story to the historical anchor(s) it descends from.
- **Pilot spine:** The 8-10 anchor MVP subset of the eventual 24-30 event curated spine described in `.ai/sdd/PLAN.md`.
