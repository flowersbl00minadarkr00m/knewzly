# Idea: Present-Day Ecosystem Pulse — Design Exploration & Scope Priority

> Status: captured
> Created: 2026-08-07
> Authority: design exploration only; not approved requirements, design, or
> implementation scope for F07

## Raw Idea

Henry asked for a creative UI/UX exploration of Knewzly's present-day AI
news experience, citing `github.com/koala73/worldmonitor` as UX
inspiration but wanting a lighter, warmer color tone, organized by
category and key AI companies, with the explicit bar: someone seeing it
should think "this is the damn best AI news tracker they've ever seen"
and find it noticeably easier to keep up with AI news this way.

## What this is

A published concept explainer (not implementation):
https://claude.ai/code/artifact/cf46adb5-2c55-4ce4-9bc5-dbf0c6533011

Design direction taken: an editorial "gazette/atlas" aesthetic — warm
vellum paper tones, a serif masthead, brass/verdigris/route-red accents
drawn from cartographic convention rather than typical dark
data-dashboard styling — explicitly diverging from worldmonitor's dark
globe/map-heavy UI while keeping its core organizing idea (category rail,
company tracker, dense story feed). The one thing worldmonitor's own docs
do **not** claim is a knowledge-graph/relationship visualization between
events — this mockup makes that Knewzly's actual differentiator: every
story carries a "traces to" link that opens a bounded slice of the
history graph (not the full atlas), shown as a real mini node-link
diagram in the mockup, using real anchors from
`research/frank-coyle-talk-gap-analysis.md` (Jevons' 1865 coal economics
→ today's AI compute/energy debate; Japan's 1982 Fifth Generation Project
→ today's national AI industrial policy; the 1975→2017 Asilomar
precedent → today's voluntary safety pledges; Taylor's 1911 Scientific
Management → today's algorithmic labor management).

## The scope tension worth naming explicitly

`PLAN.md`'s approved MVP boundary lists "a broad present-day AI ecosystem
pulse" under **Candidate Won't Have Yet**, and F07 (Present-Day Ecosystem
Pulse) sits in **Phase 3 — Nice to Have**, explicitly sequenced after F01
(Global History Atlas), F02 (Historical Moment Drawer), and even F03/F04/
F05/F06. `product.md`'s own Directional Sequence puts "Present-day AI
ecosystem pulse" last, at position 5 of 5.

Henry is now treating the present-day experience as a near-term
priority, with a specific, high bar ("the best AI news tracker"). That's
a legitimate product-direction call to make — but it's a real change from
the approved sequencing, not a continuation of it, and this idea
deliberately does not resolve that tension by itself. The design
exploration above is safe to have built (visualization/explainer, not
implementation, per standing SDD rules), but building the *actual* F07
feature — or resequencing it ahead of F02–F06 — needs an explicit
decision.

## Possible Directions

### Direction A: Resequence F07 earlier, explicitly

- **Description:** Update `PLAN.md`'s Directional Sequence and Phase
  assignment to move F07 up, with Henry's reasoning recorded as a
  decision.
- **Pros:** Matches what Henry is actually asking for; keeps the plan
  honest about current priority instead of leaving it stale.
- **Cons:** F07 still structurally depends on F03 (Today Panel) per the
  existing dependency graph in `PLAN.md` — the bounded Today panel slice
  needs to exist and work before a "broad ecosystem pulse" can credibly
  build on it.
- **Risks:** Low, as long as the F03 dependency is respected rather than
  skipped.

### Direction B: Treat this as parallel design work, keep F01 as the entry sequence

- **Description:** Keep `PLAN.md`'s sequencing as-is (atlas first), but
  let design/creative exploration of F07 continue in parallel so
  requirements work can start the moment F03 is ready, rather than
  starting cold.
- **Pros:** Doesn't reopen an already-approved plan; still makes forward
  progress on the present-day experience Henry wants to prioritize.
- **Cons:** Doesn't resolve Henry's apparent urgency about this
  specifically.
- **Risks:** Low.

## Recommendation

- [x] Keep exploring
- [ ] Create PLAN now
- [ ] Create REQUIREMENTS directly

**Reason:** The design direction is validated and worth carrying forward,
but resequencing F07 ahead of F01–F06 is Henry's call, not a design
decision — flagging it here rather than silently either honoring the old
sequence or silently jumping the line.
