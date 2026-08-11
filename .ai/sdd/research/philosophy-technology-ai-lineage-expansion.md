# Research Note: Philosophy, Technology & AI Lineage Expansion

> Supporting evidence and non-binding selection rationale only. This note
> cannot approve any SDD gate, and does not modify `.status`,
> `requirements.md`, `PLAN.md`, or steering. It documents the research and
> selection behind the conceptual-mockup expansion at
> `.ai/sdd/design/timeline-atlas-concept.html`, per
> `.ai/sdd/design/handoff-timeline-lineage-expansion.md`.
> Reviewed: 2026-08-07

## 1. Research method and source-quality hierarchy

Three fresh, read-only Herdr research agents (Claude, `--dangerously-skip-permissions`,
launched in new panes in the existing `knewzly` Herdr session/workspace `w1`)
worked bounded, non-overlapping scopes in parallel, then a fourth fresh Herdr
agent reviewed the integrated result (see §"Coordination" below and the
handoff report for pane IDs). Each researcher was told to consult but not
rely solely on Henry's supplied Wikipedia/orientation pages, and to prefer,
in descending order of trust:

1. **Primary texts and primary sources** (original papers, original notes,
   an author's own site, primary institutional records — e.g. Gruber's own
   1993 paper, Vaswani et al.'s arXiv paper, the ENIAC Programmers Project).
2. **Stanford Encyclopedia of Philosophy (SEP) / Internet Encyclopedia of
   Philosophy (IEP)** entries for philosophical claims.
3. **Official institutional histories and archives** (Computer History
   Museum, The National Museum of Computing, IEEE Computer Society, ACM
   Digital Library).
4. **Strong academic secondary sources** (peer-reviewed journal articles,
   university-hosted historiography, e.g. the *British Journal for the
   History of Science* reinterpretation of the Lighthill report).
5. **General-purpose encyclopedic sources (Wikipedia)** as orientation maps
   and bibliographic leads only — never as the sole citation for a
   load-bearing claim.

Each candidate was tagged with a **claim type** — `fact` (directly
verifiable), `interpretation` (a defensible but contestable reading of a
fact), or `conceptual analogy` (an explicit historian's/philosopher's bridge
across eras, not a claim of causal engineering dependency) — and a
**confidence** level, following the precedent already established in
`frank-coyle-talk-gap-analysis.md` and `philosophy-of-innovation-and-media-theory-addendum.md`.

### Coordination (non-binding record)

- Session: `knewzly`, workspace `w1` (canonical cwd
  `C:/Users/henry/Documents/Knewzly`).
- Researcher 1 — Philosophy of technology & systems lineage: pane `w1:p8`
  (a replacement for an initial `w1:p5` launch that correctly refused, per
  its own read-only instructions, to write its report to a file — a second,
  narrowly-scoped launch permitted writing only to a scratch report path).
  Output: `research1-phil-of-tech.md` (scratch copy; findings integrated
  below and into this note).
- Researcher 2 — Philosophy of computation & AI: pane `w1:p6`.
- Researcher 3 — Technical/institutional history & provenance auditor:
  pane `w1:p7`.
- Reviewer — independent post-integration review: a fresh pane recruited
  after the mockup edit (see the handoff return report for its pane ID and
  findings disposition).
- All four agents were read-only: no project file writes, no git commands.
  Claude (this session) remains the sole writer to project files.

## 2. Candidate inventory

Full per-candidate detail (person/institution, region, learner-facing
significance, claim type, confidence, sources) lives in the three
researchers' raw reports, preserved as evidence:

- Philosophy of technology & systems: 20 candidates, spanning Ernst Kapp's
  founding 1877 "organ projection" thesis, Zhuangzi's Cook Ding parable,
  Islamic and South Asian craft-treatise traditions (Banū Mūsā, al-Jazari,
  Śilpa Śāstras), Yoruba Ogun and Ubuntu relational ontology, Heidegger,
  Ellul, Dewey, Arendt, Wiener's cybernetics, the Macy Conferences,
  Bertalanffy's general system theory, Trist & Bamforth's sociotechnical
  systems, Simon, Feenberg, Winner, and Bacon's *New Atlantis*.
- Philosophy of computation & AI: 17 candidates, spanning the
  Church–Turing thesis, McCulloch–Pitts, Newell & Simon's Physical Symbol
  System Hypothesis, Searle's Chinese Room, Dreyfus, Harnad's symbol
  grounding problem, the PDP/connectionist revival, Fodor & Pylyshyn,
  Brooks's subsumption architecture, Varela/Thompson/Rosch's enactivism,
  Clark & Chalmers's extended mind, Bender & Koller, Bender/Gebru's
  "Stochastic Parrots," the "Sparks of AGI" paper, Block's "Blockhead," and
  Dennett's intentional stance.
- Technical/institutional history: 20 candidates, spanning the Polish
  Cipher Bureau's pre-Bletchley Enigma break, McCulloch–Pitts, Colossus,
  the ENIAC women programmers, the Lighthill report (first AI winter),
  DENDRAL and MYCIN, backpropagation's 1986 popularization, the second AI
  winter, the Soviet OGAS proposal, ImageNet, AlexNet, AlphaGo, "Attention
  Is All You Need," Deep Blue, Pearl's Bayesian networks, von Neumann's
  stored-program architecture, Sutton & Barto's reinforcement-learning
  formalization, GPT-3/ChatGPT, and Global-South data-labeling labor —
  plus a same-report **audit of all 16 anchors already in the mockup**
  (see §6).

These full inventories are the working evidence base; only a bounded subset
was selected for the mockup edit (§7).

## 3. Proposed lineage paths (learner questions)

Rather than one master causal chain, the expansion supports several
intersecting, inspectable journeys — each answerable by following typed
arcs and the text relationship list:

1. **"What is a tool, and does it carry values?"** — Zhuangzi's craft
   mastery → Heidegger's enframing → Wiener's cybernetics → today's
   AI-labor and automation debates.
2. **"What can be computed?"** — Turing's 1936 machine → McCulloch–Pitts's
   artificial neuron → Böhm–Jacopini's structured-program theorem →
   backpropagation → the Transformer.
3. **"What counts as intelligence?"** — Turing's 1950 test → Dartmouth →
   Newell & Simon's symbolic creed → Searle's Chinese Room → Brooks's
   embodied counter-program → today's "does an LLM understand?" debate
   (Stochastic Parrots vs. Sparks of AGI).
4. **"Where does meaning come from?"** — Wittgenstein's meaning-as-use →
   the symbol grounding problem → Stochastic Parrots.
5. **"Can a machine originate anything?"** — Lovelace's objection →
   Turing's reply → today's generative-AI authorship debates.
6. **"How did institutions, infrastructure, labor, and power shape AI?"**
   — the Polish Cipher Bureau and ENIAC's uncredited women programmers →
   DENDRAL/expert systems → the AI winters → ImageNet's crowdsourced
   labeling → today's Global-South data-labeling labor.
7. **"How did governance react to technological capability and failure?"**
   — the Lighthill report → Asilomar 1975 → Asilomar AI Principles 2017.

These are starting questions, not predetermined conclusions, per the
handoff's explicit instruction.

## 4. Typed edge list (selected additions)

Using the approved seven-item vocabulary (`influenced`, `enabled`,
`reacted against`, `iterated on`, `institutionalized`, `regulated`,
`conceptual lens`) wherever it fits; a small number of genuinely
foundational, non-causal connections are left unlabeled/absent rather than
forced into the vocabulary (see §5).

| From | Relationship | To |
|---|---|---|
| Turing's machine question (1936) | enabled | McCulloch–Pitts's artificial neuron (1943) |
| Polish Cipher Bureau's Enigma break (1932–1939) | enabled | Turing's Bletchley Park work (1936–1943) |
| McCulloch–Pitts (1943) | enabled | Backpropagation (1986) |
| Wiener's cybernetics (1948) | conceptual lens | Böhm–Jacopini's structured-program theorem (1966) and later agent-loop architectures |
| Backpropagation (1986) | enabled | AlexNet (2012) |
| AlexNet (2012) | enabled | AlphaGo (2016) and the Transformer (2017) |
| Böhm–Jacopini (1966) | enabled | Transformer / attention mechanism (2017) |
| Transformer (2017) | enabled | ChatGPT public launch (2022) |
| Newell & Simon's Physical Symbol System Hypothesis (1976, via Dartmouth 1956) | reacted against | Searle's Chinese Room (1980) |
| Wittgenstein's meaning-as-use (1921/1953) | conceptual lens | Stochastic Parrots critique (2021) |
| Turing's machine question (1936) | reacted against | Searle's Chinese Room (1980) |
| Marx's means of production (1867) | conceptual lens | Global-South data-labeling labor (2021–2023) |
| Heidegger's "Question Concerning Technology" (1954) | conceptual lens | Global-South data-labeling labor (2021–2023) |

## 5. Distinguishing influence, dependency, continuity, reception, and analogy

Following the existing mockup's precedent (already correctly distinguishing,
e.g., Böhm–Jacopini's fact from its agent-loop interpretation), every added
anchor's drawer copy states explicitly which of the following its central
claim is:

- **Documented influence / technical dependency** (e.g. McCulloch–Pitts →
  backpropagation; backpropagation → AlexNet; the Polish Cipher Bureau's
  handover directly enabling Bletchley Park) — presented as `fact` or
  `enabled`/`influenced` edges with primary-source citations.
- **Institutional continuity** (e.g. Dartmouth's field naming →
  DENDRAL/expert-systems funding; Lighthill → UK funding cuts) — presented
  as `institutionalized` with the funding/policy record cited.
- **Later reception or reinterpretation** (e.g. Wiener's cybernetics as a
  now-common lens for agent loops; Marx's framework applied to AI compute
  ownership) — presented as `conceptual lens`, explicitly labeled as a
  later reader's move, not the original author's stated intent.
- **Conceptual analogy** (e.g. Wittgenstein's meaning-as-use as an
  anticipation of LLM word statistics; Heidegger's enframing as a lens on
  data-labor extraction) — presented as `conceptual analogy`, with the
  drawer text stating plainly that the original author did not anticipate
  the later technology.

No new anchor states a conceptual/philosophical connection with the same
confidence label as a documented technical dependency.

## 6. Audit of existing 16 anchors (from Researcher 3)

| Anchor | Finding | Action taken |
|---|---|---|
| Lovelace's objection (1843) | Sourced only to an internal Knewzly research note, not a primary/academic source; weak sourcing for a load-bearing anchor | **Corrected**: drawer source now cites Lovelace's own "Notes" (Note G) framing directly, with the internal research note retained as a secondary cross-reference |
| Marx: means of production (1867) | "Fact + interpretation" label undersells how presentist the "who owns the compute" framing is | **Corrected**: drawer copy now explicitly attributes the AI-compute-ownership reading to later analysts applying Marx's method, not to Marx himself |
| Böhm–Jacopini (1966) | Correctly labeled; no change needed | No change |
| Dawkins: the meme (1976) | Reasonable framing; metaphor is loose but honestly labeled | No change (kept; still useful as the field's own "meme"-adjacent vocabulary bridge) |
| Baudrillard's simulacra (1981) | Correctly flagged as retrospective reading | No change |
| Japan's Fifth Generation (1982–1992) | Was the *only* non-Western/non-Anglo technical anchor in the whole 1936–1993 span | **Addressed**: added Polish Cipher Bureau (Europe/Poland), AlphaGo (Asia/Europe co-anchor), and Global-South data-labeling labor (Africa) to rebalance regional representation |
| Gruber's ontology definition (1993) | Strongest-sourced anchor in the set; good model | No change |
| Asilomar 1975 / 2017 | Well-sourced, honestly framed | No change |
| Structural gap (pattern, not one anchor) | All 16 anchors sat in Philosophy/Europe/North America lanes except one Japan entry; Asia had exactly one entry; no Africa/Latin America representation at all | **Addressed** in the selection (§7): added an Africa lane and a second Asia-linked entry, while being explicit that Latin America and full Indian/Chinese computing history remain open gaps requiring a dedicated future pass, not fabricated placeholder content |

## 7. Selection rationale: added now, deferred, and why

**Selection criteria**, in order: (1) fixes the single biggest audited
structural gap (near-total absence of a 1936–2017 technical/institutional
spine, and near-total absence of non-Western/non-Japan regional
representation); (2) source strength (primary source or SEP-grade
secondary source available); (3) direct, well-evidenced connective tissue
to at least one existing anchor or added anchor, so no candidate becomes an
orphan node; (4) balance across lanes and across the philosophy /
computation / institutional-history scopes, so no single researcher's
material dominates; (5) genuine learner value for a curious 16-year-old
(a concrete story, not an abstract label).

### Added to the mockup now (13 new anchors)

- **McCulloch–Pitts artificial neuron (1943)** — fills the Turing→Dartmouth
  neural-net gap; direct technical dependency chain to backpropagation.
- **Polish Cipher Bureau's Enigma break (1932–1939)** — corrects a
  UK/US-centered wartime-computation narrative; strong primary-source
  handover record.
- **Norbert Wiener's cybernetics (1948)** — direct institutional/vocabulary
  root shared by AI, systems philosophy, and agent-loop framing; connects
  the philosophy-of-technology and technical-history scopes.
- **Heidegger's "Question Concerning Technology" (1954)** — the central
  20th-century critical-philosophy-of-technology reference point; strong
  conceptual-lens candidate for the labor/extraction journey.
- **Zhuangzi's Cook Ding (Daoist craft parable, ancient China)** — genuine
  non-Western alternative to means-end/instrumental technique framing,
  placed in the Philosophy lane alongside Socrates/Aristotle's era.
- **Searle's Chinese Room Argument (1980)** — the single most teachable,
  most-cited philosophical challenge to "does the machine understand,"
  directly useful for a 16-year-old and for framing today's LLM debates.
- **Backpropagation popularized (Rumelhart, Hinton & Williams, 1986)** —
  closes the single largest missing technical-dependency link (Böhm–Jacopini
  1966 to Gruber 1993 currently skips the most consequential ML idea of the
  century).
- **AlexNet wins ImageNet (2012)** — the field's own most-cited "deep
  learning boom starts here" pivot; closes the 1993→2017 gap.
- **AlphaGo defeats Lee Sedol (2016)** — a globally-publicized event held
  in Seoul (DeepMind, UK); adds a second Asia-linked technical anchor and a
  clean reinforcement-learning-vs-search contrast.
- **"Attention Is All You Need" / the Transformer (2017)** — flagged by
  the auditor as the single most load-bearing missing anchor in the whole
  mockup; every current LLM descends from it.
- **ChatGPT public launch (November 2022)** — brings the technical spine to
  the present and gives the Today-panel concept a concrete trace-to-origin
  target.
- **"On the Dangers of Stochastic Parrots" (Bender, Gebru et al., 2021)** —
  a live, current-day continuation of the symbol-grounding/meaning-as-use
  lineage, aimed squarely at the LLM-understanding debate; strong
  Today-panel trace target.
- **Global-South data-labeling labor (Kenya/Sama, c. 2021–2023)** —
  present-day parallel to the ENIAC women programmers; the only added
  Africa-lane anchor, tied to Marx's means-of-production lens; sourced
  cautiously (contested figures, flagged as such in the drawer).

### Explicitly deferred (documented, not silently dropped)

- Ernst Kapp, Ellul, Dewey, Arendt, Feenberg, Winner, Bacon's *New
  Atlantis*, Bertalanffy, Trist & Bamforth, Simon's *Sciences of the
  Artificial*, Islamic/South Asian craft treatises (Banū Mūsā, al-Jazari,
  Śilpa Śāstras), Ogun, and Ubuntu-in-robotics — strong candidates, but
  adding all of them now would push the mockup well past a legible density
  even with filters; deferred to a future expansion pass, prioritized by
  the same criteria above.
- McCulloch–Pitts's philosophical siblings (Church–Turing thesis as a
  distinct node, Newell & Simon's Physical Symbol System Hypothesis,
  Dreyfus, Harnad, Brooks, Fodor & Pylyshyn, Varela/Thompson/Rosch,
  Clark & Chalmers, Dennett, Block) — genuinely good material, deferred
  because Searle's Chinese Room already carries the "does it understand"
  journey adequately at this density; a themed "philosophy of mind and AI"
  expansion pass is the natural next increment.
- ENIAC's women programmers, Colossus, DENDRAL/MYCIN, the Lighthill report,
  the second AI winter, the Soviet OGAS proposal, ImageNet (the dataset,
  distinct from AlexNet), Deep Blue, Pearl's Bayesian networks, von
  Neumann's stored-program architecture, and Sutton & Barto's RL
  formalization — all strong, all deferred; these are the next-highest
  priority for a dedicated "AI winters, infrastructure, and institutions"
  expansion pass, since DENDRAL/Lighthill/second-winter as a trio would
  meaningfully complete the institutional spine without needing to arrive
  all in one pass.
- Chinese, Indian, Latin American, and non-Soviet Eastern European
  computing/AI history — actively researched but **not** added, because
  neither this pass nor the prior two research notes surfaced
  source-verified, non-token candidates strong enough to include
  responsibly. This is recorded as an open gap (§8), not filled with a
  placeholder.

## 8. Counter-readings, contested claims, omissions, and regional blind spots

- **Langdon Winner's "Moses bridges" case** (considered, not added) is
  factually disputed by historians (Joerges 1999) — a caution for any
  future "artifacts have politics" anchor.
- **Śilpa Śāstra dating and single-author "Vishwakarma" framing** risks
  overstating textual unity/antiquity; any future South Asian craft-science
  anchor needs careful multi-source dating, not a single origin story.
- **Ubuntu-in-AI-ethics** is a live, contested application, not settled
  history; flagged for extra care if added later.
- **Cybernetics vs. general system theory** are often flattened into one
  "systems thinking" story but have real disciplinary rivalry (engineering
  vs. theoretical biology); present as parallel/converging, not strictly
  sequential, if Bertalanffy is added later.
- **"AI winter" periodization is itself disputed** among historians (exact
  boundaries, whether there were two distinct winters or a longer
  continuous funding contraction) — deferred anchors in this space will
  need to state that the periodization is a common but not unanimous
  framing.
- **Backpropagation's 1986 "popularization" is not its origin** — the core
  idea traces to Werbos (1974) and earlier; the added anchor's drawer copy
  states this explicitly as a caveat rather than crediting 1986 as a
  first-discovery date.
- **Global-South data-labeling labor sourcing is contested** on specific
  figures/conditions even though the overall phenomenon is well-reported;
  the drawer copy flags this rather than presenting exact numbers as
  settled fact.
- **Confirmed blind spots after this pass**: East Asian systems-philosophy
  reception beyond Japan's Fifth Generation, Latin American computing
  history, Indian computing history (TIFR, early IIT computer science),
  Chinese computing/AI policy history beyond what's implied by "Fifth
  Generation," and Pacific/Indigenous American technological (as distinct
  from ecological) philosophy. None of these were force-fitted into the
  mockup; they are named here as the priority targets for the next
  research pass.

## 9. Density plan: exposing richer lineage without an unreadable wall

The mockup grows from 16 to 29 anchors and from 10 to 25 visible arcs
(13 new typed edges connecting the added anchors, plus one added edge —
`zhuangzi-heidegger` — added during verification to satisfy this note's
own "no orphan node" selection criterion below). This is a materially
higher arc count than an earlier draft of this note stated, and the
filter-row and canvas-width mitigations below were re-checked against the
real 25-arc, 29-anchor result, not the earlier undercount. To keep this
legible rather than a dense data wall, the integration adds:

1. **A thematic filter row** (new, above the timeline caption): toggle
   buttons for `Philosophy & systems`, `Computation & mind`,
   `Institutions & technology`, and `Governance, labor & regions`. Each
   anchor carries one or more `data-theme` tokens; activating a filter
   dims (not hides — per D-001, nothing is ever hidden/access-gated)
   non-matching anchors and arcs, the same visual language already used for
   relationship focus, so a learner can pursue one journey (e.g. "just the
   computation/mind debate") without the full 29-anchor field competing for
   attention. Filters and relationship-focus can combine.
2. **A fifth lane (Africa)**, added only because the selected Kenya labor
   anchor gives it real content — not a token empty lane.
3. **Chronological compression preserved**: the existing "edited, not
   proportional" time axis convention is extended rather than replaced, so
   the already-dense 1980s–2020s cluster of new technical anchors doesn't
   need the whole canvas to stay physically legible; canvas width grows
   moderately (not linearly with anchor count) to keep horizontal scroll
   distance reasonable.
4. **Deferred material stays deferred**: the single largest density lever
   is simply not adding all researched candidates in one pass (§7); this
   is the primary density control, not a UI trick layered on top of an
   unbounded set.

## 9a. Independent review disposition

A fresh Herdr reviewer agent (pane `w1:p9`) inspected the integrated file
after the initial edit. Findings and disposition:

| Finding | Verdict | Disposition |
|---|---|---|
| Several anchor cards overlapped their same-row, same-lane neighbor (real click-target collision) | CONFIRMED | Fixed — every same-lane, same-row anchor pair re-spaced to ≥170px horizontal separation; verified programmatically (0 remaining overlaps) |
| §9's arc-count claim ("10 to 13") undercounted the real total | CONFIRMED | Fixed — corrected to the true count (10 to 25, see §9) |
| `zhuangzi` was an orphan node, violating this note's own §7 criterion | CONFIRMED | Fixed — added a `conceptual lens` edge (`zhuangzi-heidegger`), matching a connection Researcher 1's raw report had already identified (Zhuangzi's craft mastery as a lens for Heidegger's *poiesis* reading) |
| `zhuangzi`, `kenyalabor`, and `chatgpt` cited only internal Knewzly notes, not an external primary/secondary source | CONFIRMED | Fixed — added an SEP entry for Zhuangzi, the original TIME investigative reporting for the Kenya labor anchor, and OpenAI's own announcement post for ChatGPT |
| `alexnet-transformer` edge labeled "Enabled · documented" overstated a looser field-momentum connection (the Transformer's real lineage runs through RNN/attention research, not CNNs) | PLAUSIBLE, accepted | Fixed — downgraded to "Enabled · interpretation" in the relationship-index button and both endpoint anchors' drawer copy, with the caveat stated explicitly in the prose |
| Theme filter dims anchors but not arcs between two dimmed anchors | Minor/cosmetic | Not fixed — optional polish, doesn't violate any stated requirement or D-001; deferred |

Baudrillard remains a deliberate standalone/orphan node, per the same
precedent already recorded in
`philosophy-of-innovation-and-media-theory-addendum.md` (its live
connective tissue isn't a fixed historical anchor, and a forced edge would
misrepresent the claim-type discipline) — the reviewer's own finding #3
explicitly contrasts it with `zhuangzi` rather than flagging it as a new
problem.

## 10. Constraints carried forward

- These are the anchors selected for the **conceptual mockup** at
  `.ai/sdd/design/timeline-atlas-concept.html` only. None of this expands
  or resolves Spec 001's approved 8–10 anchor MVP pilot spine (D-003,
  D-006), which remains separate, bounded requirements work.
- Every added claim keeps its labeled claim type (fact / interpretation /
  conceptual analogy) in the mockup's drawer content, per
  `.ai/steering/principles.md` P-004 and the plan's Source and Provenance
  Baseline.
- This note and the resulting mockup edit do not change `.status`,
  `requirements.md`, `PLAN.md`, `INDEX.md`, or any steering file. The
  mockup remains labeled `Conceptual mockup — proposed, not implemented`.
