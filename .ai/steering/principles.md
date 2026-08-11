# Project Principles

> Status: Active
> Last Updated: 2026-07-31

## Purpose

These principles guide product planning, feature specification, design, implementation, and review for Knewzly.

## How to Use These Principles

- `MUST`: non-negotiable unless Henry explicitly changes it.
- `SHOULD`: strong default; exceptions need a reason.
- If a principle conflicts with an approved SDD artifact, stop and return to the owning gate.

## Principles

### P-001: History First

**Level:** MUST  
**Rule:** The initial product direction must teach AI through historical time and regional context before adding a present-day ecosystem pulse.  
**Reason:** History is the chosen organizing lens for Knewzly.  
**Applies to:** PLAN, PRD, SPEC, TASKS, REVIEW

### P-002: Accessible Without Flattening

**Level:** MUST  
**Rule:** Learner-facing explanations must be understandable to a 16-year-old while preserving meaningful nuance and uncertainty.  
**Reason:** Accessibility should simplify language, not distort the history.  
**Applies to:** PRD, SPEC, TASKS, REVIEW

### P-003: Regional Plurality

**Level:** SHOULD  
**Rule:** Present regional contributions and connections without defaulting to a single-center account when sources support a broader history.  
**Reason:** The product's regional framing should reveal relationships rather than reproduce avoidable blind spots.  
**Applies to:** PLAN, PRD, SPEC, REVIEW

### P-004: Claims Need Provenance

**Level:** MUST  
**Rule:** Historical claims must be traceable to sources, and uncertainty or interpretation must be labeled.  
**Reason:** A learning product about history must make its evidence inspectable.  
**Applies to:** PRD, SPEC, TASKS, EXEC, REVIEW

## Decision Rules

1. Approved requirements take priority over implementation preferences.
2. Source integrity and learner comprehension take priority over decorative complexity.
3. Prefer the smallest experience that tests the selected learning outcome.
4. Ask Henry when a product, scope, sourcing, or technical trade-off remains material.

## Review Expectations

- [ ] Requirements respect all relevant `MUST` principles.
- [ ] Design justifies exceptions to `SHOULD` principles.
- [ ] Tasks include verification for source integrity and accessibility-sensitive behavior.

## Change Policy

- Changes to `MUST` principles require explicit user approval.
- Changed principles do not silently rewrite approved SDD artifacts.

## Open Questions

- What learning outcome should anchor the first product slice?
- What regional scope is appropriate for the first release?

