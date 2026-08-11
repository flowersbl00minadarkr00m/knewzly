# Design Spike — F01 Global History Atlas

> State: Non-binding design spike — proposed, not approved
> Feature: F01 — Global History Atlas
> Project plan: approved at `.ai/sdd/PLAN.md`
> Feature requirements: not yet created or approved
> Date: 2026-08-01

This artifact explores the interaction model requested for Knewzly. It is
planning evidence, not a binding `design.md`, and it does not authorize product
implementation.

## 1. Design intent

Help a learner answer one question: “What carried forward, from where, and how
do I know?” The proposed atlas makes time, region, relationship type, and
provenance visible together without turning the first view into a dense data
wall.

The first-use loop is:

```text
Orient on time → compare lanes → trace one typed relationship → inspect context and evidence
```

## 2. Proposed information architecture

```text
Atlas shell
├── global header: Knewzly, search, topic filters, Archie entry point (future)
├── orientation strip: current span, density, demo/provenance state
├── timeline viewport
│   ├── shared time rail
│   ├── regional lanes: North America, Europe, Asia, Africa, Latin America
│   ├── persistent Philosophy lane
│   ├── typed relationship arcs
│   └── semantic event list equivalent for keyboard and assistive technology
├── bounded Today attachment
└── context drawer / detail route
```

The prototype deliberately shows a small number of anchors. A production
version should begin with approximately 24–30 curated anchors and expand only
after the density and source model are approved.

## 3. Component responsibilities

| Component | Responsibility | Accessibility contract |
|---|---|---|
| `AtlasHeader` | page title, search, filters, status | landmarks, labeled controls, visible focus |
| `TimeRail` | shared time orientation and jump points | keyboard-scrollable, text year labels |
| `Lane` | region or philosophy grouping | heading and live count exposed to screen readers |
| `EventAnchor` | concise timeline unit and selection target | real button, date/title/region in accessible name |
| `RelationshipArc` | visual and textual relationship cue | not color-only; selected edge described in text |
| `ContextDrawer` | narrative, what changed, before/after, sources | dialog semantics, focus return, Escape close |
| `TodayPanel` | bounded present-day attachment | separate region, freshness and source status visible |
| `ProvenanceStrip` | source/date/claim/confidence state | plain-language labels, no hidden tooltip dependency |

## 4. State model for the spike

The prototype uses local in-memory state only:

```js
{
  selectedEventId: "transformer-2017",
  focusedRelationshipId: "attention-enabled-transformer",
  activeTopics: ["origins", "compute"],
  drawerOpen: true,
  panelMode: "today-attached",
  evidenceMode: "simulated-content"
}
```

This state is illustrative. No persistence, account, news API, or AI call is
present or implied.

## 5. Relationship language

The visible vocabulary is deliberately typed:

- **Influenced:** evidence supports a meaningful intellectual or technical link.
- **Enabled:** an artifact or institution made a later step possible.
- **Iterated on:** a later development revisited an earlier method.
- **Conceptual lens:** a philosophical or interpretive relationship, not direct
  engineering causation.
- **Contested / indirect:** a weaker claim kept in context until evidence is
  stronger.

Line style, text label, and confidence label work together. No relationship is
communicated by color alone.

## 6. Responsive behavior

### Wide screens

- Keep lane labels pinned while the time canvas scrolls horizontally.
- Reserve a bounded right column for Today so it remains secondary.
- Keep the drawer layered over the atlas with the selected event still visible.

### Narrow screens

- Stack lane summaries vertically, with a focused horizontal time strip.
- Convert Today to an attached section below the atlas rather than a competing
  side column.
- Use a full-height drawer with an explicit close control and focus return.
- Keep relationships as a selected text list when arcs cannot be read clearly.

## 7. Trust, privacy, and degraded states

- Prototype content is labeled **Simulated demo content**.
- A production event must expose source attribution, date/freshness, claim type,
  confidence/relationship strength, and contested or incomplete status.
- If a source is unavailable, retain the event shell but show “Source currently
  unavailable” and do not upgrade the relationship strength.
- If Today is stale, show the timestamp and a bounded stale state; do not hide
  the panel or imply live freshness.
- If JavaScript is unavailable, the rough HTML example still provides a readable
  event list and source labels.

## 8. Prototype findings to carry into requirements

1. Selection must be explicit and reversible; hover may preview but cannot be
   the only way to access a relationship.
2. The drawer should preserve enough of the atlas to retain temporal context.
3. Provenance is most legible when attached to the selected claim and story,
   not isolated in a global “about sources” page.
4. A focused edge should dim unrelated arcs, but a text relationship list must
   remain available for non-visual users.
5. The first view needs a guided entry point so a newcomer is not asked to
   decode the entire atlas alone.

## 9. Verification plan for a future binding design

The later implementation task should verify:

- functional selection, drawer open/close, keyboard traversal, filters, and
  focus return;
- accessible names, landmarks, contrast, zoom, reduced motion, and no
  color-only relationship meaning;
- responsive behavior at wide and narrow breakpoints;
- provenance rendering for fact, interpretation, conceptual lens, contested,
  stale, and source-unavailable states;
- content accuracy only after the curated source set is approved.

## 10. Out of scope for this spike

- production framework or hosting choice;
- real news ingestion or source scraping;
- Archie answer generation;
- user accounts, saved trails, quizzes, analytics, and personalization;
- approval of event list, relationship claims, or release quality.

## 11. Remediation pass after independent AAA review

The attached independent review scored the earlier prototype 41/100 and
returned **WCAG 2.2 AAA: FAIL**. This pass responds to those findings in the
non-binding prototype only. It does not create or approve F01 requirements,
design, tasks, or .status, and it does not make simulated content verified
history.

### Changes carried into the prototype

1. **Relationships are operable learning objects.** Event anchors remain real
   buttons, SVG relationship endpoints are keyboard-focusable/selectable, and a
   complete text relationship list exposes source event, typed relationship,
   target event, evidence status, uncertainty, and a visible simulated source
   path. Selecting a relationship focuses its ancestry and dims unrelated
   edges and endpoints.
2. **Mobile is a different information shape below 600px.** The wide 1,030px
   canvas is replaced by stacked, date-indexed lane cards with real headings.
   Selecting an event centers its mobile card. The relationship list remains
   visible as the arc equivalent. Closing the context panel scrolls the
   selected event into view before restoring focus.
3. **Provenance is claim-level and honest about its state.** Each simulated
   event now has its own metadata record for author/institution, publication
   date, access date, primary/secondary classification, exact supported claim,
   excerpt/location, editorial interpretation, counter-reading/contested
   status, and last-reviewed date. The records intentionally say when values
   are pending; no event is presented as verified.
4. **The learning loop has an action.** The drawer keeps “what came before,”
   “what changed here,” and “what followed,” then asks the learner to predict
   whether the pattern stayed similar, changed, or is uncertain. A deterministic
   feedback sentence follows the choice. The historical event remains the
   dominant surface; Archie is removed from the F01 header and Today is a
   collapsed secondary “Connect to today” affordance.
5. **Enhanced-accessibility posture is explicit.** The prototype uses darker
   text tokens, 44px minimum controls, real lane headings/groups, visible
   focus, labels in addition to color, keyboard relationship controls, a
   reduced-motion equivalent, and a narrow layout that removes the desktop
   canvas below 600px. Verification must still be performed by a separate
   reviewer; this spike does not claim AAA conformance.

### Verification contract for the next review

- Test desktop selection, endpoint and text-list parity, dimming, drawer
  behavior, prediction feedback, and the collapsed Today affordance.
- Test 320px and 390px widths, 200% and 400% zoom equivalents, no page
  overflow, mobile selected-event centering, and focus restoration after
  scrolling.
- Test keyboard-only traversal, visible focus, semantic lane headings,
  relationship labels, reduced motion, and representative contrast samples
  against the 7:1 normal-text target.
- Treat every visible event, relationship, and source record as simulated
  until an approved source set and evidence rubric exist.

### Remaining risks

- The prototype demonstrates the provenance shape, but it does not contain
  real sources or prove historical accuracy.
- A future binding design must decide the actual source rubric, evidence
  thresholds, regional scope, and the formal relationship data model.
- SVG hit areas and focus behavior need a fresh assistive-technology review;
  the text list is the authoritative non-visual fallback.
- The drawer is still a simulated context panel rather than an approved F02
  implementation, and Today remains a placeholder for the later F03 contract.

## 12. Remediation verification evidence

Fresh browser verification was run against the self-contained prototype on
2026-08-01. The captured evidence remains in this planning directory:

- `screenshots/prototype-desktop-drawer-closed.png`
- `screenshots/prototype-desktop-drawer-open.png`
- `screenshots/prototype-mobile-drawer-closed.png`
- `screenshots/prototype-mobile-drawer-open.png`

Measured results:

- At 320px and 390px: the desktop canvas is not rendered, stacked mobile lanes
  are rendered, the complete seven-row text relationship list remains visible,
  and page overflow is false.
- At 640px and 1440px: the desktop canvas is rendered and page overflow is
  false.
- At 720px and 360px zoom-equivalent CSS widths: the relationship list remains
  visible and page overflow is false.
- Visible button controls measured at least 44px wide and 44px high.
- Keyboard activation of the conceptual-lens SVG relationship produced an
  active arc, two dimmed unrelated arcs, four focused endpoints, and one
  pressed text-list row.
- The prediction action produced deterministic feedback; the provenance panel
  exposed nine claim-level fields.
- Desktop and mobile drawer close actions restored focus to the selected event
  when visible; when a topic lens hid that event, focus moved to the visible
  selected-relationship row before the drawer was hidden.
- Reduced-motion emulation produced `0s` drawer transition and animation
  durations with `auto` scroll behavior.
- Representative contrast ratios measured 7.38:1 to 15.55:1 for the sampled
  normal-text pairs, including 7.86:1 for teal text on the pale teal token;
  this is evidence for the prototype token set, not an AAA approval.
- Archie is absent, Today is closed by default, and no `medium confidence`
  wording appears in the rendered prototype.

## 13. Final independent AAA review — remediation pass 2

On 2026-08-01, a fresh visible top-level Codex session performed an independent
read-only review of the current prototype after the remediation above. It
returned **PASS — 98/100** for the requested non-binding prototype checks.

The final patch addressed two issues found during that review:

1. Journey-step selection now synchronizes the drawer relationship chip,
   explanation, type, evidence status, uncertainty, and source path with the
   selected bridge. Learning machines correctly resolves to Learning machines
   → Backpropagation; Backpropagation correctly resolves to Backpropagation →
   A new way to focus.
2. Drawer close now restores focus before applying `hidden`/`aria-hidden`.
   It accepts only visible controls and falls back to the selected relationship
   row, active topic, or guided-start control when a selected anchor is filtered
   out. This removed the reported body-focus loss and Chromium warning.

The independent reviewer rechecked:

- pointer and keyboard SVG arc selection with equivalent active/dimmed states;
- event-specific relationship endpoints for Language & meaning, Symbolic AI,
  Learning machines, Backpropagation, A new way to focus, and Deployment
  choices;
- a six-step current-story journey spanning philosophy, institutional/regional,
  and technical lanes, with typed bridge reasons and source-pending uncertainty;
- mobile lens visibility and truthful initial all-off filtering;
- no page overflow at 1440, 720, 640, 390, 360, or 320px widths;
- sampled contrast, 44px controls, visible focus, reduced motion, and text
  spacing; and
- deterministic explanation feedback and nine claim-level provenance fields.

The reviewer judged the north-star journey learnable, but explicitly did not
claim full WCAG 2.2 AAA conformance. NVDA/JAWS/VoiceOver/TalkBack,
voice-control operation, complete dialog announcements, actual browser zoom,
reading-level criteria, multi-browser behavior, every applicable WCAG
criterion, and historical accuracy against an approved source set remain
unverified. This review does not create or approve F01 requirements, design,
tasks, `.status`, implementation, or any other SDD gate.
