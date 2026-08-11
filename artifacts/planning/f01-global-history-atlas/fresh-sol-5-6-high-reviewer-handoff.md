# Independent F01 remediation review handoff

Use this prompt in a fresh, visible, top-level Sol 5.6 High session. Do not
silently downgrade. If that exact model/effort/session cannot be provided,
stop and report the blocker.

## Prompt

You are the independent AAA reviewer for Knewzly F01 Global History Atlas.
Review the remediated non-binding planning spike at:

`C:/Users/henry/Documents/Knewzly`

Read first:

- the project `AGENTS.md` instructions supplied with the task;
- `.ai/steering/`;
- `.ai/sdd/INDEX.md` and `.ai/sdd/PLAN.md`;
- `artifacts/planning/f01-global-history-atlas/design-spike.md`;
- `artifacts/planning/f01-global-history-atlas/product-design-review.md`;
- `artifacts/planning/f01-global-history-atlas/prototype.html`;
- all HTML examples and screenshots in that directory;
- the attached independent review feedback that scored the previous prototype
  41/100 and WCAG 2.2 AAA FAIL.

This is a read-only review. Do not edit production source, create or approve
F01 requirements/design/tasks/.status, or mark AAA complete. Treat every event,
relationship, and provenance record in the prototype as simulated until an
approved source set exists.

Review the north-star journey: select a current AI story, follow its sourced
historical ancestry across regional and philosophical/technical lanes, inspect
why each bridge exists, change lenses, and explain what carried forward.

Verify with a real browser at desktop, 320px, 390px, 720px (200%-equivalent
CSS width), and 360px (400%-equivalent CSS width):

1. Relationship arcs/endpoints are selectable by pointer and keyboard; each
   exposes relationship type, evidence status, uncertainty, and visible source
   path; the full text relationship list has equivalent information; unrelated
   edges dim and the selected ancestry is focused.
2. Below 600px the 1,030px desktop canvas is replaced by stacked, date-indexed
   lane cards with real headings; the selected event is centered; selected
   relationships remain available as text; focus returns only after scrolling
   the selected event into view.
3. The selected event exposes claim-level provenance: author/institution,
   publication/access dates, primary/secondary classification, exact supported
   claim, excerpt/location, editorial interpretation, counter-reading or
   contested status, and last-reviewed date. Reject unsupported confidence
   labels such as “medium confidence.”
4. The learning loop includes a prediction/comparison/explanation action with
   feedback and preserves “before / changed / followed.” The historical event
   remains dominant; Archie is absent from the default F01 header; Today is a
   secondary collapsed “Connect to today” affordance.
5. Enhanced accessibility targets hold: sampled normal text is at least 7:1,
   non-inline controls are at least 44×44 CSS px, lane headings/groups are
   semantic, meaning is not color-only, focus is visible, keyboard navigation
   works, reduced motion has an equivalent, and there is no horizontal page
   overflow.

Use the supplied screenshots as evidence but inspect the live prototype for
interaction behavior. Compare the interaction/provenance/learning patterns
against the review’s reference set where useful: NotebookLM, ChatGPT Study
Mode, Epoch AI, Our World in Data, Perplexity, and EU AI Watch. Cite any web
sources used and distinguish observed prototype behavior from inference.

Return a fresh independent report containing:

- a verdict: PASS or FAIL;
- a numeric score out of 100 with category breakdown;
- WCAG 2.2 AAA status and every failed criterion or unverified area;
- exact browser commands, viewport values, and observed evidence;
- regressions or remaining risks, especially simulated provenance and
  assistive-technology behavior;
- whether the north-star journey is actually learnable;
- a clear statement that this review does not approve the SDD gates.

Do not treat this handoff, the prototype, or the prior remediation notes as an
approval. AAA must be judged by your fresh visible session.
