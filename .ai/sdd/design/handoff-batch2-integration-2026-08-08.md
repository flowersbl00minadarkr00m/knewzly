# Handoff: Batch-2 timeline integration — where things stand

> Durable handoff for a fresh agent session. Read in full before doing
> anything further. Non-binding design-spike work only — does not touch
> `.status`, `requirements.md`, `PLAN.md`, `INDEX.md`, or steering.
> Written: 2026-08-08

## What just happened

Resumed work on Knewzly (SDD status: Spec 001 "Global History Atlas" is
`requirements:approved`; the F07 "Present-Day" concepts and the F01
interactive timeline mockup are a parallel, non-binding design spike track —
see `handoff-newspaper-v2-and-timeline.md` and
`handoff-timeline-lineage-expansion.md` for the earlier chapters of this
same track).

The most recent unintegrated artifact was `research/ai-history-expansion-
batch-2.md` — a 37-candidate research batch that, unlike the first lineage-
expansion pass, did not itself select a bounded subset to add. This session:

1. **Wrote the missing selection/density plan**:
   `research/ai-history-expansion-batch-2-selection.md`. Selected 14 of the
   37 candidates (rationale, deferred-backlog list, and density outcome are
   all there — read it before doing a second integration pass).
2. **Integrated those 14 into `design/timeline-atlas-concept.html`**:
   `georgetownibm`, `masterman`, `chomsky`, `eliza`, `putnam`, `prolog`,
   `deepblue`, `lstm`, `gpuneuralnets06`, `siri`, `deepmind`, `sophia`,
   `llamaleak`, `euaiact` — 29 → 43 anchors, +19 typed relationship edges,
   all connecting into the existing anchor web (no orphan nodes).
3. **Backed up the pre-integration file** to
   `design/timeline-atlas-concept.2026-08-08.bak.html` before editing.
4. **Discovered and fixed a layout bug of my own making mid-session**: my
   first hand-placement of the 14 new anchors produced real card overlaps
   (the original design's true minimum safe spacing is 180px, tighter than
   first assumed). Rather than leave that or hand-tune 19 bezier arcs
   against a layout I couldn't see, I regenerated the *entire* anchor grid
   programmatically from a single shared rank-based time axis (190px pitch)
   and regenerated all 44 arcs from the new coordinates. This is now
   provably overlap-free and internally consistent — see Verification below
   — but it widened the canvas from 1940px to **6874px**, sparser than the
   original's hand-tuned compact/expand rhythm.

## What still needs doing (in priority order)

1. **Visual verification with an actual browser.** No browser tool was
   connected this session (`mcp__claude-in-chrome` reported "extension not
   connected") — everything below was verified statically (parsing,
   referential integrity, geometric overlap checks), never rendered and
   looked at. Before treating this as done to the standard the earlier
   newspaper/atlas concepts met, open it, click through anchors in both
   themes, and confirm nothing looks broken.
2. **Compress the 6874px canvas.** The uniform 190px-pitch rank axis
   guarantees no overlaps but wastes space compared to the original's
   variable pitch (tight where anchors cluster, stretched where they don't).
   A follow-up pass — ideally with browser verification available — should
   hand-tune spacing back down closer to the original's ~1940–2500px range
   while preserving the ≥180px minimum. See the "Layout note" in
   `ai-history-expansion-batch-2-selection.md` for the exact constraint.
3. **Second integration pass (optional, deferred by design):** the
   selection doc lists 23 researched-but-deferred candidates. If wanted,
   `word2vec` and `bayesiannetworks` were flagged as the strongest next
   additions (clean documented edges into already-live anchors).
4. Nothing else in the parallel design-spike track (the newspaper concept's
   palette/outbound-links/click-in-detail work from
   `handoff-newspaper-v2-and-timeline.md`) was touched this session — it
   remains at whatever state that handoff's executor left it in.

## Verification evidence (static only — see item 1 above)

- `node -e "new Function(...)"` on the extracted `<script>` block: **JS
  syntax OK**.
- Python `html.parser`: **HTML parses without errors**.
- Programmatic overlap check across all 5 lanes / 7 anchor rows: **0
  overlaps** (minimum gap enforced ≥190px, card width 168px).
- Cross-reference check: all 44 SVG arc `data-rel` ids ↔ all 44
  `data-focus-rel` relationship-index buttons ↔ every anchor's
  `data-relations` tokens ↔ all 43 `data-event` ids ↔ all 43 JS `events{}`
  keys — **fully consistent, zero dangling references**.
- File sizes: `timeline-atlas-concept.html` 118KB, well within any
  reasonable bound.

## Files touched this session

- `design/timeline-atlas-concept.html` — edited (14 anchors, 19 edges, full
  coordinate/arc regeneration).
- `design/timeline-atlas-concept.2026-08-08.bak.html` — new, pre-edit backup.
- `research/ai-history-expansion-batch-2-selection.md` — new, the missing
  selection/density plan.
- Nothing else. `.status`, `requirements.md`, `PLAN.md`, `INDEX.md`,
  steering: untouched.

## Shareable previews (published this session, private by default)

Stripped copies (no `<!doctype>/<html>/<head>/<body>` wrapper — Artifacts
supply their own) were published as Claude Artifacts for Henry to look at
without opening local files:

- Timeline mockup (F01, this session's work): the artifact published from
  this conversation — ask Henry or check `claude.ai/code/artifacts` if the
  URL wasn't carried forward to you.
- Newspaper concept (F07 lead direction): same — published alongside it.

Both are private; only Henry can decide to share them further. If you
re-integrate more anchors or otherwise change `timeline-atlas-concept.html`,
regenerate the stripped copy and republish to the *same* artifact URL
(don't mint a new one) so Henry's existing link stays live — use
`action:"list"` on the Artifact tool to find the URL if it's not in your
context.
