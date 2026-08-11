# Codex Handoff — Knewzly F01 Global History Atlas

> **From:** independent AAA product review, 2026-08-01
> **Full report:** [`independent-aaa-product-review-2026-08-01.md`](independent-aaa-product-review-2026-08-01.md)
> **Target artifact:** `artifacts/planning/f01-global-history-atlas/prototype.html`

---

## 1. Read this first

**Scope boundary — do not cross it.**

- This handoff and the review it references are **planning evidence only**.
- They do **not** create or approve F01 requirements, design, tasks, `.status`, implementation, or any other SDD gate.
- `.ai/sdd/INDEX.md` still shows zero specs and "implementation is not authorized". That is still true.
- Work on the **non-binding prototype** is in scope. Creating `.ai/sdd/specs/**`, writing a `.status`, or standing up production source is **not** — those need Henry's explicit approval through `sdd-prd` → `sdd-spec` → `sdd-tasks` first.
- If a task below seems to require a new SDD artifact, stop and ask rather than creating it.

**Prior-review context.** A targeted browser review returned PASS 98/100. That review verified keyboard operability, reflow, focus return, 44 px targets and contrast samples — and those checks still largely pass. It did not check whether the timeline plots dates correctly, whether arcs touch their endpoints, whether the content teaches anything, or whether the project could ship. This review scored **24/100** against the AAA *product* bar. Both are accurate about different questions. **Do not treat 98/100 as a baseline of correctness.**

---

## 2. What is actually broken (the short version)

Three defects are correctness failures, not polish gaps. They were measured in a real browser, not inferred.

| # | Defect | Measured evidence |
|---|---|---|
| **1** | **Events are not plotted by date.** Every `left:` is a hand-typed percentage unrelated to the event's own date label. | Errors up to **133 years**. "Agency & reason" (1800s) renders **to the right of** "Codebreaking" (1940s) — visually reversed chronology. Full table in review §C-1. |
| **2** | **Arcs do not connect their own endpoints.** All three `d=` paths are hand-typed literals. | Endpoint error **120–387 px** on an 892×380 canvas. `rel-lens` starts inside the *Africa & global* lane while its named source event sits 387 px away. Review §C-2. |
| **3** | **4 of 7 relationships have no arc at all.** Selecting them dims all three arcs and activates none. | Visual layer says "nothing selected"; text layer says a relationship is selected. Review §C-3. |

See `screenshots/review-2026-08-01-desktop-1440-arc-selected.png` — the correct two endpoint cards are highlighted and the bold arc connects **neither of them**. That single image is the clearest statement of the problem.

**Root cause is shared.** Presentation values (`left:40%`, `d="M90 328…"`) are authored by hand instead of derived from data. Fix the content model and most of the P0 band collapses into it.

**Also confirmed broken:** dead controls with false `aria-pressed` (Today topic filters have no event listener at all); WCAG 2.2 AAA fails on 1.4.6 and 1.4.11, and dimmed states fail even AA at 1.72:1 while remaining focusable; mobile shows 947 px of chrome before the first event, including a legend for arcs that do not render on mobile; zero named people or institutions anywhere in the content.

**Genuinely fixed since the 64/100 review — do not regress these:** topic filters now start truthfully all-off; every event's drawer now shows a relationship whose endpoints include that event; `--line` contrast raised from 1.39 to 3.99/4.43:1; 44×44 targets hold at every width; no horizontal overflow at 1440/720/640/390/360/320; reduced motion honoured; drawer close restores focus to a visible control; zero console errors.

---

## 3. Execution order

The full backlog is **review §K** (27 tasks, KNW-001 … KNW-027), each with user problem, desired outcome, affected files, implementation guidance, acceptance criteria, verification plan, dependencies and effort. Do not re-derive it — work from that section.

```
KNW-001 (data model — DO THIS FIRST)
   ├─→ KNW-002 (date plotting) ─→ KNW-003 (arc geometry) ─→ KNW-012 (graph traversal)
   ├─→ KNW-004 (real content) ──┬─→ KNW-008 (copy) ─→ KNW-009 (mobile) ─→ KNW-010 (drawer)
   │                            └─→ KNW-013 (exemplar source) ─→ KNW-018
   ├─→ KNW-005 (lanes + sticky labels)
   └─→ KNW-014 (OSS scaffolding) ─→ KNW-015 (Archie)

KNW-006 (dead controls) and KNW-007 (a11y) have no dependencies — start both immediately, in parallel.
KNW-011 (search) after 004 + 006.
P2/P3 only once the P0/P1 band is green.
```

**Start today:** KNW-001, KNW-006, KNW-007. The first unblocks everything; the other two remove the most visible credibility damage per hour spent.

**Do not start:** any P2/P3 task, and specifically not KNW-015 (Archie). Archie is correctly deferred out of F01 by `product-design-review.md`; it needs the content model, real sources and OSS scaffolding underneath it first.

---

## 4. Reproducing the evidence

```bash
cd "C:/Users/henry/Documents/Knewzly/artifacts/planning/f01-global-history-atlas" && python -m http.server 8791 --bind 127.0.0.1
```

Then, in a real headed browser at `http://127.0.0.1:8791/prototype.html`, run the three measurements that produced findings 1–3. Each is worth turning into a permanent CI assertion as part of KNW-002 and KNW-003.

**Finding 1 — plotting audit.** Interpolate each event's rendered centre against the rendered `.years` axis positions and compare to its stated date label. Assert `|plotted − stated| ≤ 1 year`.

**Finding 2 — arc endpoint audit.** For each `[data-rel-arc]`, take `path.getPointAtLength(0)` and `getPointAtLength(getTotalLength())`, transform through `getScreenCTM()`, and compare to the rendered centres of the events named in the relationship map. Assert ≤ 8 px from each endpoint card edge.

**Finding 3 — coverage audit.** Assert `document.querySelectorAll('[data-rel-arc]').length === Object.keys(relationships).length`, and that no relationship selection yields `active: []`.

**Screenshots** (Chromium, DPR 2, captured 2026-08-01) are in `screenshots/review-2026-08-01-*.png` at 1440/640/390/320. The capture script is disposable; regenerate with any Playwright-equivalent if needed. On this machine, point `chromium.launch()` at the already-installed build rather than running `playwright install`:

```
C:/Users/henry/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe
```

---

## 5. Content corrections that must land in KNW-004

These are specific and non-optional. Full audit in review §D.

- **Symbolic AI is assigned to Europe. It is wrong.** Dartmouth 1956, Newell/Simon/Shaw, McCarthy, Minsky are North American. This is a factual mis-assignment currently presented as regional evidence.
- **Split Codebreaking** into Polish Cipher Bureau (Rejewski, Różycki, Zygalski, 1932) → Bletchley → Colossus/Flowers, and name the women operators. Highest-value diversity fix available, and it is *historically correct* rather than decorative.
- **Split backpropagation** into the independent-discovery cluster: Linnainmaa 1970 (Finland), Werbos 1974, Amari (Japan), Rumelhart–Hinton–Williams 1986. Presenting 1986 alone is precisely the Americentrism Knewzly exists to correct.
- **Name the euphemisms.** "A new way to focus" must say *attention* and *Transformer*; "Learning machines" must say *perceptron* and *Rosenblatt*. A beginner currently cannot search for a single term on the page.
- **Fill the 1986 → 2017 gap** — a 31-year jump with no LSTM, word2vec, ImageNet, GPUs or seq2seq.
- **Add what the project's own gap analysis already flagged:** AI winters, expert systems, Fifth Generation, Soviet cybernetics, compute/hardware.
- **Lanes for Latin America and the Middle East** — both are named in `design-spike.md §2` and neither exists.
- **Break the single chain.** Despite typed edges, the rendered graph is one linear path — the Great-Man narrative the product was built to refute.

Make regional balance a **CI gate**, not an intention: fail the build if any region exceeds 40% of events, or if a region has zero tier-1/2 sources.

---

## 6. Definition of done for this phase

Not "public alpha ready" — that checklist is review §L. This is the bar for the P0/P1 band:

- [ ] Every event plots within 1 year (or its stated span) of its own date — asserted in CI at 1440/1024/640.
- [ ] Every relationship renders an arc terminating within 8 px of both endpoint cards — asserted in CI, recomputed on resize.
- [ ] Arc count equals relationship count; no selection produces an all-dimmed state.
- [ ] Pointer click succeeds at ≥5 sampled points along every arc.
- [ ] Zero controls carrying `aria-pressed` they do not honour; zero controls whose only feedback is a live region.
- [ ] All text ≥7:1 in default state **and ≥4.5:1 in every transient state** (selected, dimmed, quiet-density); all meaningful non-text ≥3:1; sequential heading order; skip link present.
- [ ] ≥24 events, each naming ≥1 person or institution; ≥1 event with a fully real citation (KNW-013).
- [ ] At 390 px and 320 px, the first historical event sits above 500 px; no legend for a non-rendered visualisation; no keyboard-only instructions below 600 px.
- [ ] No regressions against the "genuinely fixed" list in §2 above.

**Claim only what you verified.** The review demonstrates two affirmative WCAG failures and claims no conformance level as met. Screen-reader announcements, voice control, real browser zoom, non-Chromium engines and reading-level criteria remain unverified by anyone. Do not state AAA conformance without a complete applicable-criterion audit with real assistive-technology testing on ≥2 browser engines.

---

## 7. Open questions for Henry (do not decide these unilaterally)

1. Should the time axis stay non-linear (currently 0.61 px/yr for 1600–1800 vs 6.10 px/yr for 1940–2000)? If yes it must be visibly labelled as compressed. If no, the 1600 start has no content behind it and should move.
2. Is mobile allowed a **different information shape** — period-first grouping with a horizontal era scrubber — rather than the desktop's region-first lanes? The review recommends yes; it is a product decision, not an implementation one.
3. Does the philosophy lane become a formal lane in the data model or a typed conceptual overlay? Still listed as open in `PLAN.md`, and KNW-001's schema needs the answer.
4. What licence pair for code and content? The review recommends the Chronas split (permissive code + CC BY-SA content), but this is Henry's call and blocks KNW-014.
5. Should "Explain the bridge" ship at all before Archie exists? It currently grades free-text historical reasoning with an 8-keyword regex and tells confident wrong answers they are "strong". The review's position: fix it or remove it — do not ship it pretending to evaluate.
