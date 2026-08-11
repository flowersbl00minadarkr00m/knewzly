# Conventions Steering

> Status: Active
> Last Updated: 2026-07-31

## Product and Content Conventions

- Write learner-facing content so a 16-year-old can understand it without losing historical nuance.
- Preserve traceability from a historical claim to its source.
- Distinguish sourced facts, interpretations, uncertainty, and open questions.
- Avoid presenting regional history as a single-center story when the evidence supports multiple contributors.

## Architecture Patterns

- Undecided until design is approved.

## Testing Rules

- Verification commands remain unknown until tooling is selected.
- Future tasks must name proportionate verification and must not claim success without fresh evidence.

## Accessibility / Security Rules

- Accessibility requirements must be made explicit in feature requirements and design.
- Source ingestion, saved learner data, and analytics require explicit privacy and security decisions before implementation.

## Workflow Rules

- `.status` is the sole authority for feature approval gates.
- Requirements, design, and tasks each require explicit user approval before advancing.
- Do not implement before `tasks:approved`.
- Do not infer approval from artifact existence or polished wording.
- Refresh the canonical project registry after approved gates or registry-relevant changes.

## Anti-Patterns

- Do not invent durable product, technical, or sourcing rules to fill an open question.
- Do not silently change an approved artifact when a later stage exposes a conflict.

