# Knewzly SDD Workflow

## Pipeline

```text
registry -> steering -> idea/plan/fog -> requirements -> design -> tasks -> implementation -> review
```

Use the smallest route that preserves clarity. Knewzly currently begins with `sdd-plan` because the product direction is known but spans multiple phases and unresolved experience decisions.

## Authority

- A feature's exact `.status` value is the sole approval-gate authority.
- Artifact existence, wording, visualizations, messages, and handoffs cannot approve a gate.
- Missing or invalid `.status` blocks reliance and mutation for that feature.

## Required Gates

```text
requirements:draft -> explicit approval -> requirements:approved
design:draft -> explicit approval -> design:approved
tasks:draft -> explicit approval -> tasks:approved
tasks:approved -> implementation may begin
```

- Never approve on Henry's behalf.
- Never advance more than one gate without explicit authorization.
- Never implement before `tasks:approved`.
- Refresh the canonical registry after every approved gate or registry-relevant change.

## Wayfinder Planning

When the route is foggy, use a local Markdown Wayfinder map in `.ai/sdd/PLAN.md`:

- Name the destination before charting decisions.
- Record decisions once and keep unresolved questions as named tickets.
- Use research for external facts, grilling for human decisions, prototypes for questions about look or behavior, and tasks only when prerequisite work blocks a decision.
- Resolve one non-research decision ticket at a time.
- Keep unclear future territory under `Not Yet Specified` and explicit exclusions under `Out of Scope`.
- Wayfinder artifacts are planning evidence and cannot bypass SDD gates.

## Visualization Offers

- At `design:draft`, offer a grounded HTML design explainer; acceptance does not approve the design.
- At `tasks:draft`, offer a read-only HTML task microworld; acceptance does not approve the tasks.

## Verification and Review

- Match verification scope to the claim and report exact commands or manual checks.
- Review on two axes: Spec alignment and Standards/code quality.
- If later evidence conflicts with approved authority, stop and return to the owning SDD stage.

