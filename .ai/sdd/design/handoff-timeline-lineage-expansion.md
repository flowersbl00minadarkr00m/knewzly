# Handoff: Research and Expand the Interactive Timeline Concept

> Requested by Henry: 2026-08-07
> Target orchestrator: a fresh visible Claude Code session in the canonical Knewzly Herdr workspace
> Status boundary: non-binding research/design spike only

## Objective

Research a broader, defensible lineage connecting philosophy of technology,
philosophy of computer science, philosophy of artificial intelligence,
systems philosophy, the history of technology relevant to AI, and the history
of AI. Plan the lineage before changing the interactive mockup, then build the
best-supported additions into:

`.ai/sdd/design/timeline-atlas-concept.html`

The result should help a curious 16-year-old see how questions, artifacts,
institutions, and reactions carried forward across time and regions. It must
not imply that philosophical analogies directly caused later engineering.

## Authority and boundaries

- Read `.ai/steering/`, `.ai/sdd/PLAN.md`,
  `.ai/sdd/specs/001-global-history-atlas/.status`, and the approved
  `requirements.md` before planning.
- The feature gate is currently `requirements:approved`.
- This task does **not** approve design, tasks, implementation, or anchor
  content. Keep the timeline labelled as a conceptual mockup.
- Do not modify `.status`, `requirements.md`, `PLAN.md`, `INDEX.md`, steering,
  or any other authority-plane file.
- Treat existing research notes and candidate anchors as evidence, not as
  automatically approved content.
- Knewzly is not currently a Git repository. Claude is the sole writer to the
  target mockup and research/plan artifact. Make a dated backup of the target
  HTML before editing it. All recruited agents are read-only researchers or
  reviewers and must not edit project files.

## Required Herdr coordination

Use the installed `herdr` skill and the existing named session `knewzly`,
workspace `w1`, canonical cwd `C:/Users/henry/Documents/Knewzly`.

Create fresh visible Herdr agents for bounded, non-overlapping roles. Use at
least these three roles:

1. **Philosophy of technology and systems lineage researcher**
   - Ancient and non-Western concepts of craft/technology; Bacon, Marx, Kapp,
     Heidegger, Dewey, Arendt, Ellul, systems philosophy, cybernetics, general
     systems theory, sociotechnical systems, and related lineages.
   - Explicitly investigate globally plural traditions rather than treating
     Western philosophy as the universal history of technology.

2. **Philosophy of computation and AI researcher**
   - What computation is; mechanism, formalism, Church–Turing, computability,
     representation, programs, information, intelligence, mind, language,
     embodiment, Chinese Room, symbol grounding, connectionism, situated and
     enactive approaches, and current philosophical questions around AI.

3. **Technical/institutional history and provenance auditor**
   - Relevant technology history, AI history, mathematical and hardware
     foundations, institutions, war/funding, labor/data/infrastructure, AI
     winters, expert systems, statistical learning, deep learning,
     Transformers, generative systems, governance, and regional plurality.
   - Audit every proposed relationship for source strength and claim type.

After Claude integrates the research, use a fresh Herdr reviewer to inspect
the expanded file for historical distortion, forced causality, source gaps,
visual overload, accessibility regressions, and broken interactions.

Claude remains responsible for reconciling disagreements, selecting what
belongs in the concept, editing the files, and verification. Do not let agents
write competing versions of the timeline.

## Henry's supplied orientation sources

- https://en.wikipedia.org/wiki/Philosophy_of_technology
- https://en.wikipedia.org/wiki/Philosophy_of_computer_science
- https://en.wikipedia.org/wiki/Philosophy_of_artificial_intelligence
- https://www.cambridge.org/core/books/cambridge-handbook-of-the-law-ethics-and-policy-of-artificial-intelligence/philosophy-of-ai/EA114E662BF42641EA9720228D69407B
- https://plato.stanford.edu/entries/artificial-intelligence/
- https://en.wikipedia.org/wiki/History_of_artificial_intelligence
- https://en.wikipedia.org/wiki/History_of_technology
- https://en.wikipedia.org/wiki/Systems_philosophy

Use the Wikipedia pages as orientation maps and bibliographic leads, not as
the sole evidence for load-bearing claims. Prefer primary texts, original
papers, official institutional histories, Stanford Encyclopedia of
Philosophy entries, the supplied Cambridge chapter, and strong academic
histories. Record page/section or passage-level locations where practical.

## Existing Knewzly evidence to reconcile

- `.ai/sdd/research/initial-timeline-video-gap-analysis.md`
- `.ai/sdd/research/frank-coyle-talk-gap-analysis.md`
- `.ai/sdd/research/philosophy-of-innovation-and-media-theory-addendum.md`
- `.ai/sdd/design/timeline-atlas-concept.html`
- `artifacts/planning/f01-global-history-atlas/prototype.html`
- `artifacts/planning/f01-global-history-atlas/design-spike.md`

Preserve good existing anchors and correct weak or misleading claims rather
than simply appending more nodes.

## Research and planning deliverable

Before editing the timeline, create:

`.ai/sdd/research/philosophy-technology-ai-lineage-expansion.md`

It must include:

1. A concise research method and source-quality hierarchy.
2. A candidate inventory with date/period, region, people/institutions,
   learner-facing significance, claim type, confidence, and sources.
3. Multiple proposed lineage paths, each with a clear learner question.
4. A typed edge list using the approved vocabulary where possible:
   `influenced`, `enabled`, `reacted against`, `iterated on`,
   `institutionalized`, `regulated`, `conceptual lens`.
5. Explicit distinction among documented influence, technical dependency,
   institutional continuity, later reception, interpretation, and conceptual
   analogy.
6. Important counter-readings, contested claims, omissions, and regional
   blind spots.
7. A selection rationale: what will be added to the mockup now, what will be
   deferred, and why.
8. A density plan explaining how the UI can expose richer lineage without
   becoming an unreadable wall of nodes and arcs.

Do not force all material into one master causal chain. Prefer several
intersecting, inspectable journeys such as:

- What is a tool, and does technology carry values?
- What can be computed?
- What counts as intelligence?
- Where does meaning come from?
- Can a machine originate anything?
- Is intelligence symbolic, statistical, embodied, social, or systemic?
- How did institutions, infrastructure, labor, and power shape AI?
- How did governance react to technological capability and failure?

These are starting questions, not predetermined conclusions.

## Timeline integration requirements

- Keep the existing concept's strongest visual and interaction language.
- Add only the lineages justified by the research/selection rationale.
- Prefer user-selectable journeys, filters, eras, or thematic layers over
  showing every arc simultaneously.
- Each added anchor must show source, claim type, confidence/contested state,
  a simple-English story, people/institutions, topics, and typed relationships.
- Make direct technical dependencies visually/textually distinguishable from
  conceptual lenses and later interpretations.
- Preserve or improve keyboard operability, focus visibility, readable text,
  semantic grouping, reduced-motion behavior, contrast, and mobile usability.
- Keep regional plurality visible. Do not use a token country checklist, and
  do not add a region without evidence of a meaningful contribution or
  relationship.
- Correct any existing factual or interpretive overstatement discovered
  during research.
- Clearly retain `Conceptual mockup — proposed, not implemented` messaging.

## Verification and return

After editing:

1. Validate the HTML/JS and exercise all major interactions.
2. Inspect desktop and narrow/mobile renders, including several expanded
   lineage journeys.
3. Confirm existing interactions still work and no source links or anchors
   are broken.
4. Reconcile the independent Herdr review and fix supported findings.
5. Return a concise report listing:
   - recruited agents and their pane IDs;
   - research artifact created;
   - anchors/edges added, changed, or deferred;
   - important corrections and unresolved uncertainties;
   - verification evidence;
   - exact files changed;
   - confirmation that no SDD approval gate was changed.

