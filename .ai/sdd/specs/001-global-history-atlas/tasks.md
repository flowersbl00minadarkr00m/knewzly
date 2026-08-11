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
- [x] Build era axis + lane layout per design.md §4.
- [x] Render anchors from `ContentLoader`'s fixture data as focusable buttons.
- [x] Set one anchor as the default first-use guided entry point (NFR-001).
- [x] Confirm no reuse of the known-defective `--ink-faint`-style low-contrast token (design.md §9/§14 risk).

### Acceptance Criteria
- [x] All of US-001's acceptance criteria hold. **Note on "against fixture data":** T3's own task framing (written when only T1 had landed) assumed T2's real content wasn't ready; T2 has since been committed in this shared checkout (9 anchors / 4 lanes: philosophy, europe, north-america, africa). `atlas.html` was built content-agnostic — it loads whatever is at `ContentLoader`'s default `content/` basePath, with no fixture-specific logic — and a fake-DOM harness confirms it renders all 9 real anchors correctly (9/9 buttons, all 5 lanes incl. unoccupied Asia, correct accessible names). Verified separately against T1's 3-anchor fixture too (2 lanes occupied) to confirm the component doesn't assume any particular anchor count. The literal "8-10 anchors, ≥3 clusters" criterion therefore holds against what the page actually renders today, though this is downstream of T2 landing early, not something T3 itself curated.
- [x] A new session loads with one anchor pre-selected or a suggested starting trace — not an empty canvas. (Earliest-dated anchor by `sortKey` is marked `.is-suggested` with a text "Start here" badge and an aria-label suffix "— suggested starting point"; it is a visual/textual marker only, not a T5 drawer-open, which is out of this task's scope.)

### Files
- `atlas.html` — created
- `src/timeline-canvas.js` — created
- `styles/atlas.css` — created

### Verification
- [ ] Manual: tab through every anchor via keyboard only, confirm each has an accessible name including date/title/region. **Not verified in a real browser — no browser tool was available in this session (`claude-in-chrome` reported "Browser extension is not connected"; a local static server was started at `localhost:8791` and abandoned once the extension proved unreachable, see commit note).** Verified instead via a throwaway fake-DOM harness that rendered `renderTimelineCanvas` against `content/fixtures/anchors.json` and asserted every button's `aria-label` contains its date, title, and lane name (e.g. `"1843, Lovelace's objection, Europe lane — suggested starting point"`). This proves the accessible-name *content* is correct; it does not prove real Tab-key focus order or that a screen reader announces it correctly — re-check in an actual browser before T11 or T12 sign-off.
- [x] Manual: computed contrast check on any new text token introduced. Computed via the WCAG 2.x relative-luminance formula (script, not eyeballing — same method design.md §15 requires) against every text/background pair `styles/atlas.css` actually uses: ink-on-paper 14.06:1 (light) / 14.50:1 (dark), ink-soft-on-paper 8.62:1 (light) / 10.64:1 (dark), ink-on-paper-raised 15.33:1 (light) / 12.29:1 (dark), ink-soft-on-paper-raised 9.40:1 (light) / 9.02:1 (dark), inverse-on-accent (lane badge) 10.86:1 (light) / 10.12:1 (dark). All ten pairs clear 7:1 AAA; the reviewed prototype's failing `--ink-faint` token (2.5:1/3.4:1) is not reused anywhere in this file.

**Status: Done, with one honestly-flagged open item** — real-browser keyboard/screen-reader verification deferred (no browser tool reachable this session); re-check before T11's accessibility pass or T12's demo. `node --test` unaffected (T3 has no test-suite ownership; existing 6/6 T1 suite plus other in-flight suites in this shared repo checkout remained green throughout — see commit).

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
- [x] Render relationship arcs (solid = documented, dashed = interpretive/indirect) from relationship data. `renderRelationshipArcs()` reads T3's already-rendered anchor DOM (`readAnchorPositions()`) rather than duplicating TimelineCanvas's layout constants, so it stays correct even against fixture data or a future real-content layout change. Verified against both `content/fixtures/relationships.json` and the real 8-relationship `content/relationships.json`.
- [x] Build the always-available text Relationship Index as a true equivalent, not a decorative afterthought. `renderRelationshipIndex()` writes type, direction (`fromTitle → toTitle`), the full confidence sentence, and the authored label as real DOM text nodes — nothing is conveyed only via a CSS class or the arc's line style.
- [x] Implement focus interaction: selecting a relationship (pointer or keyboard) dims unrelated arcs and reflects the same state in the text list. `focusRelationship()` is the single function both interaction paths call (plain `<button>` elements fire an identical `click` event for a pointer click and for keyboard Enter/Space — no separate keydown handling needed), so pointer and keyboard activation are structurally guaranteed to converge on the same resulting state.

### Acceptance Criteria
- [x] Every relationship's type, direction, and confidence is available as text — verified by disabling CSS and confirming the information survives. **Not verified with a real browser's dev-tools CSS toggle (no browser tool reachable this session, see Verification below).** Verified instead the way that criterion actually cashes out: `test/relationship-layer.test.js`'s "renderRelationshipIndex — true text equivalent" suite asserts against each button's `.textContent` (not against any class, attribute, or visual/computed style) that the type, both endpoint titles with an explicit "→", and the full confidence sentence are present as real text nodes. `.textContent` is exactly what remains once CSS is disabled — a stylesheet cannot remove DOM text — so this is a direct, not simulated, proof of the same fact a manual CSS-disable check would show, just not captured as a rendered screenshot.
- [x] Keyboard-only focus of a relationship produces the same visible state as pointer interaction. **Not verified with a real Tab/Enter keyboard sweep in an actual browser (no browser tool reachable this session).** Verified instead at the logic level, which is what actually determines the outcome: `wireFocusInteractions()` attaches exactly one `click` listener per relationship button, and `focusRelationship()` is the only place that mutates `aria-pressed`/arc classes/anchor-dimming state. `test/relationship-layer.test.js`'s "pointer path and keyboard path converge on identical state" test calls `focusRelationship()` directly (simulating the pointer-click handler body) against one scene and triggers the wired button's `.click()` (simulating what a real browser does identically for Enter/Space on a native `<button>`) against an independent second scene, then asserts `deepEqual` across pressed/active/dimmed state on both. Since both code paths are the same function, this is a structural guarantee, not an inference — but it does not replace an actual Tab-key focus-order check in a browser (would additionally need to confirm the browser truly agrees `<button>`+Enter fires `click`, which is standard HTML behavior but wasn't independently re-confirmed here).

### Files
- `src/relationship-layer.js` — created
- `atlas.html` — modified (added the Relationship Index section/markup, the solid/dashed legend, and the `relationship-layer.js` module script tag; did not alter T3's existing timeline markup)
- `styles/atlas.css` — modified (not originally itemized, but required to render the arcs/index/focus states at all; every new text/background pair reuses one of T3's four already-computed >=7:1 token pairs or the verified inverse-on-accent badge pair — no new token introduced, see file header comment)
- `test/relationship-layer.test.js` — created (not originally itemized; 33 new `node:test` assertions — pure-logic tests with zero DOM, plus a small hand-written fake-DOM shim for the rendering/focus-interaction tests, since Node has no built-in DOM and no browser tool was reachable this session)

### Verification
- [ ] Manual: keyboard-only relationship selection produces correct dim/focus state. **Deferred — no browser tool reachable this session** (`tabs_context_mcp` returned "Browser extension is not connected", same limitation T3/T8 hit earlier in this session). Substituted with the fake-DOM structural proof described in the Acceptance Criteria above. Re-check in an actual browser before T11's accessibility pass or T12's demo.
- [ ] Manual: disable CSS, confirm relationship type/confidence still readable in the text list. **Deferred for the same reason.** Substituted with direct `.textContent` assertions (see above), which is what a CSS-disabled page actually reduces to — not a simulation of the check, but not a captured real-browser screenshot either.
- [x] `node --test` — exit 0, full suite 77/77 pass (44 pre-existing + 33 new in `test/relationship-layer.test.js`).

**Status: Done, with two honestly-flagged open items** — real-browser keyboard-sweep and CSS-disabled visual confirmation both deferred (no browser tool reachable this session); the underlying claims were verified at the DOM-text and interaction-logic level instead, which is a real proof of the same properties but not a substitute for an actual rendered-browser check. Re-check both before T11's accessibility pass or T12's end-to-end demo, consistent with T3's and T8's identical caveat.

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
- [x] Build the drawer: story, people, topics, sources, relationships. `renderDrawerContent()` populates title/meta/story/people/topics/source/relationships as real DOM text nodes; an anchor with zero relationships states this plainly (design.md §9 edge case), matching T4's own convention for an empty state.
- [x] Wire anchor selection (T3) to open it; wire relationship selection (T4) to focus within it. `initContextDrawer()` attaches an additional click listener to each of T3's already-rendered anchor buttons (does not modify `timeline-canvas.js`) that calls `openDrawer()`. Relationship wiring is bidirectional and reuses T4's own `focusRelationship()` as the single source of truth rather than reimplementing it: (1) drawer → T4 — clicking one of the drawer's own relationship buttons dispatches a real `.click()` on the matching Relationship Index button, which runs T4's already-wired handler; (2) T4 → drawer — `syncDrawerHighlight()` mirrors whichever Relationship Index button is currently pressed onto the drawer's own relationship buttons, called both at drawer-open time and whenever an index button is clicked while the drawer is open.
- [x] Implement keyboard open/close with focus return to the triggering anchor. `document.addEventListener('keydown', ...)` closes on Escape when the drawer is open; the close button and scrim also close it. `state.returnFocus` is set once, at open time, to the exact triggering anchor button, and `closeDrawer()` calls `.focus()` on it and nothing else.

### Acceptance Criteria
- [x] Opening/closing the drawer never loses the atlas's visible state behind it. The drawer is a `position: fixed` overlay (`.context-drawer`/`.drawer-scrim`, styles/atlas.css) — the atlas/timeline canvas is never unmounted, hidden, or marked `aria-hidden` by this module. Verified structurally: `test/context-drawer.test.js`'s "opening/closing the drawer never touches the underlying atlas DOM" asserts `canvasRoot`'s children and the triggering anchor button are byte-identical before and after an open/close cycle, with no `aria-hidden` added to the anchor.
- [x] Closing the drawer (Escape or close button) returns focus exactly to the anchor that opened it. **This is the hard, testable requirement — proved structurally, not just claimed:** `test/context-drawer.test.js`'s "full open → read → Escape → close cycle, focus returns exactly to the triggering anchor" test tracks a simulated `document.activeElement` through `openDrawer()` → `closeDrawer()` against real production content (`content/anchors.json`/`relationships.json`), asserts `document.activeElement` equals the *exact* triggering anchor button object (not merely "an" anchor — a same-test distractor element proves it isn't landing on the wrong one), and a second test proves a close→reopen-for-a-different-anchor cycle updates `returnFocus` correctly rather than returning to a stale trigger. **Caveat, stated plainly: this is a DOM-stub proof (`document.activeElement` is a plain object property on a hand-written fake `document`, not a real browser's actual focus/tab-order/screen-reader-announcement behavior).** The `claude-in-chrome` browser extension was tried this session (`tabs_context_mcp`) and returned "Browser extension is not connected" — the same disconnect T3/T4/T8 hit earlier in this session. No real-browser confirmation was possible. Re-check with a real keyboard-only pass in an actual browser before T11's accessibility pass or T12's demo.

### Files
- `src/context-drawer.js` — created
- `atlas.html` — modified (added the drawer markup: `.drawer-scrim`, `#context-drawer` with its close button and content sections; added the `src/context-drawer.js` module script tag; did not alter T3/T4's existing markup)
- `styles/atlas.css` — modified (not originally itemized, but required to render the drawer at all; every new text/background pair reuses one of T3's already-computed >=7:1 token pairs — no new token introduced, per file header comment and this task's contrast-discipline instruction)
- `test/context-drawer.test.js` — created (not originally itemized; 21 new `node:test` assertions — pure-logic tests plus a small hand-written fake-DOM shim, extended with a `focus()`/`document.activeElement` implementation specifically to test the focus-return requirement, since Node has no built-in DOM and no browser tool was reachable this session)

### Verification
- [ ] Manual: full keyboard-only open → read → close → focus-return cycle. **Deferred — no browser tool reachable this session** (`tabs_context_mcp` returned "Browser extension is not connected", tried directly before falling back, consistent with T3/T4/T8's identical caveat). Substituted with the fake-DOM structural proof described in the Acceptance Criteria above, which tracks `document.activeElement` through a simulated open→Escape→close cycle against real production content. This proves the *logic* is correct (the right element reference is stored and refocused); it does not prove real Tab-key focus order, real CSS transition/visibility behavior, or actual screen-reader announcement. Re-check in an actual browser before T11's accessibility pass or T12's end-to-end demo.
- [x] `node --test` — exit 0, full suite 98/98 pass (77 pre-existing + 21 new in `test/context-drawer.test.js`).

**Status: Done, with one honestly-flagged open item** — real-browser keyboard-only open/close/focus-return confirmation deferred (no browser tool reachable this session, tried and confirmed disconnected before falling back); the underlying focus-return logic was verified via a DOM-stub `document.activeElement` trace against real production content instead, which is a real proof of the same property but not a substitute for an actual rendered-browser check. Re-check before T11's accessibility pass or T12's end-to-end demo, consistent with T3's/T4's/T8's identical caveat.

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
- [x] Implement the versioned `localStorage` read/write (`knewzly-visited-v1`, `{version, visited}`).
- [x] Wire drawer-open (T5's `knewzly:drawer-open` CustomEvent hook) to mark visited.
- [x] Add the non-color-only visited indicator (real text badge + aria-label suffix) to both the anchor button and the text anchor list.
- [x] Handle `localStorage` unavailable (private browsing) — atlas stays fully browsable, a non-blocking notice explains progress won't persist.

### Acceptance Criteria
- [x] All of US-004's acceptance criteria, including: closing/reopening the app on the same browser preserves visited state; clearing local storage resets it (expected, not a defect).
- [x] Visited marking never gates access to any anchor (D-001) — proved structurally: every anchor button remains present and clickable, count unchanged, after a visit.

### Files
- `src/visited-tracker.js` — created
- `test/visited-tracker.test.js` — created
- `content/today-stories.json` — created (see note below — this was a real cross-task gap, not originally in T6's file list)

### Verification
- [x] `node --test` — 30/30 pass (this module's suite), 163/163 full project suite
- [ ] Manual real-browser check — deferred, same `claude-in-chrome` extension-disconnected limitation every task this session hit (confirmed disconnected for the orchestrator too). Structural proof used instead (fake-DOM + fake-Storage harness); flagged for re-check before T11/T12.

**Status: Done, with process notes.** The implementing subagent was cut off mid-task by a session usage limit before it could run its own tests or update this file — it left real, mostly-correct code plus a genuinely broken test file (from being mid-edit when killed). The orchestrator (this session) diagnosed and fixed two real bugs directly rather than re-dispatching: (1) the test's own hand-written fake-DOM `appendChild` never set `_parent`, so `element.remove()` silently no-op'd — a test-harness bug, not a `visited-tracker.js` bug; (2) `content/today-stories.json` (the real production file) didn't exist yet, since T10 never actually ran its live pipeline — `initVisitedTracker`'s content-load silently failed and the drawer-open listener never registered as a result. Fixed by seeding a real, honestly-labeled `content/today-stories.json` (`freshnessState: "no_data"`, empty stories — not fabricated news) reflecting actual pre-launch state. This is a genuine cross-task integration finding worth carrying into T12: **anything loading real `content/` needs `today-stories.json` to exist even before T10's job first runs for real.**

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
- [x] Implement export: serialize visited state to the documented JSON shape, trigger download. `buildExportPayload()`/`buildExportPayloadFromStorage()` build the exact design.md §5 shape (`exportedFrom: "knewzly-atlas"`, `schemaVersion: 1`, `exportedAt`, `visited`) via T6's own `readVisited` (no duplicated storage logic); `triggerExportDownload()` is the standard browser pattern — Blob -> `URL.createObjectURL` -> a clicked, removed `<a download>` -> `revokeObjectURL` — with every browser API injectable for testing.
- [x] Implement import: parse, validate `exportedFrom`/`schemaVersion`, prompt merge/overwrite if local state exists, apply. `parseAndValidateImportText()` is the single gate every import path must pass through before anything touches storage; `importFromFile()` orchestrates read -> validate -> (prompt only if `readVisited(storage).visited.length > 0`) -> `applyImport()`, which persists via T6's own `writeVisited`. `importFromFile()` **throws if no `promptMergeOrOverwrite` callback is supplied** — the API itself makes silently picking a mode impossible, not just discouraged by convention.
- [x] Implement malformed-file handling: clear error message, zero mutation of existing state. Covers unparseable JSON, wrong `exportedFrom`, wrong `schemaVersion`, non-array/non-string `visited`, non-object payloads, and file-read I/O errors — each returns `{ ok: false, error }` and returns **before** `readVisited`/`writeVisited` is ever reached for the mutating path, proven in tests by asserting the storage value is byte-identical and the real `knewzly-visited-v1` key received zero writes afterward.

### Acceptance Criteria
- [x] All of US-005's acceptance criteria. Export produces a downloadable file (`triggerExportDownload`); import restores visited state from a previously exported file (`importFromFile` + `applyImport`); import never silently discards existing state (prompt is structurally mandatory whenever local state is present, and `importFromFile` throws if no prompt callback exists at all); malformed/unrecognized files fail safely with a clear message and never corrupt existing progress (see next criterion).
- [x] A malformed/foreign JSON file is rejected with a clear message; existing visited state is provably untouched afterward. **Not a claim taken on faith** — `test/export-import.test.js` proves this for five distinct malformed-input cases (corrupt JSON, wrong `exportedFrom`, wrong `schemaVersion`, unreadable file, and — separately — a cancelled prompt) by asserting `storage.getItem('knewzly-visited-v1')` is byte-identical before/after, that zero writes were made to that real key, and (in one test) that a second, independent call to T6's own `readVisited()` sees the exact same state object afterward — not merely that the function returned an error.
- [x] Import with existing local state always prompts before applying — never silently overwrites or merges. Structurally enforced two ways: (1) `importFromFile` requires the caller to supply `promptMergeOrOverwrite` at all — omitting it throws immediately, so there is no code path that can run without a prompt function existing; (2) the prompt is only skipped when `readVisited(storage).visited.length === 0` (nothing to choose between), which is itself asserted directly in tests (`promptCalled === false` only in the empty-state case, `true` and receiving real counts in every case where existing state is present).

### Files
- `src/export-import.js` — created
- `test/export-import.test.js` — created (not originally itemized, but every prior task in this plan added its own test file the same way; 33 new `node:test` assertions covering pure export/validation/merge-overwrite logic, the `importFromFile` orchestrator's malformed/foreign/cancelled paths, and a hand-written fake-DOM shim for the prompt/status rendering, following the identical convention T4/T5/T6/T9 already established)
- `atlas.html` — modified (not in T7's originally-itemized Files list, but the task dispatch explicitly called for adding the export/import UI to the page; added an "Export & import progress" section with an export button, a file input, and prompt/status live-region containers, plus the `src/export-import.js` module script tag — did not alter any earlier task's existing markup)

### Verification
- [x] `node --test` — exit 0, full suite 196/196 pass (163 pre-existing + 33 new in `test/export-import.test.js`).
- [ ] Manual: export, clear state, import, confirm restored. **Deferred — no browser tool reachable this session** (`claude-in-chrome` reported disconnected all session, confirmed for the orchestrator too as of this task's dispatch; not re-attempted here per that same standing note). Substituted with `triggerExportDownload`/`importFromFile` tests run against the real, unmodified production functions using a fake Blob/URL/document environment and a fake File-alike (`{ text: () => Promise<string> }`, the real File/Blob interface) — this proves the download/parse/apply logic correctly, not actual browser download-manager or file-picker behavior. Re-check in a real browser before T11/T12.
- [ ] Manual: import a deliberately malformed file, confirm rejection + untouched existing state. **Deferred for the same reason.** Substituted with the byte-identical-storage / zero-extra-writes proof described in the Acceptance Criteria above, run against five distinct malformed-input shapes, not a single happy-path negative test.
- [ ] Manual: import while existing state is present, confirm the merge/overwrite prompt appears. **Deferred for the same reason.** Substituted with a fake-DOM proof that `renderMergeOverwritePrompt` renders three real, distinct, separately-clickable buttons (Merge/Overwrite/Cancel — not a native two-way `confirm()`) and that `importFromFile` actually invokes the caller's prompt callback with the real existing/imported counts whenever local state is present.

**Status: Done, with one honestly-flagged open item** (real-browser download/file-picker verification deferred — Chrome extension unavailable this session, per the standing limitation confirmed at this task's dispatch; substituted with direct execution of the real, unmodified production functions against a fake Blob/URL/document/File environment, which proves the same logic but not actual browser download-manager or OS file-picker behavior). No CSS was added for the new export/import controls — outside T7's Owned Surfaces (`src/export-import.*` only); the new `atlas.html` section is functional but unstyled until T11's cross-cutting accessibility/responsive pass, consistent with T11 being the task that owns shared CSS/token fixes across all prior tasks' markup.

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
- [x] Build `StoryGrid`/`StoryCard` from `today-stories.json` fixture data.
- [x] Build `FreshnessBanner` reading `lastUpdated`/`freshnessState`.
- [x] Implement explicit fetch-failure and stale-data UI states (never silently presented as fresh).

### Acceptance Criteria
- [x] Freshness state is visible and matches the fixture's `freshnessState` value exactly — no client-side reinterpretation beyond an aging floor (design.md §14 risk mitigation). Verified: `describeFreshness()` passes the declared `freshnessState` straight through as the label/message unless the age floor (documented thresholds: >6h→stale, >48h→very_stale, >14d→error) forces a worse state; it never reinterprets toward "fresher." See `test/freshness-banner.test.js`.
- [x] A simulated fetch failure produces a clear error state, not an empty or misleadingly-normal panel. Verified: `today.html`'s `init()` catches a rejected `loadContent()` and calls `renderFreshnessBannerError` + `renderStoryGridError`, both with distinct `role="alert"` messaging — neither panel is left blank.

### Files
- `today.html` — created
- `src/story-grid.js` — created
- `src/freshness-banner.js` — created
- `test/freshness-banner.test.js` — created (not originally itemized; automated coverage of the pure freshness-computation logic for all 5 states + age-floor behavior)

### Verification
- [x] `node --test` — exit 0, full suite passes (44/44 as of this task, including T1's pre-existing 6 and T10's pre-existing 24; T8 added 14 new assertions in `test/freshness-banner.test.js`).
- [x] Manual: swap fixture's `freshnessState` through all five values (`fresh/stale/very_stale/no_data/error`), confirm each renders distinctly and truthfully. **Caveat: the Chrome extension used for live-browser verification was not connected in this session (`tabs_context_mcp` returned "Browser extension is not connected"), so this was not confirmed by eye in a real rendered page.** Instead verified by executing the actual production `renderFreshnessBanner`/`renderStoryGrid` functions (unmodified, imported from `src/`) against a minimal DOM stub for all 5 `freshnessState` values plus the fetch-failure and empty-grid paths, and inspecting the resulting element tree — each state produced a distinct CSS class, `data-freshness-state`, label, and message. This exercises the same code path `today.html` calls, but is not the same as an actual rendered-page visual/accessibility check. A real browser check against `today.html?basePath=...` remains recommended before this criterion is considered fully closed.

**Status: Done, with one honestly-flagged open item** (live-browser visual confirmation deferred — Chrome extension unavailable this session; substituted with a DOM-stub execution of the real production render functions, not a re-implementation. Re-check in an actual browser before T11's accessibility pass or T12's end-to-end demo.)

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
- [x] Wire each Today story's `traceToAnchors` field to open the linked anchor's drawer. **Decision made and documented, not silently invented:** since `today.html`/`atlas.html` are separate pages (design.md's two-page structure), "trace to origin" navigates via `atlas.html?anchor=<id>`; `atlas.html` auto-opens that anchor's drawer on load once T5's `knewzly:context-drawer-ready` fires (race-guarded against T5's async content load, with its own timeout backstop).
- [x] Render the story→anchor connection as explicit text (the original "Traces to → ..." text is preserved inside the generated `<a>`, not replaced or only implied by the href).
- [x] Confirm the trace path also triggers `VisitedTracker` (T6): the traced anchor opens via a real `.click()` on the same anchor button T3/T5 already wire, so it flows through T5's identical `knewzly:drawer-open` dispatch T6 listens to — no special-case code needed, verified structurally via T9's own click-simulation tests.

### Acceptance Criteria
- [x] All of US-003's acceptance criteria.
- [x] The linked anchor is marked visited after a trace, identically to direct selection (same event path, not a duplicate mechanism).

### Files
- `src/trace-to-origin.js` — created
- `test/trace-to-origin.test.js` — created
- `today.html`, `atlas.html` — modified (wiring + `?anchor=` handling)

### Verification
- [x] `node --test` — 35/35 pass (this module's suite), 163/163 full project suite
- [ ] Manual: full real-browser trace path — deferred, same extension-disconnected limitation as T6/T3/T4/T5/T8. Structural proof used instead (URL-building tested as pure logic; click-wiring and the ready/error/timeout race tested against a fake document/window). Flagged for re-check before T11/T12, specifically: does a real `atlas.html?anchor=X` load in an actual browser end with that anchor's drawer visibly open?

**Status: Done, with process notes.** Same interruption pattern as T6: this task's subagent was cut off by the session usage limit mid-implementation, before running tests or updating this file. It left two real, findable bugs from being mid-edit: (1) `wireTraceToOrigin` calls `document.createElement` but the test never installed a fake global `document` — the subagent had already written a `makeFakeDocument()` helper but was killed before wiring it up; (2) source-code bug in `trace-to-origin.js` itself: the auto-init guard checked only `typeof document !== 'undefined'`, but `initAtlasTrace()`'s default parameters reference the global `window`, which doesn't exist in Node — fixed by checking both `document` and `window` in the guard. Also fixed a second fake-DOM shim gap (this file's `FakeElement` had no `href` reflection into `getAttribute`, unlike its `id` handling) so the href-assertion tests could actually run. The orchestrator fixed all of this directly rather than re-dispatching.

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
