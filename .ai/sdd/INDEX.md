# SDD Index

## Upstream Handoffs

- `.ai/strategy/handoff/strategy-brief.md`: missing

## Plan

- `.ai/sdd/PLAN.md`: approved — project planning baseline

## Ideas

| ID | Name | Status | Path |
|----|------|--------|------|

## Feature Workspace

> Numbering source: actual directories under `.ai/sdd/specs/`, not this index.

| Field | Value | Notes |
|-------|-------|-------|
| Next Feature ID | 003 | Recompute from filesystem before creating a new spec |
| Numbering Issues | none | `001-global-history-atlas`, `002-archie-history-companion` created |

## Specs

| ID | Feature | Status | Requirements | Design | Tasks | Review |
|----|---------|--------|--------------|--------|-------|--------|
| 001 | Global History Atlas (F01, bundled minimal F03 trace loop) | implementation:in-progress | Approved | Approved | Approved | — |
| 002 | Archie — History Desk Companion (F08) | design:approved | Approved | Approved | — | — |

## Handoff

- `.ai/sdd/handoff/sdd-brief.md`: **Ready for implementation** — F01 requirements/design/tasks all Approved (2026-08-10)

## Next Actions

- [x] Review and approve `.ai/sdd/PLAN.md`.
- [x] Select F01 — Global History Atlas as the first Phase 1 feature.
- [x] Present intent replay and get explicit requirements approval. (Q-001 anchor list resolved via D-006 — tracked fast follow-up; Q-002 resolved as a draft via D-007 + D-008 — live news required before release, bounded scheduled curated-source editorial model, with provenance/freshness/stale-error transparency; World Monitor is a non-binding design reference.) — **requirements:approved** (Henry approved 2026-08).
- [x] Create and drive `design.md` for F01 to `design:approved` (Henry, 2026-08-10).
- [ ] Create and drive `tasks.md` for F01 to `tasks:approved` (next gate). `tasks.md` is drafted (12 tasks, T1 on the frontier); T2 explicitly tasks the D-006 pilot-content curation as a real blocker, not an assumption.

## Active Planning Spike

- F01 — Global History Atlas: non-binding design spike at `artifacts/planning/f01-global-history-atlas/`, formalized into `design.md`.
- `requirements.md` **Approved**. `design.md` **Approved** (Henry, 2026-08-10). `.status` is `design:approved`; `tasks.md` is the next authorized gate. Key design decisions: TD-001 vanilla JS/no framework, TD-002 content-as-JSON, TD-003 scheduled-CI-job (not backend) for news, TD-004 borrows only World Monitor's data-quality patterns, TD-005 localStorage + export/import. Implementation is not yet authorized.
- Design explainer (read-only, supporting evidence): https://claude.ai/code/artifact/15b0441b-a511-41cd-bf07-fe0b71fc3bf5

## F08 — Archie, History Desk Companion

- Spec: `.ai/sdd/specs/002-archie-history-companion/`
- `requirements.md` **Approved**. `design.md` **Approved** (Henry, 2026-08-10). `.status` is `design:approved`; `tasks.md` is the next authorized gate. Paused once mid-design until F01's design.md existed to build on; resumed and drafted on top of F01's approved TD-001/002/005.
- Design explainer (read-only, supporting evidence): https://claude.ai/code/artifact/9b3d09dd-8109-4442-b175-16ea7132e1c1
- Q-001 and Q-002 resolved as design decisions: TD-004 (Archie uses whichever web-search tool the learner's BYOK provider natively exposes — no separate search vendor) and TD-005 (explainer is in-app view + optional download).
- New component this design introduces beyond F01: a minimal, stateless CORS relay (TD-002) — the one server-side element in the project, required because most model provider APIs block direct browser calls; it stores nothing (no key, no conversation content).
- Key risk named, not hidden: `localStorage`-persisted API key (TD-003) carries a real XSS exposure window, mitigated by a strict CSP at implementation, not eliminated.
- Concept source: `.ai/sdd/design/archie-companion-concept.html`.
