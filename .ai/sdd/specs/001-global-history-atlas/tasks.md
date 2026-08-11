# Tasks: Global History Atlas (F01)

> Requirements: @requirements.md
> Design: @design.md
> Status: Approved
> Approved: 2026-08-10 (Henry, direct chat approval)

## Execution Policy (applies to every task below, not repeated per task)

- **Execution mode:** `direct` for every task in this plan — no orchestration, no multi-agent dispatch. This project has one implementer working directly in a top-level session.
- **Tracking owner:** `direct-worker`. `session_policy: new-top-level-required` — implement each task from a freshly created top-level session, not mid-context inside an unrelated one.
- **High-tier review:** `not-required` for every task — none are routed to a `deep`/Sol-High tier model class, so the challenge-gate doesn't apply.
- **Authority manifest digests:** `N/A` — `C:/Users/henry/Documents/Knewzly` is not under version control (`git rev-parse` confirms no repo). Authority pointers below are exact file paths + section names instead of commit SHAs; re-verify against the live file content at dispatch time rather than trusting a stale digest.
- **Rollover:** standard guidance applies to every task — checkpoint before ~250k cumulative tokens, or earlier after compaction, a long transcript, or context uncertainty. Not restated per task below.
- **Test tooling (resolved this session — see chat, not a prior artifact):** Node's built-in `node:test` + `assert` for schema/module unit tests; no new dependency. Accessibility, keyboard, and responsive checks remain manual per design.md §15 — no browser-automation tool was chosen.
- **Global invariants (apply to every task):** `.ai/steering/principles.md` P-002 (16-year-old readable, nuance preserved), P-004 (claims need provenance); `.ai/steering/conventions.md` (no invented durable rules to fill an open question).

## Requirement Coverage

| Requirement | Tasks | Notes |
|-------------|-------|-------|
| FR-001 Curated pilot spine | T2, T3 | |
| FR-002 Anchor selection + drawer | T5 | |
| FR-003 Typed relationship display | T4 | |
| FR-004 Relationship focus | T4 | |
| FR-005 Bounded Today panel | T8, T10 | |
| FR-006 Trace to origin | T9 | |
| FR-007 Visited state | T6 | |
| FR-008 Local persistence | T6 | |
| FR-009 Export progress | T7 | |
| FR-010 Import progress | T7 | |
| FR-011 Provenance baseline | T1, T2 | schema mandates the fields; T2 supplies real values |
| FR-012 Reduced motion (Should) | T11 | |
| FR-013 Responsive narrow layout (Should) | T11 | |
| FR-014 Topic filtering (Could) | — | **Deferred, not tasked this pass** — Could Have; existing prototype pattern (`data-theme-filter`) means it can be added later without a design change (design.md §16 FAQ) |
| FR-015 Today freshness/degraded states | T8, T10 | |
| NFR-001 Usability | T3, T5, T2 (content) | first-use guided entry point in T3 |
| NFR-002 Accessibility AAA | T11 | cross-cutting; verified holistically once the UI exists |
| NFR-003 Data integrity/privacy | T6, T7 | |
| NFR-004 Content trustworthiness | T1, T2 | |

## Implementation Readiness Check

| Check | Status | Notes |
|-------|--------|-------|
| Must Have requirements have tasks | Pass | FR-014 is Could Have and intentionally untasked (see coverage table) |
| Requirements covered by design | Pass | design.md §2 maps every FR/NFR to a design section |
| Critical Questions answered | Pass | requirements.md has no open Questions section; D-006 (pilot content) is a tracked follow-up, not a blocking Question, and is tasked explicitly as T2 |
| Tasks have dependencies, acceptance criteria, files, verification | Pass | see below |
| Verification commands known or marked manual/N/A | Pass | `node --test` for schema/module tests; explicit manual checklists for accessibility/responsive/e2e (no tool chosen for those) |
| At least one task on the frontier | Pass | T1 has no blockers |
| No uncoordinated writable-ownership overlap on frontier tasks | Pass | T1 is the only frontier task |

## Implementation Slices

### MVP Slice

- **Goal:** The full Business Context success signal — browse → select anchor → read story/relationships → open a Today story → trace to anchor → see it visited → export → clear storage → import → restored.
- **User Stories:** US-001 through US-005 (all of them — F01's MVP boundary already is the full pilot loop, per PLAN.md).
- **Tasks:** T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12.
- **Independent validation:** T12 is the slice's own acceptance gate — it re-runs the full loop against real content and can't pass until every earlier task's acceptance criteria hold together, not just individually.

## Frontier

| Task | Blocked By | Frontier Status |
|------|------------|-----------------|
| T1 | none | **Ready** |
| T2 | T1 | Blocked |
| T3 | T1 | Blocked |
| T4 | T3 | Blocked |
| T5 | T3, T4 | Blocked |
| T6 | T5 | Blocked |
| T7 | T6 | Blocked |
| T8 | T1 | Blocked |
| T9 | T5, T8 | Blocked |
| T10 | T1 | Blocked |
| T11 | T6, T7, T8, T9 | Blocked |
| T12 | T2, T7, T9, T10, T11 | Blocked |

Only T1 is currently implementable. T8 and T10 unblock in parallel with T2–T7 once T1 lands (they only need the schema, not the real content or the Atlas UI) — the fastest real path through this plan runs T1, then T2/T8/T10 concurrently, then the rest of the Atlas chain.

---

## Task T1: Content schema + `ContentLoader` + validator

**Priority:** P0
**Estimate:** 3h
**Blocked By:** none
**Covers:** FR-011, NFR-004 (schema-level); enables T2–T10
**Delivers:** The three JSON schemas from design.md §5 (`anchors.json`, `relationships.json`, `today-stories.json`) exist as concrete, documented shapes; a shared `ContentLoader` module fetches all three; a `node:test` validator checks referential integrity (every relationship `from`/`to` resolves to a real anchor ID) and mandatory-field presence (`claimType`, `source`, `date` on every anchor/relationship/story) against a small fixture — not yet real content.

**Model:** standard · **Effort:** medium
**Reason:** Mechanical schema/module work with a clear spec (design.md §5) to implement against; no open design questions, low ambiguity, low consequence if wrong (caught immediately by the validator itself).

**Owned Surfaces:** `content/anchors.schema.json` (or equivalent shape doc), `content/relationships.schema.json`, `content/today-stories.schema.json`, `src/content-loader.*`, `test/content-schema.test.*`, `content/fixtures/*` (fixture data only — not real pilot content, that's T2)
**Coordination:** none — no other task writes these surfaces concurrently.

**Authority Manifest:**
- Global invariants (see Execution Policy above)
- `design.md` §5 (Data Model / State) — exact JSON shapes
- `design.md` §4 (Component / Module Structure) — `ContentLoader` responsibility boundary
- `requirements.md` FR-011, NFR-004

**Expected Lifecycle Events:** `acknowledged` → `started` → (`blocked` / `contract-conflict` if the design shape proves unimplementable as written — route back to design.md, don't silently reshape it) → `verification-failed` or `ready-for-review` → tracking-owner-reconciled `completed`.

### Work
- [x] Write the three schema shapes exactly as specified in design.md §5.
- [x] Implement `ContentLoader` (fetch all three JSON files; expose them to callers).
- [x] Write 3-5 anchor / 3-5 relationship / 2-3 story fixture entries (clearly marked as fixture/placeholder, not real content — NFR-004 requires this distinction stay visible).
- [x] Write the `node:test` validator: referential integrity + mandatory-field presence.

### Acceptance Criteria
- [x] Validator fails loudly on a fixture with a dangling relationship ID (prove the check actually catches the case it claims to).
- [x] Validator fails loudly on a fixture entry missing `claimType`, `source`, or `date`.
- [ ] `ContentLoader` successfully fetches and parses all three fixture files in a manual browser check. **Not yet verified — no page exists to call the browser `fetchReader` path until T3/T8. Verified instead via an injected fs-based reader (6/6 node:test pass). Re-check this specific criterion once T3 or T8 lands.**

### Files
- `content/*.schema.json` — created
- `content/fixtures/*.json` — created (incl. `content/fixtures/invalid/*` for negative-path tests, not originally itemized but needed to prove the validator)
- `src/content-loader.js` — created
- `test/content-schema.test.js` — created
- `package.json` — created (not originally listed; needed as minimal project metadata for `node --test` to run — zero dependencies declared)

### Verification
- [x] `node --test` — exit 0, 6/6 pass, both negative cases (dangling ID, missing field) demonstrated failing correctly
- [ ] Manual: open a throwaway HTML page invoking `ContentLoader` — deferred to T3/T8 (see caveat above)

**Status: Done, with one honestly-flagged open item** (browser-path manual check deferred, not skipped).

---

## Task T2: Pilot anchor & relationship content curation (resolves D-006)

**Priority:** P0
**Estimate:** 4h (content research, not implementation — estimate reflects source-verification time, not code)
**Blocked By:** T1
**Covers:** FR-001, FR-011, NFR-001, NFR-004; requirements.md D-006
**Delivers:** Real `content/anchors.json` (8-10 anchors spanning ≥3 of PLAN.md's ten connective clusters) and `content/relationships.json`, sourced from `artifacts/planning/f01-global-history-atlas/prototype.html`'s example events as the starting draft per D-006, passing T1's validator.

**Model:** standard · **Effort:** high
**Reason:** Not code-hard, but consequence-high — inaccurate dates/attributions or a misapplied claim type directly violate P-004 and NFR-004. Source verification quality matters more than speed here.

**Owned Surfaces:** `content/anchors.json`, `content/relationships.json` (the real files, distinct from T1's fixtures)
**Coordination:** T3/T4/T5's component tasks can be built and tested against T1's fixtures without waiting on this task; only the MVP slice's final demo (T12) needs T2's real content.

**Authority Manifest:**
- Global invariants
- `requirements.md` D-006, FR-001, FR-011
- `.ai/sdd/PLAN.md` "Curated Balanced Anchor Spine" (the ten connective clusters), "Relationship Vocabulary" (the seven relationship types)
- `artifacts/planning/f01-global-history-atlas/prototype.html` (starting draft per D-006)
- `.ai/steering/principles.md` P-002, P-004

**Expected Lifecycle Events:** `acknowledged` → `started` → `blocked` if a source can't be verified in reasonable time (flag and move to the next candidate anchor rather than stalling the whole task) → `ready-for-review` → `completed`.

### Work
- [x] Select 9 anchors (within the 8-10 range) from the prototype's examples spanning >=3 connective clusters — actually spans 7 of PLAN.md's 10 clusters (automata/agency, logic/computation, wartime codebreaking, early symbolic/neural AI, statistics/backprop, attention/Transformers, deployment/labor/governance).
- [x] Verify each anchor's date, claim type, and source. **Caveat, stated plainly: sources were verified during this same working session's earlier Global History Atlas timeline artifact work (real primary-source citations checked then — Lovelace's Note G, Turing's 1936/1950 papers, the IEEE Enigma milestone, the McCulloch-Pitts 1943 paper, the Dartmouth proposal, Wittgenstein's SEP entry, the 1986 Nature paper, the 2017 arXiv paper, TIME's Kenya reporting), reused here rather than re-fetched live in this pass. Flagged to Henry for spot-check before this is treated as final, per the explicit agreement this session.**
- [x] Write each anchor's story/people/topics in P-002-compliant language.
- [x] Define the initial relationships (8 total) between the selected anchors using the seven-item vocabulary.
- [x] Run T1's validator against the result.

### Acceptance Criteria
- [x] 9 anchors, 7 clusters represented (exceeds US-001's >=3 requirement).
- [x] Every anchor and relationship passes T1's validator with zero errors (verified: `errors: []`, `VALID`).
- [x] Every anchor has a real, checkable source — no placeholder/simulated content presented as sourced (NFR-004). One anchor (`kenyalabor`) is explicitly typed `claimType: interpretation`/`confidence: medium` rather than `fact`/`high`, since the underlying reporting itself flags contested specifics — this is the honest label, not an inflated one.

### Files
- `content/anchors.json` — created (real content, replaces fixture for production use)
- `content/relationships.json` — created

### Verification
- [x] Validator run directly against the real files (not via `node --test`, since T1's suite targets fixtures specifically) — 0 errors, confirmed
- [x] `node --test` (full suite) — still 6/6 pass, real content didn't break anything
- [ ] **Manual source spot-check by Henry — requested, not yet performed.** Per this session's explicit agreement, T2 pauses here for a human check before T12 (which depends on it) proceeds; T3-T7's component work can continue against fixtures in the meantime.

---

## Task T3: `TimelineCanvas` — render anchors on the shared time axis

**Priority:** P0
**Estimate:** 3h
**Blocked By:** T1
**Covers:** FR-001, NFR-001 (first-use guided entry point)
**Delivers:** A working timeline: era axis, regional + Philosophy lanes, anchors as real keyboard-focusable buttons exposing date/title/region in their accessible name (US-001 acceptance criteria) — demoable against T1's fixture data.

**Model:** standard · **Effort:** medium
**Reason:** Formalizes an already-built, already-reviewed prototype pattern (`timeline-atlas-concept.html`) — low design ambiguity, moderate implementation surface.

**Owned Surfaces:** `atlas.html` (or equivalent page), `src/timeline-canvas.*`, associated CSS
**Coordination:** none yet — T4/T5 extend this surface later but don't run concurrently with it.

**Authority Manifest:**
- Global invariants
- `design.md` §4 (`TimelineCanvas`, `EraAxis`, `Lane`, `Anchor`), §9 (accessibility notes, `--ink-faint` prohibition)
- `requirements.md` FR-001, NFR-001, US-001
- `.ai/sdd/design/timeline-atlas-concept.html` (prototype pattern being formalized)

**Expected Lifecycle Events:** `acknowledged` → `started` → `ready-for-review` → `completed`.

### Work
- [ ] Build era axis + lane layout per design.md §4.
- [ ] Render anchors from `ContentLoader`'s fixture data as focusable buttons.
- [ ] Set one anchor as the default first-use guided entry point (NFR-001).
- [ ] Confirm no reuse of the known-defective `--ink-faint`-style low-contrast token (design.md §9/§14 risk).

### Acceptance Criteria
- [ ] All of US-001's acceptance criteria hold against fixture data.
- [ ] A new session loads with one anchor pre-selected or a suggested starting trace — not an empty canvas.

### Files
- `atlas.html` — create
- `src/timeline-canvas.js` — create
- `styles/atlas.css` — create

### Verification
- [ ] Manual: tab through every anchor via keyboard only, confirm each has an accessible name including date/title/region
- [ ] Manual: computed contrast check on any new text token introduced

---

## Task T4: `RelationshipLayer` — typed arcs + text Relationship Index + focus

**Priority:** P0
**Estimate:** 3h
**Blocked By:** T3
**Covers:** FR-003, FR-004
**Delivers:** Solid/dashed arc rendering by confidence, a full text-equivalent Relationship Index (never color/line-only), and focus interaction that dims unrelated arcs and mirrors state in the text list — formalizing the existing prototype's `focusRelationship()` pattern.

**Model:** standard · **Effort:** medium
**Reason:** Same formalize-an-existing-pattern shape as T3.

**Owned Surfaces:** `src/relationship-layer.*`, additions to `atlas.html`'s markup
**Coordination:** Extends T3's surface; not run concurrently with it.

**Authority Manifest:**
- Global invariants
- `design.md` §4 (`RelationshipLayer`, `RelationshipIndex`)
- `requirements.md` FR-003, FR-004, US-002
- `.ai/sdd/design/timeline-atlas-concept.html` (existing `data-rel`/arc pattern)

**Expected Lifecycle Events:** `acknowledged` → `started` → `ready-for-review` → `completed`.

### Work
- [ ] Render relationship arcs (solid = documented, dashed = interpretive/indirect) from fixture relationship data.
- [ ] Build the always-available text Relationship Index as a true equivalent, not a decorative afterthought.
- [ ] Implement focus interaction: selecting a relationship (pointer or keyboard) dims unrelated arcs and reflects the same state in the text list.

### Acceptance Criteria
- [ ] Every relationship's type, direction, and confidence is available as text — verified by disabling CSS and confirming the information survives.
- [ ] Keyboard-only focus of a relationship produces the same visible state as pointer interaction.

### Files
- `src/relationship-layer.js` — create
- `atlas.html` — modify

### Verification
- [ ] Manual: keyboard-only relationship selection produces correct dim/focus state
- [ ] Manual: disable CSS, confirm relationship type/confidence still readable in the text list

---

## Task T5: `ContextDrawer` — anchor selection detail view

**Priority:** P0
**Estimate:** 3h
**Blocked By:** T3, T4
**Covers:** FR-002
**Delivers:** Selecting an anchor opens a context drawer (atlas stays visible) showing story, key people, sources, and every typed relationship — formalizing the existing prototype's `openEvent()`/`closeDrawer()` pattern, including focus-return on close.

**Model:** standard · **Effort:** medium

**Owned Surfaces:** `src/context-drawer.*`, additions to `atlas.html`
**Coordination:** none.

**Authority Manifest:**
- Global invariants
- `design.md` §4 (`ContextDrawer`), §9 (focus-return requirement)
- `requirements.md` FR-002, US-002
- `.ai/sdd/design/timeline-atlas-concept.html` (existing drawer pattern)

**Expected Lifecycle Events:** `acknowledged` → `started` → `ready-for-review` → `completed`.

### Work
- [ ] Build the drawer: story, people, topics, sources, relationships.
- [ ] Wire anchor selection (T3) to open it; wire relationship selection (T4) to focus within it.
- [ ] Implement keyboard open/close with focus return to the triggering anchor.

### Acceptance Criteria
- [ ] Opening/closing the drawer never loses the atlas's visible state behind it.
- [ ] Closing the drawer (Escape or close button) returns focus exactly to the anchor that opened it.

### Files
- `src/context-drawer.js` — create
- `atlas.html` — modify

### Verification
- [ ] Manual: full keyboard-only open → read → close → focus-return cycle

---

## Task T6: `VisitedTracker` — local persistence

**Priority:** P0
**Estimate:** 2h
**Blocked By:** T5
**Covers:** FR-007, FR-008, NFR-003 (persistence half)
**Delivers:** Visited marking on direct drawer-open (T5) with a non-color-only indicator, versioned `localStorage` persistence (schema `{ version, visited }` per design.md §5), and graceful degradation when storage is unavailable.

**Model:** standard · **Effort:** medium
**Reason:** Formalizes the existing prototype's localStorage pattern (already proven working); the versioning/graceful-degradation additions are the genuinely new part.

**Owned Surfaces:** `src/visited-tracker.*`
**Coordination:** none — T7 depends on this but doesn't run concurrently with it.

**Authority Manifest:**
- Global invariants
- `design.md` §5 (`localStorage` schema, key `knewzly-visited-v1`)
- `requirements.md` FR-007, FR-008, NFR-003, US-004
- `.ai/sdd/design/timeline-atlas-concept.html` (existing `knewzly-timeline-concept-visited-v2` pattern being renamed/versioned per design.md)

**Expected Lifecycle Events:** `acknowledged` → `started` → `ready-for-review` → `completed`.

### Work
- [ ] Implement the versioned `localStorage` read/write.
- [ ] Wire drawer-open (T5) to mark visited.
- [ ] Add the non-color-only visited indicator to both the anchor button and the text anchor list.
- [ ] Handle `localStorage` unavailable (private browsing) — atlas stays fully browsable, a non-blocking notice explains progress won't persist.

### Acceptance Criteria
- [ ] All of US-004's acceptance criteria, including: closing/reopening the app on the same browser preserves visited state; clearing local storage resets it (expected, not a defect).
- [ ] Visited marking never gates access to any anchor (D-001, reused from requirements).

### Files
- `src/visited-tracker.js` — create

### Verification
- [ ] Manual: mark an anchor visited, reload the page, confirm it's still marked
- [ ] Manual: clear `localStorage`, confirm reset and confirm the atlas remains fully browsable throughout
- [ ] Manual: disable `localStorage` (private-browsing simulation), confirm graceful degradation

---

## Task T7: Export / Import progress

**Priority:** P1
**Estimate:** 3h
**Blocked By:** T6
**Covers:** FR-009, FR-010, NFR-003
**Delivers:** A new, genuinely un-prototyped UI: export produces a downloadable JSON file (design.md §5 shape); import validates `exportedFrom`/`schemaVersion`, prompts merge-or-overwrite when local state exists, and fails safely on a malformed file without touching existing state.

**Model:** standard · **Effort:** medium
**Reason:** No prototype precedent (unlike T3-T6) — genuinely new design being implemented for the first time, but the shape is fully specified in design.md §5, so ambiguity is still low.

**Owned Surfaces:** `src/export-import.*`
**Coordination:** none.

**Authority Manifest:**
- Global invariants
- `design.md` §5 (Export/Import file schema), §9 (Edge Cases: malformed file, merge/overwrite)
- `requirements.md` FR-009, FR-010, NFR-003, US-005

**Expected Lifecycle Events:** `acknowledged` → `started` → `ready-for-review` → `completed`.

### Work
- [ ] Implement export: serialize visited state to the documented JSON shape, trigger download.
- [ ] Implement import: parse, validate `exportedFrom`/`schemaVersion`, prompt merge/overwrite if local state exists, apply.
- [ ] Implement malformed-file handling: clear error message, zero mutation of existing state.

### Acceptance Criteria
- [ ] All of US-005's acceptance criteria.
- [ ] A malformed/foreign JSON file is rejected with a clear message; existing visited state is provably untouched afterward.
- [ ] Import with existing local state always prompts before applying — never silently overwrites or merges.

### Files
- `src/export-import.js` — create

### Verification
- [ ] Manual: export, clear state, import, confirm restored
- [ ] Manual: import a deliberately malformed file, confirm rejection + untouched existing state
- [ ] Manual: import while existing state is present, confirm the merge/overwrite prompt appears

---

## Task T8: Today panel — `StoryGrid` + `StoryCard` + `FreshnessBanner`

**Priority:** P0
**Estimate:** 3h
**Blocked By:** T1
**Covers:** FR-005, FR-015 (rendering half)
**Delivers:** The Today panel formalizing `present-day-newspaper-concept.html`'s story-card pattern, reading `today-stories.json` (fixture data for now), with a `FreshnessBanner` surfacing `lastUpdated`/`freshnessState` truthfully — including explicit stale/error states, never silently implying freshness.

**Model:** standard · **Effort:** medium

**Owned Surfaces:** `today.html` (or equivalent), `src/story-grid.*`, `src/freshness-banner.*`
**Coordination:** Independent of T3-T7's Atlas-page work; can run concurrently.

**Authority Manifest:**
- Global invariants
- `design.md` §4 (Today panel components), §5 (`today-stories.json` shape)
- `requirements.md` FR-005, FR-015, NFR-004, US-003
- `.ai/sdd/design/present-day-newspaper-concept.html` (existing story-card pattern)

**Expected Lifecycle Events:** `acknowledged` → `started` → `ready-for-review` → `completed`.

### Work
- [ ] Build `StoryGrid`/`StoryCard` from `today-stories.json` fixture data.
- [ ] Build `FreshnessBanner` reading `lastUpdated`/`freshnessState`.
- [ ] Implement explicit fetch-failure and stale-data UI states (never silently presented as fresh).

### Acceptance Criteria
- [ ] Freshness state is visible and matches the fixture's `freshnessState` value exactly — no client-side reinterpretation beyond an aging floor (design.md §14 risk mitigation).
- [ ] A simulated fetch failure produces a clear error state, not an empty or misleadingly-normal panel.

### Files
- `today.html` — create
- `src/story-grid.js` — create
- `src/freshness-banner.js` — create

### Verification
- [ ] Manual: swap fixture's `freshnessState` through all five values (`fresh/stale/very_stale/no_data/error`), confirm each renders distinctly and truthfully

---

## Task T9: Trace-to-origin — Today → Atlas link

**Priority:** P0
**Estimate:** 2h
**Blocked By:** T5, T8
**Covers:** FR-006
**Delivers:** Activating a Today story's "trace to origin" action navigates to/opens the linked anchor's `ContextDrawer` (T5), with the connection stated in text — and, since this reaches the drawer, also exercises `VisitedTracker` (T6) marking that anchor visited via the trace path, not just direct selection.

**Model:** standard · **Effort:** medium
**Reason:** Genuine integration point between two previously-independent tracks (Atlas chain and Today panel) — slightly higher care needed here than a single-surface task, but still low ambiguity given both sides are already built.

**Owned Surfaces:** `src/trace-to-origin.*` (thin integration glue between T8's story cards and T5's drawer)
**Coordination:** Reads from both T5 and T8's owned surfaces without modifying them — if either changes shape later, this task's glue code is the first thing to re-check.

**Authority Manifest:**
- Global invariants
- `design.md` §8 (User Flows — trace-to-origin path)
- `requirements.md` FR-006, US-003

**Expected Lifecycle Events:** `acknowledged` → `started` → `ready-for-review` → `completed`.

### Work
- [ ] Wire each Today story's `traceToAnchors` field to open the linked anchor's drawer.
- [ ] Render the story→anchor connection as explicit text, not implied by proximity/navigation alone.
- [ ] Confirm the trace path also triggers `VisitedTracker` (T6) the same as direct selection.

### Acceptance Criteria
- [ ] All of US-003's acceptance criteria.
- [ ] The linked anchor is marked visited after a trace, identically to direct selection.

### Files
- `src/trace-to-origin.js` — create

### Verification
- [ ] Manual: full trace path — open Today story, activate trace, confirm correct anchor's drawer opens with the connection stated, confirm visited-marking fires

---

## Task T10: Scheduled CI news-refresh job

**Priority:** P0
**Estimate:** 4h
**Blocked By:** T1
**Covers:** FR-005 (live-sourcing half), FR-015 (computation half)
**Delivers:** The cron-scheduled job from design.md §6: fetch allowlist → pubdate gate → per-source freshness → `min()`-reduce → schema-validate → publish `content/today-stories.json`. This is the piece that makes T8's `FreshnessBanner` meaningful in production rather than only against a fixture.

**Model:** standard · **Effort:** medium
**Reason:** Well-specified pipeline (design.md §6, borrowed patterns named explicitly) with clear, checkable steps — moderate implementation surface, low design ambiguity.

**Owned Surfaces:** CI workflow config, `scripts/refresh-today.*`, the reviewed source-allowlist config file
**Coordination:** Publishes to the same `content/today-stories.json` path T8 reads — no runtime coordination needed since T8 only ever reads, never writes, that file (design.md §3/§6 explicitly separates these roles).

**Authority Manifest:**
- Global invariants
- `design.md` §6 (API/Integration Contract — the full pipeline), §13 TD-003/TD-004 (scope boundary: patterns borrowed, not World Monitor's infrastructure)
- `requirements.md` D-007, D-008, FR-005, FR-015

**Expected Lifecycle Events:** `acknowledged` → `started` → `blocked` if a candidate allowlist source proves unfetchable/unparseable during implementation (drop it, document why, don't silently stall) → `ready-for-review` → `completed`.

### Work
- [x] Create the version-controlled source allowlist (content-review responsibility, not a code decision — start with a small, clearly reputable set). **`content/source-allowlist.json`, `"reviewed": false` — explicitly labeled a starter list (AP News AI hub, MIT Technology Review AI, Reuters Technology) needing content-review before production use, not finalized here.**
- [x] Implement fetch + pubdate gate (drop undated/future-dated, count drops). `gatePubdates()`.
- [x] Implement per-source freshness computation + `min()` reduction + fail-closed-on-undatable. `computeSourceFreshness()` + `reduceFreshness()` — an undatable/empty source resolves to `error`, never `fresh`; `min()` reduction takes the worst-ranked state across sources.
- [x] Implement schema validation before publish (reuse T1's validator or an equivalent check against the `today-stories.json` shape). `validateForPublish()` calls `src/content-loader.js`'s `validateContent()` directly (T1 reuse, not a reimplementation); `publishTodayStories()` refuses to write when errors are non-empty.
- [x] Wire the cron schedule. `.github/workflows/refresh-today.yml` — `schedule: cron '0 */6 * * *'` + `workflow_dispatch`. **Syntactically valid (parsed clean with a YAML parser) but not run — no live GitHub repo/secrets available in this sandbox, and it calls a real fetch step (see below) that is not yet implemented.**

### Acceptance Criteria
- [x] A deliberately undated test item is dropped, not included. `test/news-pipeline.test.js` — "gatePubdates: drops an item with no parseable date, and counts the drop".
- [x] A deliberately stale-only source set produces `freshnessState: stale` or `very_stale`, never `fresh`. `test/news-pipeline.test.js` — "reduceFreshness: a deliberately stale-only source set produces stale/very_stale, never fresh" (both cases covered).
- [x] A publish that would fail schema validation is blocked, not shipped. `test/news-pipeline.test.js` — "buildTodayStories: a publish that would fail schema validation is blocked" + "publishTodayStories: refuses to write a candidate that failed validation" (proves the actual filesystem write is skipped, not just that errors are returned).

### Files
- `.github/workflows/refresh-today.yml` — created
- `scripts/refresh-today.js` — created
- `content/source-allowlist.json` — created

### Verification
- [x] `node --test` against the pipeline's pure functions (pubdate gate, freshness reduction) using fixture source data — exit 0. **28/28 pass (6 T1 + 22 T10), see execution record below.**
- [ ] Manual: dry-run the job against the real allowlist once, confirm a valid `today-stories.json` publishes. **Not attempted — `fetchAllowlistedItems()` in `scripts/refresh-today.js` is an explicit stub that throws; no live per-source fetch/parse (RSS/API/HTML) was built in this pass, and this sandboxed session has no reliable path to safely validate live outbound fetches against the real allowlisted domains. Verification instead rests on the unit-tested pure pipeline functions (pubdate gate, per-source freshness, min()-reduction, schema validation) against fixture/fake source data, which is the acceptance-criteria bar this task actually specifies. A real dry-run requires implementing `fetchAllowlistedItems()` against a chosen fetch/parse approach per allowlisted source — left as a clearly-flagged follow-up, not silently skipped.**

**Status: Work items and unit-tested acceptance criteria done. The manual live dry-run is honestly left unchecked — see note above. `content/source-allowlist.json` still needs Henry's content-review sign-off (`"reviewed": false`) before being treated as production-ready, per design.md's content-review-responsibility framing.**

---

## Task T11: Accessibility & responsive verification pass

**Priority:** P1
**Estimate:** 4h
**Blocked By:** T6, T7, T8, T9
**Covers:** FR-012, FR-013, NFR-002
**Delivers:** The cross-cutting AAA verification design.md §14/§15 calls for, done once the full UI exists rather than piecemeal — computed contrast ratios on every text token (the `--ink-faint` defect must not have been reintroduced by any earlier task), full keyboard sweep across every interactive surface built so far, reduced-motion equivalents for every transition, and no horizontal overflow at the six required breakpoints.

**Model:** standard · **Effort:** high
**Reason:** Correctness-critical against an explicit AAA claim (NFR-002) and a named prior defect (design.md §9) — needs real computed verification, not a visual skim, even though the fixes themselves are typically small.

**Owned Surfaces:** CSS token fixes across all prior tasks' files (cross-cutting by nature — coordinate before editing shared token files)
**Coordination:** This task legitimately touches files owned by T3-T9. Run it only after those are all in `ready-for-review` or later to avoid overlapping edits.

**Authority Manifest:**
- Global invariants
- `design.md` §9 (Accessibility / UX Notes — the full AAA bar and the named `--ink-faint` defect), §15 (Verification Strategy)
- `requirements.md` NFR-002

**Expected Lifecycle Events:** `acknowledged` → `started` → `verification-failed` (expected at least once — that's what this task is for) → fixes → `ready-for-review` → `completed`.

### Work
- [ ] Compute contrast ratios for every text/background token pair actually shipped; fix any below 7:1 (or document a deliberate, justified exception).
- [ ] Full keyboard-only sweep: every anchor, relationship, drawer, import/export control, Today story, trace action.
- [ ] Verify a reduced-motion equivalent exists for every transition with no information loss.
- [ ] Verify no horizontal overflow at 320/360/390/640/720/1440px.
- [ ] Implement the responsive narrow-layout replacement (stacked, date-indexed lane cards + full-height drawer) if not already covered by T3/T5.

### Acceptance Criteria
- [ ] Zero text/background pairs below 7:1 computed contrast, project-wide.
- [ ] Full keyboard path with no dead ends, across every component built in T3-T9.
- [ ] No horizontal overflow at any of the six required widths.

### Files
- Touches shared CSS/token files across `styles/*` — modify (exact files depend on what T3-T9 actually produced)

### Verification
- [ ] Computed contrast check (script or manual color-picker + calculation) against every shipped token pair — record the actual ratios, not a pass/fail guess
- [ ] Manual: full keyboard-only pass across the entire built surface
- [ ] Manual: `prefers-reduced-motion: reduce` forced on, confirm every transition has a no-information-loss equivalent
- [ ] Manual: resize to each of the six required widths, confirm no horizontal scroll

---

## Task T12: Real-content integration + end-to-end demo pass

**Priority:** P0
**Estimate:** 2h
**Blocked By:** T2, T7, T9, T10, T11
**Covers:** the full Business Context success signal (all Must Have FRs, holistically)
**Delivers:** Swap T1's fixtures for T2's real pilot content everywhere; run the complete loop from the Business Context section of requirements.md end to end, once, for real: browse → select anchor → read story/relationships → open a Today story → trace to anchor → see it visited → export → clear storage → import → restored.

**Model:** standard · **Effort:** medium
**Reason:** Integration/verification work, not new feature surface — but the one task where a real gap in any earlier task's acceptance criteria would actually surface, so it deserves genuine attention rather than a rubber-stamp pass.

**Owned Surfaces:** none new — this task verifies and lightly wires together T1-T11's surfaces, doesn't introduce its own.
**Coordination:** Must run after every other task is at `ready-for-review` or later.

**Authority Manifest:**
- Global invariants
- `requirements.md` Business Context (the exact success signal being demonstrated)
- Every prior task's Acceptance Criteria (this task's job is confirming they hold together, not just individually)

**Expected Lifecycle Events:** `acknowledged` → `started` → `verification-failed` (route back to the owning earlier task if something breaks only in integration) → `ready-for-review` → tracking-owner-reconciled `completed` — this is the task whose `completed` event effectively closes out the MVP slice.

### Work
- [ ] Replace fixture references with T2's real `content/anchors.json`/`relationships.json` everywhere.
- [ ] Run the full success-signal loop once, start to finish, without instruction (simulating a first-time learner).
- [ ] Fix any integration-only gap found (route back to the owning task if the fix is substantial, don't quietly absorb someone else's scope here).

### Acceptance Criteria
- [ ] The full loop completes without instruction, using real content, exactly as described in requirements.md's Business Context success signal.
- [ ] `node --test` (all suites) passes against real content, not just fixtures.

### Files
- Wiring changes only — no new files expected.

### Verification
- [ ] `node --test` — full suite, exit 0, against real content
- [ ] Manual: complete, uninstructed run of the full loop, real content, real browser
