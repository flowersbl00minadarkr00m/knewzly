# Task: Build a newspaper-themed alternate concept of Knewzly's "Present Day" page

## Context

Knewzly is a history-first AI atlas (`.ai/steering/product.md`, `.ai/sdd/PLAN.md`).
A first concept explainer for its "Present-Day Ecosystem Pulse" feature (F07,
currently unimplemented, design-exploration only) was already built and
published as an HTML artifact with an editorial "gazette/atlas" aesthetic:
warm vellum paper, brass/verdigris/route-red cartographic accents, serif
masthead. You do not have that file locally — it lives only as a published
artifact — so do not try to copy it; build an independent alternate take.

Read `.ai/sdd/research/frank-coyle-talk-gap-analysis.md` and
`.ai/sdd/ideas/001-present-day-pulse-design-exploration.md` first for the
real historical content and the scope framing (this is a labeled concept
mockup, not implementation — do not touch the approved Spec 001 atlas work).

## Your task

Build a SECOND, independent concept: the same "Present Day" AI-news page,
but with a genuinely **newspaper** feel in aesthetic and color scheme —
think broadsheet front page: dense multi-column layout, headline hierarchy,
byline/dateline conventions, a real masthead with edition/volume numbering,
black-and-white-plus-one-spot-color restraint (or a warm newsprint palette),
not the cartographic/atlas look already used. Load the `artifact-design`
skill's principles yourself if available in your environment — avoid
generic AI-design defaults (warm cream + serif + terracotta, purple-blue
gradients, Inter/Space Grotesk, emoji markers). Ground it specifically in
actual newspaper conventions (column rules, drop caps, dateline format,
"Continued on" jumps, wire-service-style bylines) rather than a generic
card-grid dashboard.

Content requirements — reuse this real, sourced content, don't invent new
facts:
- Categories: Model Releases, Compute & Energy, Safety & Policy, Labor &
  Economy, Agents & Tools, Research.
- Key companies: Anthropic, OpenAI, Google DeepMind, Meta AI, xAI, Mistral,
  Nvidia.
- Every story must carry a "traces to" link back to a real historical
  anchor from the research note (e.g. Jevons' 1865 Coal Question ->
  today's AI compute/energy story; Japan's 1982 Fifth Generation Project
  -> national AI industrial policy; the 1975 Asilomar recombinant-DNA
  conference -> the 2017 Asilomar AI Principles -> today's voluntary
  safety pledges; Taylor's 1911 Scientific Management -> algorithmic labor
  management; Gruber's 1993 ontology definition -> graph-grounded model
  releases). Feel free to write a few new but historically-grounded story
  headlines using the OTHER anchors in the research note (Quine, RDF/OWL,
  Böhm-Jacopini, Keynes' "technological unemployment," Babbage's economics
  book, Lovelace's objection, Čapek's R.U.R., Wiener's cybernetics ethics).
- Include at least one small graphic/diagram element showing a story's
  lineage back through history (the first concept used a mini SVG
  node-link graph — you can do something more newspaper-native instead,
  like a vertical "on this date" sidebar timeline, if that fits the
  aesthetic better; your call, but make a deliberate choice and justify it
  briefly in your final report).
- Support both light and dark theme via CSS custom properties (the Artifact
  CSP requirement — self-contained inline CSS, no external font/CDN
  requests).

## Output

Save the finished single HTML file to:
`.ai/sdd/design/present-day-newspaper-concept.html`

Also mark it clearly at the top of the file (visible in the rendered page)
as: "Conceptual mockup — proposed, not implemented."

When done, report back: the design decisions you made (palette as named
hex values, type pairing, layout concept — same as the artifact-design
process), why they diverge from the first "atlas/gazette" version, and
confirm the file was saved at the path above.
