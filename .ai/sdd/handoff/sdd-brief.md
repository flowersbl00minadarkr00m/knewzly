# SDD Handoff Brief: Global History Atlas (F01)

> Status: Draft
> Readiness: Ready for implementation
> Updated: 2026-08-10

## Metadata

- **Spec ID:** `001-global-history-atlas`
- **Spec Path:** `.ai/sdd/specs/001-global-history-atlas/`
- **Current .status:** `tasks:approved`
- **Source Inputs:** `.ai/sdd/PLAN.md` (F01); `artifacts/planning/f01-global-history-atlas/` (non-binding design spike, superseded by the formal spec)

## Product / Feature Summary

- **User / Audience:** Curious and guided learners (16-year-old-readable bar, per P-002), no accounts.
- **Problem:** No connected way to see AI/innovation history laid out by time and region, with current news traced back to its historical origin.
- **Outcome:** A learner completes browse → select anchor → read story/relationships → open a Today story → trace to anchor → see it visited → export → import, unaided.
- **Scope:** Atlas timeline (8-10 pilot anchors), typed relationships, context drawer, bounded live Today panel, visited-state tracking with local export/import.
- **Out of Scope:** Accounts/server sync, full 24-30 event spine, Archie (F08 — separate spec), topic filtering (FR-014, Could Have, deliberately untasked), automated source ingestion (F06).

## Requirements Summary

- **Key User Stories:** `US-001`–`US-005`
- **Must Have Functional Requirements:** `FR-001`–`FR-011`, `FR-015`
- **Should Have:** `FR-012`, `FR-013`
- **Could Have (not tasked):** `FR-014`
- **Important NFRs:** `NFR-001` (usability), `NFR-002` (WCAG 2.2 AAA), `NFR-003` (privacy), `NFR-004` (content trustworthiness)
- **Acceptance Notes:** D-006 (pilot anchor list) is a tracked follow-up resolved by task T2, not a blocking open Question — requirements.md has no open Questions section.

## Design Summary

- **Approach:** Static site, no framework (TD-001), content as versioned JSON (TD-002), scheduled CI job publishes `today-stories.json` — no backend (TD-003), World Monitor's data-quality *patterns* only, not its infrastructure (TD-004), `localStorage` + export/import, no accounts (TD-005).
- **Components / Modules:** `ContentLoader`, `TimelineCanvas`/`EraAxis`/`Lane`/`Anchor`, `RelationshipLayer`, `ContextDrawer`, `VisitedTracker`, Today's `StoryGrid`/`StoryCard`/`FreshnessBanner`, shared `ThemeToggle`/`ReducedMotionGuard`.
- **Data / State:** `content/anchors.json`, `content/relationships.json`, `content/today-stories.json` (CI-published only); `localStorage` key `knewzly-visited-v1` (versioned); export/import JSON file with `schemaVersion`.
- **APIs / Integrations:** None at runtime. Build-time only: the scheduled CI news-refresh job (design.md §6).
- **Technical Decisions:** `TD-001`–`TD-005` (design.md §13).
- **Risks / Constraints:** `--ink-faint`-style low-contrast token must not be reintroduced (known defect from the non-binding prototype, design.md §9/§14); CI job silently stopping must not present stale news as fresh (mitigated by a client-side aging floor).

## Implementation Plan

- **Task Source:** `.ai/sdd/specs/001-global-history-atlas/tasks.md`
- **Recommended Order:** `T1 → {T2, T8, T10 in parallel} → T3 → T4 → T5 → T6 → T7 → T9 → T11 → T12`
- **Key Tasks:** `T1` (schema + ContentLoader, frontier), `T2` (pilot content curation, resolves D-006 — real source-verification work, not mechanical), `T11` (AAA accessibility pass, cross-cutting, scheduled last on purpose), `T12` (real-content integration + full demo, the MVP slice's own acceptance gate).
- **Likely Files / Areas:** `content/*.json` + `*.schema.json`, `atlas.html`, `today.html`, `src/*.js`, `styles/*.css`, `test/*.test.js`, `.github/workflows/refresh-today.yml` (or equivalent CI config).

## Verification Plan

```text
Command: node --test
Expected: all suites (content-schema validator, news-pipeline pure functions) exit 0
```

```text
Manual: full keyboard-only pass across every interactive surface; computed contrast ≥7:1 on every shipped text/background token pair; no horizontal overflow at 320/360/390/640/720/1440px; complete unaided user loop per requirements.md's Business Context success signal
```

No automated accessibility/e2e tooling was selected (tech-stack.md gap, resolved for unit/schema tests only — `node:test`, zero new dependencies). Accessibility/responsive/e2e verification stays manual per design.md §15 and tasks.md's per-task Verification sections.

## Review / Release Notes

- **Review Artifact:** `.ai/sdd/specs/001-global-history-atlas/review.md` — not yet created (implementation not yet started).
- **Review Verdict:** Not reviewed.
- **Known Follow-ups:** None yet — implementation hasn't started.

## Handoff Readiness

- **Ready for Implementation:** yes — requirements, design, and tasks are all Approved; `.status` is `tasks:approved`.
- **Ready for QA:** no — nothing implemented yet.
- **Ready for Release:** no.
- **Blockers:** None on the SDD side. Real-world blocker worth naming: T2's pilot content still needs to be curated with genuine source verification before T3 onward can demo against real data (T3-T7 can build against T1's fixtures in the meantime).
- **Recommended Next Action:** Begin execution at task T1 (the only frontier task). See chat for the open questions on *how* execution should be dispatched (orchestration mechanism, git/worktree setup, and T2's verification rigor) — those are execution-mechanism decisions, not SDD-artifact gaps, so they're being resolved in conversation rather than recorded here.
