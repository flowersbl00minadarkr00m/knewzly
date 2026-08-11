# Handoff: Newspaper concept revisions + new interactive timeline mockup

> This is a durable handoff for a fresh agent session. Read this file in
> full before doing anything. It replaces re-deriving context from chat —
> everything you need is here or in the paths cited below.

## Where things stand

Two "Present-Day" concept mockups exist for Knewzly's proposed F07 feature
(design exploration only, not implemented — do not touch approved Spec 001):

1. `design/present-day-atlas-concept.html` — cartographic/gazette style.
2. `design/present-day-newspaper-concept.html` — broadsheet/newspaper style.

Both were independently gauntlet-reviewed by a separate Pi worker; the
result is at `design/gauntlet-review-result.md`. Read it — it verified
every historical trace-link against `research/frank-coyle-talk-gap-
analysis.md` and found the newspaper concept the stronger, more
disciplined execution (working filters, correct claim labeling, no
dark-mode bugs). **Henry has now picked the newspaper concept as the lead
direction.** The atlas concept's bugs were already fixed separately and
it stays as a secondary reference — you are not asked to touch it.

## What Henry asked for now (verbatim intent, your job to execute)

1. **Palette change.** Henry doesn't like the newspaper concept's dark
   theme reading as black, and specifically dislikes the red spot color
   (`--spot: #9d251e` light / `#dc6557` dark) — he finds it hard to read.
   Replace the default/primary background with an **eggshell white**
   (not stark `#fff`, not the near-black `#171614` dark theme as the
   default look) and **drop red as the spot/accent color entirely**. Pick
   a more legible alternative that still reads as serious editorial
   design — a deep ink-navy, a muted forest/pine green, or a warm ochre
   are all defensible newspaper-masthead choices; make a real decision
   and justify it briefly in your report, don't leave it wishy-washy.
   Keep dark-mode support (per the artifact-capabilities theme contract:
   `prefers-color-scheme` + `data-theme` root override in both
   directions) but make sure it's a legible, intentional dark theme, not
   just an inverted version of the color problem Henry just flagged.

2. **New: an interactive HTML mockup of the timeline itself** — this is
   the actual Global History Atlas UX (F01, already approved in Spec
   001 — `.ai/sdd/specs/001-global-history-atlas/requirements.md`, read
   it for the real content model: horizontal time axis, continent lanes,
   anchor events, context drawer with story/people/sources/typed
   relationships, visited-state persistence). Nothing in this codebase
   has mockup'd F01 yet — only the present-day news page has been
   explored. Build a **standalone, interactive** HTML file (real click
   interactions, not just a static screenshot) that gives Henry a genuine
   feel for browsing the timeline: a handful of real anchor events (pull
   from `research/frank-coyle-talk-gap-analysis.md` and
   `research/initial-timeline-video-gap-analysis.md` for real content —
   Aristotle, Gruber, the Dartmouth conference, Böhm–Jacopini, etc.),
   positioned on a shared time axis, clickable to open a context drawer
   with story/people/sources/relationships, matching PLAN.md's already-
   decided interaction model (drawer keeps timeline visible, subdued
   cross-continent arcs that emphasize on hover/selection). Match the
   newspaper's revised palette (eggshell, no red) so the two mockups feel
   like one coherent product, not two unrelated experiments.

3. **Outbound links to real, reputable original sources.** Every present-
   day story currently only has a "traces to" link back through history.
   Add a second, distinct link/affordance per story that would — in a
   real implementation — point to the actual original news source (AP,
   Reuters, etc.) for the full current story. Since the present-day
   stories on this page are explicitly illustrative/fictional (per the
   existing "Illustrative scenario" labeling — do not remove that), this
   outbound link should be visually present and correctly labeled as
   what it would do in the real product, but can point to a real, neutral
   placeholder or be clearly marked as non-functional in the mockup —
   your call on exact mechanics, but the effect at a glance should be:
   "in the real product, clicking this would take you to the original
   reporting."

4. **Story click-in detail — research Ground News for inspiration.**
   Henry specifically wants you to look at Ground News's UI/UX for how a
   story reads when you click into it, for inspiration on how much detail
   a Knewzly story detail view should carry. Key things Ground News does
   well, confirmed via research: a "Bias Breakdown" bar that turns a flat
   list of sources into a visual spectrum, and a real focus on
   *aggregating multiple sources per story* rather than one link. Adapt
   the *spirit* of that (rich, scannable, visual story detail — not a
   thin stub) to Knewzly's actual content model: when a present-day story
   is clicked, the detail view should carry enough to feel substantial —
   the full illustrative scenario text, the historical lineage explained
   in prose (not just a link label), the claim-type label, and the
   outbound "read the original" affordance from item 3. Don't literally
   copy Ground News's political-bias-spectrum mechanic — Knewzly's frame
   is historical lineage, not political bias — but match its standard of
   "enough here that I don't feel like I need to leave the page to
   understand the story."

## Constraints (carried forward, still apply)

- Concept-only. Every file needs its "Conceptual mockup — proposed, not
  implemented" banner. Do not touch approved Spec 001 implementation
  scope, `.ai/sdd/PLAN.md`, or any `.status` file.
- Claim-type discipline (fact / interpretation / conceptual analogy) from
  the research note must be preserved everywhere historical claims appear.
- Self-contained HTML: no external font/CDN requests (inline everything),
  works if later published as a Claude Artifact (no `<!doctype>/<html>/
  <head>/<body>` wrapper needed if you want it artifact-ready — a bare
  `<title>` + `<style>` + body content is the pattern the last two
  concepts used; check `design/present-day-newspaper-concept.html`'s
  structure for the exact convention before you touch it).
- Verify your own work: take real Playwright screenshots (light + dark,
  1440px + 390px) before calling anything done, same standard the
  newspaper concept met the first time. Check console errors are zero.

## Output

- Revise `design/present-day-newspaper-concept.html` in place (palette +
  outbound links + click-in detail view).
- New file: `design/timeline-atlas-concept.html` (the interactive
  timeline mockup).
- Report back: your exact palette decision with hex values and why, a
  summary of the timeline mockup's interaction model, and verification
  evidence (screenshots taken, console-error check, confirmation both
  themes work).
