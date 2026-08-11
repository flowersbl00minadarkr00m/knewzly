# Product Design Review — F01 Global History Atlas

> State: Supporting planning evidence only
> Implementation state: Future / not implemented
> Review date: 2026-08-01
> Source: approved `.ai/sdd/PLAN.md`, active steering, and Henry's product direction

## Product verdict

The atlas has a distinctive product promise: help a learner explain how ideas,
institutions, and technical milestones accumulated across regions and time. The
first prototype should prove one narrow loop—orient, compare, trace, inspect
evidence—before adding more lanes, personalization, or a full Archie workflow.

The main design risk is cognitive overload. The main trust risk is that a
beautiful relationship arc could be read as proof of direct causation. The
spike therefore makes typed relationships, uncertainty, and simulated content
visible in the primary surface rather than hiding them in a later help page.

## Review contract

- **Target user:** curious or guided learner, with copy understandable to a
  16-year-old without flattening nuance.
- **Desired outcome:** explain where an AI-related innovation came from, what
  shaped it, and how it connects across regions and time.
- **Current behavior:** no product implementation exists in the canonical
  project; only approved project planning and steering are present.
- **Proposed behavior:** a desktop-first horizontal atlas with continent lanes,
  a persistent philosophy lane, typed arcs, and a context-preserving drawer.
- **Boundary:** this is a non-binding design spike. It does not approve F01
  requirements, design, tasks, or implementation.

## What already works

- History is the entry point, so the product has a clear organizing lens.
- The horizontal axis and parallel lanes make regional comparison a first-class
  action rather than an afterthought.
- A bounded Today panel gives the history-to-present connection a visible home
  without turning Knewzly into a generic news feed.
- The provenance baseline is strong enough to shape the visual language: source,
  date/freshness, claim type, confidence, and contested status are part of the
  experience.

## Gap matrix

| Consideration | State | Category | User impact | Recommendation |
|---|---|---|---|---|
| Outcome clarity | Future | Table stakes | Learners need to know what to do with the atlas | Put “trace one idea” beside the first-use prompt |
| First value | Future | Table stakes | A blank atlas would feel like a museum wall | Seed a guided path and one selected anchor in the prototype |
| Progressive disclosure | Future | Table stakes | Too many events and arcs will obscure the story | Default to anchors; move narrative and weaker edges into the drawer |
| Relationship interpretation | Future | Table stakes | Arcs can imply causation | Use relationship type, strength, and claim label on every selected edge |
| Evidence and correction | Future | Differentiator | History learning needs inspectable claims | Keep source metadata adjacent to the claim, not buried in a footer |
| Accessibility | Future | Table stakes | Canvas density can exclude keyboard and screen-reader users | Provide a semantic event list and a reduced-motion state equivalent |
| Mobile behavior | Future | Table stakes | A shrunk desktop canvas would be unusable | Use stacked lanes plus intentional horizontal time navigation and full-height drawer |
| Today freshness | Future | Later for F01 | Stale news weakens trust | Treat freshness as a visible state and keep Today bounded until F03 requirements |
| Archie | Future | Later for F01 | AI guidance can overreach historical evidence | Keep Archie out of the core F01 loop; define it after provenance contracts |
| Personalization | Future | Later | Saved trails and accounts add state burden | Defer to the plan's later phases |
| Decorative motion | Future | Avoid | Motion can obscure historical sequence | Use restrained transitions with an explicit reduced-motion equivalent |

## Priority sequence

### Now — prove the learning loop

1. One clear shared time axis and a small set of anchor events.
2. One selected event with a context-preserving drawer.
3. One selected relationship that exposes type and strength in text.
4. One visible provenance strip stating that the content is simulated in the
   prototype and must be source-verified before release.
5. Keyboard and mobile equivalents for the same interactions.

### Next — deepen trust and navigation

- Source-linked historical content with dated citations.
- Declutter rules that adapt arc prominence to selection and confidence.
- Bounded Today stories with freshness, topic filters, and trace-to-origin links.
- A comparison mode that keeps the learner's chosen anchor in view.

### Later

- Archie explanations, reflection prompts, quizzes, saved trails, and source
  ingestion, each with its own approved requirements and provenance contract.

### Avoid in this slice

- A broad current-news feed.
- A map-first home screen.
- Unlabeled AI-generated causal explanations.
- Decorative 3D/particle effects or auto-playing motion.

## Cross-product boundaries

| Surface | F01 owns | Adjacent feature owns |
|---|---|---|
| Atlas | time axis, lanes, anchor selection, relationship emphasis | F02 owns medium-depth narrative drawer content |
| Provenance | visible relationship/source state affordance | content pipeline owns source verification and maintenance |
| Today | bounded attachment point and trace entry affordance | F03 owns topic taxonomy, freshness, and news-source policy |
| Archie | no autonomous answer generation in this spike | later feature owns answer contracts, uncertainty, and citations |

## Open decisions that remain material

- Exact anchor list and primary sources for the first curated spine.
- Final lane set and default density at wide and narrow widths.
- Whether the persistent philosophy lane is a formal lane in the data model or
  a typed conceptual overlay.
- The minimum evidence threshold for an arc to appear by default.
- The handoff contract between a Today story and its historical origin trace.

## Review conclusion

Proceed with a self-contained, simulated prototype for design learning only.
Route the observed interaction decisions into F01 requirements and a binding
design after requirements work begins. Keep all prototype screenshots labeled
as simulated and non-binding.

