# Selection & Density Plan — AI History Expansion Batch 2

> Supporting evidence and non-binding selection rationale only. Companion to
> `ai-history-expansion-batch-2.md`, which researched ~37 candidate anchors
> but did not itself cut the list down — this note does that missing step
> before anything touches the live mockup, per the density-plan requirement
> in `handoff-timeline-lineage-expansion.md`. Does not modify `.status`,
> `requirements.md`, `PLAN.md`, or steering.
> Compiled: 2026-08-08

## Why a cut was needed

Batch 2 recommended inclusion of 33 of its 37 researched candidates with no
"add now vs. defer" pass. The live timeline already carries 29 anchors.
Adding all 33 in one pass would roughly triple node density and risk the
"unreadable wall of nodes" the original density-plan requirement exists to
prevent — especially since most new candidates cluster in 1954–2024,
already the most crowded stretch of the existing timeline.

## Selection criteria

Anchors were kept if they cleared most of:

1. High source confidence (avoid the batch's own "needs re-verification" /
   "found only via search snippet" flags where a stronger alternative existed).
2. A clean, well-defined typed edge into an anchor already live on the
   timeline (reinforces the existing web rather than adding an orphan node).
3. Fills a genuine gap: an underrepresented region (Europe, Asia), an
   underrepresented theme (governance, institutions, philosophy of mind), or
   a chronological gap in the existing spine (1954–1993 was thin).
4. Distinct enough from an already-live anchor to earn its own card, rather
   than a variant/duplicate story (e.g., `mycin`'s inference-engine
   architecture (B4) was dropped as redundant with the broader DENDRAL/MYCIN
   entry (A3), and the DENDRAL/MYCIN entry itself was deferred to keep North
   America's late-1960s cluster from getting too dense).

## Included this pass (14 anchors)

| id | Region · era | Why kept |
|---|---|---|
| `georgetownibm` | North America · 1954 | First public NLP/MT demo; fills the 1948–1956 gap; ties to `dartmouth`. |
| `masterman` | Europe · 1954–1970s | Non-US, woman-led MT/interlingua research; Europe was thin; regional plurality. |
| `chomsky` | Philosophy · 1957 | Formal-grammar lineage; documented tie to `dartmouth`; documented later reaction from `backprop`-era connectionists. |
| `eliza` | North America · 1966 | First chatbot; direct forerunner of `searle`'s Chinese Room debate. |
| `putnam` | Philosophy · 1967 | Functionalism/multiple realizability; documented link `turing` → `putnam` → `searle`. |
| `prolog` | Europe · 1971–1974 | Logic programming; Europe was thin; documented descent from `dartmouth`. |
| `deepblue` | North America · 1997 | Best-sourced "AI beats human at canonical test" moment pre-AlphaGo; direct contrast edge to `alphago`. |
| `lstm` | Europe · 1997 | Direct technical lineage into `transformer`; Europe was thin; strong `backprop` → `lstm` → `transformer` chain. |
| `gpuneuralnets06` | North America · 2004–2006 | Directly documented technical enabler of `alexnet`; corrects "AlexNet invented GPU training" misconception. |
| `siri` | North America · 2011 | Mainstream deployment marker; documented `gruber` (already an anchor) → `siri` co-founder link. |
| `deepmind` | Europe · 2010–2023 | Institutional history; Europe was thin; documented tie to `alphago`, interpretive tie to `chatgpt`. |
| `sophia` | Asia · 2017 | Asia lane had only 2 anchors; well-sourced critique of AI-personhood hype; ties to `searle`. |
| `llamaleak` | North America/Global · 2023 | Open-weight movement's clearest single dated event; ties to `transformer`. |
| `euaiact` | Europe · 2024 | First comprehensive AI law; governance theme; ties to `chatgpt`. |

Regional effect: Europe goes from 4 to 8 anchors, Asia from 2 to 3 — both
were the thinnest lanes. Philosophy gains 2 (chomsky, putnam), reinforcing
the mind/language throughline. North America gains 6, the smallest
proportional increase since it was already the densest lane.

## Deferred to backlog (not added this pass)

Kept in `ai-history-expansion-batch-2.md` as verified, reusable research —
not lost, just not on the live mockup:

- **Group A:** `dendral_mycin`, `hal9000`, `pagerank`, `darpagc`,
  `openaifive`, `euaiact`'s sibling item `hftokens`.
- **Group B:** `bellman57`, `suttonbarto`, `mycin` (B4, redundant with
  deferred `dendral_mycin`), `rag2020`, the reframed `supervised/unsupervised`
  entry (B6), `deepbeliefnets06`, `transferlearning`, `word2vec`,
  `affectivecomputing`, `simulatedannealing`, `kalmanfilter`,
  `bayesiannetworks`, `mooreslaw`, `mapreduce04`, `aws2006`.
- **Group C:** `heuristics`, `theoryofmind`, `aiconsciousness`.
- Already-recommended exclusions carried forward unchanged: Oceania
  candidate, "OpenClaw," Information Value Theory, "classifiers" as a
  standalone anchor.

A natural second integration pass, if wanted later, would prioritize
`word2vec` and `bayesiannetworks` (both have clean documented edges into
already-live anchors: `word2vec` → `transformer`, `bayesiannetworks` ↔
`mycin`/`dendral_mycin`) plus `darpagc` and `pagerank` for a stronger
2000s North America cluster.

## Density outcome

29 existing + 14 new = **43 anchors**, +19 new typed relationship edges
(all connecting a new anchor to an *existing* live anchor — no isolated
new sub-graph). The existing theme-filter (Philosophy & systems /
Computation & mind / Institutions & technology / Governance, labor &
regions) absorbs all new anchors — no new UI mechanism was needed.

**Layout note (revised from the initial integration pass):** hand-placing
the 14 new anchors into the original 1940px canvas produced real card
overlaps once checked programmatically — the true minimum safe spacing in
the original design is 180px (card width 168px + margin), tighter than
first assumed. Rather than leave overlapping cards or hand-tune bezier arcs
against a layout I could not visually verify (no browser available in this
session — see Verification below), the whole anchor grid was regenerated
from a single shared rank-based time axis: every anchor (old and new) gets
its x-position from its rank among all distinct years present, at a fixed
190px pitch, so within-row spacing is provably ≥190px everywhere and
same-year anchors in different lanes still align vertically (preserving the
original's "read down a column to see what else was happening" property).
All 44 relationship arcs were regenerated as smooth curves from the new
coordinates rather than hand-copied. This widened the canvas from 1940px to
6874px (36 distinct year-slots × 190px) — wider than ideal for a first
glance, but the viewport was already designed for horizontal drag/scroll,
and correctness (zero overlaps, valid SVG/JS) was prioritized over
compactness given the inability to visually spot-check. **Recommend a
follow-up pass, ideally with browser verification available, to compress
this back down** — e.g. variable (non-uniform) pitch instead of a fixed
190px step, closer to how the original hand-tuned layout compressed dense
eras and stretched sparse ones.
