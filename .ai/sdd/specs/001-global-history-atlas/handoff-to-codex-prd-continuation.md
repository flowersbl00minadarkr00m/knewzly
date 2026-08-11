# Codex handoff — continue Knewzly 001-global-history-atlas (F01)

Use this prompt in a fresh Codex session (`$sdd-*` skill invocation convention
applies in this repo — see `.ai/sdd/*` skill packs). There is no `AGENTS.md`
at the repo root; rely on the files below instead.

## Prompt

You are continuing Spec-Driven Development work for Knewzly at
`C:/Users/henry/Documents/Knewzly`. A separate read-only "AAA" accessibility
review session may also be active in this repo — it only reads
`artifacts/planning/f01-global-history-atlas/` and never writes SDD
requirements/design/tasks/`.status`, so it will not conflict with this work.

### Read first, in this order

1. `.ai/steering/product.md`, `.ai/steering/tech-stack.md`,
   `.ai/steering/conventions.md`, `.ai/steering/principles.md`
2. `.ai/sdd/INDEX.md` and `.ai/sdd/PLAN.md`
3. `.ai/sdd/specs/001-global-history-atlas/.status`
4. `.ai/sdd/specs/001-global-history-atlas/requirements.md` (current draft,
   full user stories, FRs, NFRs, Decisions D-001 through D-005, and open
   Questions Q-001/Q-002)
5. `artifacts/planning/f01-global-history-atlas/design-spike.md`,
   `product-design-review.md`, and `prototype.html` — non-binding planning
   evidence only, useful for the pilot anchor content in Q-001 and the
   accessibility bar already exercised there

### Current state — do not skip this

- `.status` for this spec is `requirements:draft`. Requirements are **not
  yet approved**. Design and tasks do not exist.
- Per `.ai/steering/conventions.md`: *"Do not implement before
  `tasks:approved`."* Do not write application code, choose a framework, or
  scaffold a project in this session.
- `.ai/steering/tech-stack.md` is fully undecided (no stack, no
  dependencies) — that decision belongs to `design.md`, not to this step.

### Step 1 — Confirm requirements with Henry (blocking)

Before anything else, present this intent replay to Henry and get explicit
confirmation or corrections. Do not silently treat this as already approved.

> **Intended outcome:** A learner browses a small (8-10 event) curated
> AI-history spine on a time+lane axis, opens an anchor to read its story and
> typed connections, opens a Today story and traces it back to the anchor it
> descends from, and that anchor lights up as "visited" — a mark that
> survives closing the browser and can be exported to a file and re-imported,
> all without an account.
>
> **Must-not-happen:** Any anchor is ever hidden/locked pending "unlocking."
> Any relationship's type or confidence is conveyed by color alone with no
> text equivalent.
>
> **Explicit non-goals:** No accounts, no server-side sync, no live news API,
> no full 24-30 event spine, no quizzes/saved trails, no Archie/AI-generated
> answers.

Then resolve the two open questions in `requirements.md`:

- **Q-001** — the exact 8-10 pilot anchor events and their sources are not
  chosen yet. Recommended: draft a candidate list from
  `artifacts/planning/f01-global-history-atlas/prototype.html`'s example
  events, present it to Henry, get approval.
- **Q-002** — who curates Today stories for MVP. Recommended default (already
  implied by `.ai/sdd/PLAN.md`'s own "Today Panel MVP Slice" resolution):
  manual/reviewed curation, no live API in this MVP.

Only after Henry explicitly approves:

- update the `> Status:` header in `requirements.md` to `Approved`,
- set `.ai/sdd/specs/001-global-history-atlas/.status` to
  `requirements:approved`,
- update the `Specs` row in `.ai/sdd/INDEX.md`.

### Step 2 — Design (`sdd-spec` / `$sdd-spec`)

Only after `requirements:approved`. This is where the framework, rendering
approach, storage mechanism (local + export/import per D-004), and data model
for anchors/typed-edges/visited-state get decided — none of that exists yet.
Respect every Decision already locked in `requirements.md` (D-001 through
D-005), especially:

- D-001: the pilot spine is always fully visible; "visited" is a highlight
  layer only, never access-gating.
- D-004: local device storage + file export/import, no accounts/auth/DB.
- D-005: WCAG 2.2 AAA acceptance bar (NFR-002).

Save `design.md` as Draft, present it to Henry, and only mark
`design:approved` after explicit approval — do not infer approval from the
artifact simply existing.

### Step 3 — Tasks (`sdd-tasks` / `$sdd-tasks`)

Only after `design:approved`. Break the approved design into
independently-implementable, verifiable tasks per
`.ai/steering/conventions.md` and the shared SDD reference's tracer-bullet
task rules. Mark `tasks:approved` only after Henry explicitly approves the
task list.

### Hard rules for this whole session

- Never write or scaffold implementation code before `.status` is
  `tasks:approved`.
- Never infer approval from an artifact existing, being polished, or being
  unopposed — approval must be an explicit statement from Henry.
- If a steering file conflicts with `requirements.md`'s existing Decisions,
  stop and ask which source should be updated rather than silently picking
  one.
- If you find yourself needing to change an already-answered Decision
  (D-001–D-005) or reopen a Wayfinder resolution in `PLAN.md`, stop and get
  explicit approval before proceeding — do not quietly reinterpret it.
