# Independent AAA Product Review — Knewzly F01 Global History Atlas

> **State:** Independent review artifact. Planning evidence only.
> **This document does NOT create or approve requirements, design, tasks, `.status`, implementation, or any other SDD gate.**
> Review date: 2026-08-01
> Reviewed artifact: `artifacts/planning/f01-global-history-atlas/prototype.html` (75 KB, single self-contained file, 393 lines)
> Method: real headed Chromium (Playwright 1.49 + in-browser instrumentation) served over `http://127.0.0.1:8791`, tested at 1440×900, 720×900, 640×900, 390×900, 360×900, 320×900, pointer + keyboard.
> Screenshots: `screenshots/review-2026-08-01-*.png`
> Prior baseline: a targeted browser review returned PASS 98/100. **That score does not survive this review.** Its scope did not include plotting correctness, arc geometry, content depth, or product readiness.

---

## A. Executive verdict

**Overall AAA verdict: NOT READY.**

Knewzly has a genuinely good product idea and a defensible planning trail. What exists today is a *design spike that demonstrates a shape*, and it is honest about being simulated. But measured against the stated bar — "a polished, trustworthy, human-feeling, open-source product" — it is not close, and three of the failures are correctness failures rather than polish failures.

The decisive finding is not accessibility and not visual design. It is this:

> **The atlas does not plot events by date, and the relationship arcs do not connect the events they claim to connect.**

Both were measured, not inferred (§C-1, §C-2). Every event on the timeline is positioned by a hand-typed CSS percentage that has no relationship to its own date label — errors up to 133 years, with one pair rendered in *reverse chronological order* on screen. All three arcs are hand-typed SVG paths whose endpoints miss their own named events by 120–387 px on an 892×380 canvas. A learner who reads the picture instead of the text is being taught something false. For a history product whose entire promise is "see how things connect across time and place," this is the product failing at the one thing it exists to do.

| Dimension | Rating | Note |
|---|---|---|
| Overall AAA verdict | **Not ready** | Correctness failures, not polish gaps |
| Desktop | **4 / 10** | Composed and legible; the atlas inside it is wrong |
| Mobile | **2 / 10** | A collapsed desktop, not a designed mobile experience |
| Content / history | **2 / 10** | 8 events, 0 named people, 0 named institutions, 0 dates verified |
| Archie | **0 / 10** | Entirely absent from the prototype |
| Source / trust | **1 / 10** | 100% placeholder; every provenance field reads "pending" |
| Open-source readiness | **1 / 10** | No repo, license, README, data file, tests, or build |
| Genuinely useful to an 18-year-old beginner? | **No** | They would finish knowing no historical fact they did not already know |
| Looks human-made and professionally designed? | **Desktop: borderline yes. Mobile: no.** | Mobile reads as machine-generated on sight, and the instrumentation explains why |

**On the "does it look AI-generated" question, directly:** your instinct about mobile is correct and I can now say *why*. It is not that the components are ugly — the type scale, the paper/teal/coral palette, and the desktop card rhythm are actually restrained and tasteful. It is that **no editorial decision was made about what mobile is for.** At 390 px the learner scrolls **947 px — more than a full screen — before a single historical event appears**, past: a disclaimer strip, a "START HERE" card, four unexplained topic chips, a **legend explaining line styles for arcs that are not rendered at all on mobile**, and a paragraph of keyboard instructions on a touch device. That is the signature of generated layout: every desktop element preserved, stacked, none removed. A human designer deletes the legend.

**On honesty:** the prototype's self-labeling is a real strength and should be preserved. It never claims to be verified. But "source review pending" appearing in 100% of fields is not a provenance model being demonstrated — it is a provenance model being *described*. One fully worked, genuinely cited event would prove more than nine empty fields across eight events.

---

## B. Scorecard — 24 / 100

Scored against the AAA *product* bar the brief defines, not against "is this a valid planning spike." As a spike it has real value; as a product it is early.

| # | Category | Score | One-line justification |
|---|---|---:|---|
| 1 | Historical depth & global balance | **2 / 10** | 8 events; Asia = 1, Africa = 1; no Latin America, Middle East, Indigenous; zero named people or institutions |
| 2 | Beginner comprehension | **3 / 10** | Copy explains the prototype, not the history; "conceptual lens" ×6, "iterated on" ×8, "excerpt" ×11 |
| 3 | Desktop UX | **4 / 10** | Coherent shell; the atlas mis-plots dates, drops lane labels on scroll, clips 41% at 640 px |
| 4 | Mobile UX | **2 / 10** | 947 px of chrome before content; arc legend with no arcs; 3-screen drawer; selected event hidden |
| 5 | Visual polish & human-made quality | **3 / 10** | Desktop typography is decent; mobile is an uncurated collapse; arc labels float in empty space |
| 6 | Learning design | **3 / 10** | Predict → inspect → explain is a genuinely good loop wrapped around no actual content |
| 7 | Archie support | **0 / 10** | Not present in any form |
| 8 | Current-event / source quality | **1 / 10** | 2 placeholder stories; topic filters are dead controls; all 9 provenance fields "pending" ×8 events |
| 9 | Accessibility & interaction | **5 / 10** | Real strengths, but AAA fails on 1.4.11 and 1.4.6; dimmed states fail even AA; heading order broken |
| 10 | Open-source / public-alpha readiness | **1 / 10** | Single HTML file with hardcoded content; no repo, license, README, schema, tests, or CI |
| | **Total** | **24 / 100** | |

**Why this diverges so far from the prior 98/100.** The prior review verified the checks it was given — keyboard operability, reflow, focus return, 44 px targets, contrast samples, provenance field *count* — and those checks largely still pass. It did not verify whether the timeline plots dates correctly, whether arcs touch their endpoints, whether the content teaches anything, or whether the thing could ship. Both reviews can be accurate about different questions. The 98 was a QA score on a subset; this is a product score on the whole.

---

## C. Evidence-backed findings

Severity: **BLOCKER** (cannot ship, teaches falsehood) · **HIGH** · **MEDIUM** · **LOW**.

### C-1 — BLOCKER · Events are not plotted by date. The timeline is decorative.

**Observed** (1440×900, measured by interpolating each event's rendered centre against the rendered `.years` axis):

| Event | Stated date | Plotted at | CSS source | Error |
|---|---|---|---|---|
| Agency & reason | 1800s | **~1933** | `left:40%` | ~+130 yr |
| Language & meaning | 1900s | **~1978** | `left:68%` | ~+78 yr |
| Codebreaking | 1940s | **~1924** | `left:37%` | ~−21 yr |
| Symbolic AI | 1950s | **~1963** | `left:58%` | ~+13 yr |
| Learning machines | 1958 | **~1947** | `left:47%` | −11 yr |
| Backpropagation | 1986 | **~1981** | `left:70%` | −5 yr |
| A new way to focus | 2017 | **~1986** | `left:74%` | **−31 yr** |
| Deployment choices | 2020s | **~2001** | `left:84%` | ~−20 yr |

Every `left:` value is a hand-typed percentage. **"Agency & reason" (1800s) renders to the *right* of "Codebreaking" (1940s)** — the visual chronology is inverted for that pair. The axis itself is silently non-linear (0.61 px/yr for 1600–1800 vs 6.10 px/yr for 1940–2000) with no indication that the scale is compressed. Half the axis (1600–1900) contains zero events, so the advertised "1600 — NOW" range is unsupported by content.

**Why it matters** A timeline's only job is to encode time as position. This one encodes nothing. A learner comparing "when did Europe vs North America move" is reading noise. **Affected user:** every user, especially the target beginner who cannot detect the error.
**Where** [prototype.html:105](artifacts/planning/f01-global-history-atlas/prototype.html:105) (axis), :116–:140 (all eight `style="left:N%"`). Screenshot: `review-2026-08-01-desktop-1440-initial.png`.
**Direction** Derive `left` from a real date field through a declared, monotonic time scale. Store `start`/`end`/`precision` per event; render the axis from the same scale. If a compressed scale is wanted, label it as compressed.

### C-2 — BLOCKER · Relationship arcs do not connect their own endpoints.

**Observed** Endpoint error, measured in the SVG's own 892×380 coordinate space:

| Arc | Claimed relationship | Start error | End error |
|---|---|---:|---:|
| `rel-lens` | Agency & reason → Symbolic AI | **387 px** | 162 px |
| `rel-enable` | Codebreaking → Symbolic AI | 148 px | 120 px |
| `rel-influence` | Backpropagation → A new way to focus | 125 px | **224 px** |

All three `d=` attributes are hand-typed literals ([prototype.html:108–110](artifacts/planning/f01-global-history-atlas/prototype.html:108)). `rel-lens` begins at (90, 328) — visually inside the *Africa & global* lane near 1750 — while "Agency & reason" sits at (357, 48). The three text labels (`conceptual lens`, `enabled`, `iterated on`) are likewise hard-positioned and float in empty grid space touching nothing.

`review-2026-08-01-desktop-1440-arc-selected.png` shows this at its worst: the conceptual-lens relationship is selected, both endpoint cards are correctly highlighted, six other events are dimmed to near-invisibility — **and the bold dashed arc runs between two points that are not either card.**

**Why it matters** This is the feature the product is named for. It teaches a false ancestry to anyone reading the picture. It also makes the "arcs are subdued until selected" design principle unverifiable.
**Direction** Generate paths from live endpoint geometry (`getBoundingClientRect` or a shared layout model) on load and resize. Anchor labels to path midpoints.

### C-3 — BLOCKER · 4 of 7 relationships have no arc; selecting them dims all arcs and highlights none.

**Observed** Only `rel-lens`, `rel-enable`, `rel-influence` have SVG arcs. Selecting `rel-contrast`, `rel-neural`, `rel-lens-language`, or `rel-deployment` produces `active: []`, `dimmed: [all three]` — the visual layer says "nothing is selected" while the text says a relationship is selected. **Why it matters** Breaks the claimed pointer/text parity and silently under-reports the graph by 57%. **Where** [prototype.html:346](artifacts/planning/f01-global-history-atlas/prototype.html:346).

### C-4 — HIGH · Arc pointer targets are 2 px wide and partly unreachable.

**Observed** `stroke-width: 2px` with no widened hit area. Sampling each path at 25/50/75% length: `rel-lens` and `rel-enable` are hittable at 2 of 3 points (the third is occluded by an `.event` button); **`rel-influence` is hittable at 0 of 3** — occluded by event buttons, and its 75% point falls outside the horizontally-scrolled viewport entirely. **Why it matters** Reproduces the earlier "arcs not pointer-operable" finding in a subtler form: it now works *sometimes*, which is worse for confidence than never working. A 2 px target also fails 2.5.5/2.5.8 by any reading. **Direction** Add a transparent `stroke-width: 24` hit path beneath each visible stroke; raise the arc layer's stacking above `.lane-track`.

### C-5 — HIGH · Mobile is a collapsed desktop, not a designed experience.

**Observed at 390×900** First historical event at **y = 947 px**. Page height 3420 px (3.8 screens). Everything above the fold is chrome. Specifically still rendered on mobile:
- **"Relationship key"** — a legend for solid/dashed line styles, when `.arc-layer` has zero rendered width on mobile (`arcsRendered: false`). A legend for an invisible thing.
- **"Keyboard: Tab through events… Escape closes the context panel."** — on a touch device.
- **"Shared time axis · select an event or relationship endpoint"** — as a header over a view with no time axis and no relationship endpoints.
- **"Density: anchors"** — the only header control, unlabelled as to purpose.

**Why it matters** This is the single largest contributor to the "clunky and AI-generated" first impression, and it is diagnosable rather than vague: the mobile breakpoint hides two containers and stacks the rest. Nothing was cut. **Where** [prototype.html:51–53](artifacts/planning/f01-global-history-atlas/prototype.html:51). Screenshot: `review-2026-08-01-mobile-390-initial.png`.

### C-6 — HIGH · The mobile drawer buries the explanation under metadata.

**Observed at 390×900**, opening "A new way to focus": drawer occupies 84% of the viewport with **2200 px of content in a 756 px window (2.9 screens of internal scroll)**. Reading order is: red warning banner → 2-sentence summary that describes *the prototype* → `Type` → `Evidence status` → `Uncertainty` → `Source path` → *then* "What came before". The learner meets four "pending" metadata fields before a single historical fact. Behind the drawer, the visible cards are Codebreaking and Symbolic AI — **the selected event is not visible**, contradicting the design spike's context-preservation contract. Screenshot: `review-2026-08-01-mobile-390-drawer-open.png`.

### C-7 — HIGH · Lane labels scroll away; region context is lost exactly when comparing regions.

**Observed** `.lane-label` computes to `position: static`. After `scrollLeft = 400` at 1440 px, `labelStillVisible: false` — the region names are gone while the events remain. At 640 px the canvas is 1030 px in a 610 px viewport: **41% hidden and 4 of 8 events clipped at initial load**, with no scroll affordance. The design spike explicitly promised "keep lane labels pinned while the time canvas scrolls horizontally" ([design-spike.md §6](artifacts/planning/f01-global-history-atlas/design-spike.md)). Screenshot: `review-2026-08-01-desktop-640-midband.png`.

### C-8 — HIGH · Dead controls that report state they do not have.

| Control | Behaviour | Evidence |
|---|---|---|
| Today "All / Models / Policy" | **No event listener exists.** Clicking changes nothing; "All" permanently reports `aria-pressed="true"` | measured before/after identical |
| "Search atlas" | Writes to the live region only. **Sighted users get zero feedback** | `liveRegion: "Search is a future interaction…"`, no visible change |

**Why it matters** A control that reports pressed state it does not hold is a truthfulness failure, and the prior review flagged exactly this class of issue for the topic filters (since fixed). It recurred elsewhere.

### C-9 — HIGH · WCAG 2.2 AAA fails; the dimmed states fail even AA.

Measured ratios:

| Sample | Ratio | Verdict |
|---|---:|---|
| Orientation strip muted text on `#ebe9e3` | **6.93 : 1** | **Fails 1.4.6 AAA (7:1)** — normal text at 12.5 px |
| Arc stroke at rest (`opacity .25`) | **1.54 : 1** | **Fails 1.4.11 (3:1)** |
| Arc dimmed (`opacity .08`) | **1.14 : 1** | **Fails 1.4.11** |
| "SIMULATED — NOT VERIFIED" pill border | **2.36 : 1** | **Fails 1.4.11** |
| Dimmed desktop event text (`opacity .26`) | **1.72 : 1** | **Fails 1.4.3 AA (4.5:1)** while remaining focusable |
| Dimmed mobile event text (`opacity .35`) | **2.12 : 1** | **Fails AA** |
| "Density: quiet" mode, all unselected events | **1.72 : 1** | **Fails AA** — a control that makes content unreadable |
| `--line` borders vs paper / panel | 3.99 / 4.43 : 1 | Passes (this **was** fixed since the 64/100 review) |
| Focus outline `#a84e0e` vs paper / white | 4.95 / 5.58 : 1 | Passes |
| Body/muted text on paper, panel, grid | 7.46 – 8.28 : 1 | Passes AAA |

Also: smallest rendered text is **9.00 px** (arc labels), 9.28 px (event kind), 9.44 px (event dates) — legal, but hostile on a learning product.

**Heading order is non-sequential:** the document emits `h2` ("Trace one bridge"), `h3`, `h3`, *then* `h1` ("The long arc into AI"). Event accessible names concatenate without separators — `"1800sAgency & reasonconceptual lens"` — and **omit the region**, contrary to the spike's own `EventAnchor` contract ("date/title/region in accessible name"). No skip link exists.

**Conclusion:** WCAG 2.2 AAA is **not met**. Two AAA criteria fail outright (1.4.6, and 1.4.11 which is AA-level and therefore also blocks AAA). Screen-reader, voice-control, real browser-zoom, reading-level (3.1.5) and multi-browser verification remain entirely unperformed. **No AAA claim should be made.**

### C-10 — HIGH · There is no history in the history product.

Across all eight events there are **zero named people, zero named institutions, zero named places beyond continent, zero verifiable dates, and zero sources.** Every `people` field is the same string: *"Demo metadata pending approved historical curation and source verification."* Event titles are euphemisms that a beginner cannot map onto anything: "A new way to focus" never says *attention* or *Transformer*; "Learning machines" never says *perceptron*; "Codebreaking" never says *Bletchley Park*, *Colossus*, or *Turing*.

### C-11 — MEDIUM · Each event exposes exactly one relationship, hiding the graph.

`renderEvent` binds a single `relId` per event. Symbolic AI is an endpoint of **four** relationships but the drawer shows one. "Related events" is a plain text string (`"Codebreaking · Agency & reason · Backpropagation"`) with no links. The learner cannot traverse the graph from the drawer — the core exploration action.

### C-12 — MEDIUM · "Explain the bridge" grades by keyword regex.

[prototype.html:389](artifacts/planning/f01-global-history-atlas/prototype.html:389) tests `/context|attention|focus|method|earlier|meaning|symbolic|backprop/i` against the learner's text. Typing `"attention changed the pattern"` scores "strong explanation." Typing a correct answer in different words scores "good start." **Why it matters** The pedagogy is sound and the loop is the best idea in the prototype — but false praise on a learning product corrodes exactly the trust the rest of the design works to build. This is the clearest place a *real* Archie would earn its keep.

### C-13 — MEDIUM · Selection dims 6 of 8 events into illegibility.

Selecting any relationship sets `is-dim` (opacity .26) on every non-endpoint event. On an 8-event atlas the learner loses three quarters of the map to see one edge — the opposite of "compare regional paths." Fine at 200 events; wrong at 8.

### C-14 — LOW · Confirmed passes (credit where due)

- No horizontal page overflow at **1440, 720, 640, 390, 360, 320** px. Confirmed.
- Text-spacing override (1.5 line-height / .12em letter / .16em word / 2em para) at 320 px: no overflow, no clipping. **Passes 1.4.12.**
- All visible interactive controls ≥ 44×44 px at every width tested. **Zero sub-target controls found.**
- Reduced-motion media query zeroes transitions and animations.
- Drawer close restores focus to a visible control (verified: focus landed on the selected event button, not `body`).
- Topic filters now start truthfully all-off — **the earlier false-initial-state finding is genuinely fixed.**
- Every event's drawer now shows a relationship whose endpoints include that event — **the earlier mismatched-ancestry finding is genuinely fixed.**
- `--line` non-text contrast raised from 1.39 to 3.99/4.43 : 1 — **genuinely fixed.**
- Zero console errors or warnings across all viewports and interactions.
- Archie absent, Today collapsed by default, no "medium confidence" wording — all as the handoff claimed.

---

## D. Content audit

Depth / Understandability / Global balance / Source quality on 1–5 (5 best). Every row is simulated; no approved source record exists for any of it.

| Event or bridge | Depth | Beginner | Global | Source | Risk of misleading simplification | Recommended change |
|---|:--:|:--:|:--:|:--:|---|---|
| **Agency & reason** (1800s, Philosophy) | 1 | 1 | 1 | 0 | **High** — names no philosopher, no text, no argument. "1800s" excludes Aristotle, Ibn Sina, Descartes, Leibniz, the Nyāya and Mohist logical traditions, all of which the PLAN explicitly wanted. Renders at ~1933. | Split into ≥3 sourced events: formal logic (Aristotle → Boole → Frege), mechanical reasoning (Leibniz, Al-Jazari), and 20th-c. philosophy of mind. Name people and works. |
| **Language & meaning** (1900s, Philosophy) | 1 | 1 | 1 | 0 | **High** — a century compressed to two words. Wittgenstein/Gadamer are in the PLAN but absent here. | Make it one concrete question with one named thinker and one concrete AI consequence (e.g. distributional semantics ← Firth 1957). |
| **Codebreaking** (1940s, Europe) | 2 | 2 | 1 | 0 | **High** — assigned to "Europe" generically. Erases Polish Cipher Bureau (Rejewski, Różycki, Zygalski, 1932), Bletchley's ~8,000 women operators, Colossus/Flowers, and the US/Japanese theatres. | Split into Poland → Bletchley → Colossus. Name women operators explicitly; this is the highest-value diversity fix available and it is *historically* correct, not decorative. |
| **Symbolic AI** (1950s, Europe) | 2 | 2 | 1 | 0 | **Very high** — Symbolic AI is placed in **Europe**. Dartmouth 1956, Newell/Simon/Shaw, McCarthy, Minsky are North American. This is a factual mis-assignment presented as regional evidence. | Re-locate or split. Add Dartmouth 1956 as its own anchor. |
| **Learning machines** (1958, N. America) | 2 | 2 | 1 | 0 | **High** — never says "perceptron" or "Rosenblatt"; omits McCulloch–Pitts (1943) and the 1969 Minsky–Papert critique that caused the winter. | Rename to name the thing. Add the critique as a `reacted against` edge — it is the clearest teachable causal story in the set. |
| **Backpropagation** (1986, N. America) | 2 | 2 | 1 | 0 | **High** — 1986/Rumelhart–Hinton–Williams is the *popularisation*; Linnainmaa 1970 (Finland), Werbos 1974, Amari (Japan) precede it. Presenting 1986 alone is the exact Americentrism Knewzly exists to correct. | Split into independent-discovery cluster. This single change does more for genuine global balance than adding a lane. |
| **A new way to focus** (2017, "Asia / N. America") | 1 | 1 | 2 | 0 | **Very high** — the flagship event never names *attention* or *Transformer*. Lane label says Asia; body says Asia/North America; the paper's authors were at Google (US). The regional claim is unsupported. | Name it. Either source the Asia attribution or move it and add genuinely-Asian anchors (Fukushima's Neocognitron 1980; Amari; Baidu/Tsinghua/RIKEN; ImageNet's Fei-Fei Li). |
| **Deployment choices** (2020s, "Africa & global") | 2 | 2 | 2 | 0 | **Very high** — "Africa & global" is one lane holding Africa, Latin America, the Middle East, Oceania, labour, data and governance. Naming a lane after a continent and filling it with one abstract event is decorative globality. Renders at ~2001. | Split. Concrete anchors exist and are well documented: Kenyan/Ugandan data annotation labour; Masakhane NLP; EU AI Act; China's 2023 generative-AI measures; Chile/Brazil compute policy. |
| `rel-lens` Agency → Symbolic (Conceptual lens) | 1 | 2 | — | 0 | Medium — well-hedged in text, but the **arc misses by 387 px** and the label sits over empty 1800s space | Fix geometry before content |
| `rel-lens-language` Language → Symbolic | 1 | 2 | — | 0 | Medium — **no arc at all** | Render it |
| `rel-enable` Codebreaking → Symbolic (Enabled) | 2 | 2 | — | 0 | **High** — asserts enablement across a mis-located Symbolic AI; unfalsifiable as written | Re-anchor to Dartmouth/Turing 1950 with a citation |
| `rel-contrast` Symbolic → Learning machines (Reacted against) | 2 | 3 | — | 0 | Medium — the best-written edge in the set; **no arc** | Render it; attach Minsky–Papert as evidence |
| `rel-neural` Learning machines → Backprop (Iterated on) | 2 | 3 | — | 0 | Medium — hedge is honest; **no arc** | Render it |
| `rel-influence` Backprop → Transformer (Iterated on) | 1 | 2 | — | 0 | **High** — collapses 1986→2017 with no LSTM, word2vec, ImageNet, GPU, or seq2seq. A 31-year jump with no intermediate. | Insert ≥3 intermediate anchors |
| `rel-deployment` Transformer → Deployment (Institutionalized) | 2 | 2 | — | 0 | **High** — "Institutionalized" is never defined anywhere in the UI | Define every relationship type inline on first use |
| Today: "Why 'context' keeps returning" | 1 | 2 | 1 | 0 | **High** — dated `2026-08-01` with no publisher, author, or URL | Replace with one real, cited story or remove |
| Today: "Who gets to shape deployment?" | 1 | 2 | 1 | 0 | **High** — `<time>` element has **no `datetime` attribute**; reads "JUL 29 · SOURCE PENDING" | Same |

**Structural content findings.** (a) The five lanes are Philosophy, Europe, North America, Asia, Africa & global — **Latin America and the Middle East have no lane at all**, though `design-spike.md §2` lists Latin America. (b) No AI winter, no expert systems, no Japanese Fifth Generation project, no Soviet cybernetics, no ImageNet, no compute/hardware thread — all named as gaps in the project's own `initial-timeline-video-gap-analysis.md`. (c) The visible graph is a **single chain**: Agency → Symbolic → Learning machines → Backprop → Transformer → Deployment. Despite typed edges, the atlas renders the linear Great-Man narrative it was built to refute.

---

## E. Beginner comprehension (the 18-year-old test)

Simulating a bright 18-year-old with no AI background reading the drawer for "A new way to focus":

**What they actually read:**
> "This simulated anchor uses attention as a way to talk about changing how information is connected. It is a design example, not a sourced historical account."
> Type: **Iterated on** · Evidence status: **Source review pending** · Uncertainty: **The bridge does not establish a sole origin** · Source path: **Simulated claim → pending technical paper record → excerpt/location**
> What came before: *"Sequence methods and growing compute made the problem visible."*

**What they understand:** essentially nothing. Diagnosis:

1. **The copy describes the software, not the history.** "This simulated *anchor*", "the *demo* frames", "the *prototype* uses". The learner asked what happened in 2017 and got told what the widget is doing. Jargon frequency in visible copy: *excerpt* ×11, *iterated on* ×8, *conceptual lens* ×6, *anchor* ×5, *ancestry* ×4, plus *provenance*, *claim-level*, *counter-reading*, *institutionalized*, *primary/secondary*, *affordance*.
2. **"Made the problem visible" is exactly the vague phrase the brief warns about.** What problem? Visible to whom? A beginner cannot picture it.
3. **Relationship type names are asserted, never demonstrated.** "Iterated on" appears as a chip, a `dt/dd` pair, and a sentence — but the learner is never shown *what* was iterated on. Naming a relationship is not teaching one.
4. **Euphemistic titles block all outside connection.** They have heard of ChatGPT. Nothing on this page contains a word they could search or recognise.
5. **Nine "pending" fields read as "we don't know anything."** Intended as epistemic honesty, received as emptiness.

**Rewrites — same honesty, teachable:**

| Current | Rewrite |
|---|---|
| "A new way to focus" | **"Attention: the Transformer (2017)"** |
| "This simulated anchor uses attention as a way to talk about changing how information is connected." | **"Before 2017, translation software read a sentence one word at a time and often lost track of the beginning by the end. A team at Google published a design that let the model look at every word at once and *decide which words matter most* to each other — they called this attention. Almost every AI system you have heard of, including ChatGPT, is built on this idea."** |
| "Sequence methods and growing compute made the problem visible." | **"Earlier systems processed words in order, one after another. That made long sentences slow to train and easy to garble — and by 2015 researchers had enough computing power to try something more ambitious."** |
| "Iterated on: the demo frames the later architecture as revisiting earlier learning methods." | **"Iterated on — it kept an older idea and changed one part. Attention still learns by backpropagation (1986). What changed is *what* the network looks at: everything at once, instead of one word at a time."** |
| "Evidence status: Source review pending" | **"We haven't finished checking this yet. Nothing on this card is verified history — treat it as a sketch."** |
| "Uncertainty: The bridge does not establish a sole origin" | **"Careful: attention didn't come from one place. Related ideas appeared in several labs around the same time, and historians disagree about who counted most."** |

The last two matter most: honest uncertainty *helps* a curious 18-year-old when it is written as a person talking. As `dt/dd` metadata it reads as a spreadsheet.

---

## F. Competitor comparison

Five live benchmarks, chosen for direct relevance and reach. Verified 2026-08-01.

| | **Knewzly (today)** | **Histography** | **Chronas** | **Our World in Data** | **Wikipedia: History of AI** | **Brilliant** |
|---|---|---|---|---|---|---|
| What it is | Simulated AI-history atlas | 14-bn-year Wikipedia timeline | 5,000-yr interactive world-history map | Sourced data explainers, 14k+ charts | The free incumbent | Interactive STEM lessons |
| First-use clarity | Medium — "Trace one bridge" is good | High — dots invite immediately | Low — dense map | High | High | Very high |
| Visual polish | Desktop OK / mobile poor | **Very high** — award-winning | Medium | High, restrained | Low | **Very high** |
| Mobile | **Poor** | Weak (desktop-first) | Weak | Strong | Strong | **Best-in-class** |
| Desktop | Medium | High | High | High | Medium | High |
| Learning flow | Predict→inspect→explain (good idea, empty) | Browse only | Browse only | Read + explore | Linear read | **Scaffolded mastery** |
| Historical depth | **8 events, 0 names** | Very high (Wikipedia-derived) | Very high | N/A | **Very high** | N/A |
| Explanation quality | Low | Low (links out) | Low | **Very high** | High but dense | **Very high** |
| Source transparency | **0% — all pending** | Wikipedia attribution | CC BY-SA, per-entity | **Best-in-class** — per-chart source + downloadable data | Inline footnotes | Low |
| Exploration | Low (single chain) | High | High | High | High | Low |
| AI assistance | **None** | None | None | None | None | Some |
| Trust | Honest but unproven | Medium | Medium | **Very high** | High | Medium |
| Accessibility | Partial | Weak | Weak | Strong | **Strong** | Strong |
| Open source | **None** | No | **MIT code + CC BY-SA data** | **Open data & code** | CC BY-SA | No |

**Lessons to adopt.**

1. **Our World in Data → source model.** Every chart carries its sources *on the chart* and offers the underlying data as a download. This is the single most transferable pattern: it makes trust an artifact rather than a promise. Knewzly's provenance panel has the right *fields*; OWID proves the right *placement* (attached to the claim) and the right *proof* (downloadable). Adopt: per-event citation with author/publisher/date/URL, plus "Download this event as JSON" and per-page "Cite this".
2. **Chronas → open-source contribution model.** MIT for code, CC BY-SA 4.0 for data, data separated from application, community edits. Knewzly's content is currently inline in a single HTML file, which makes contribution impossible. Adopt the split before writing more content.
3. **ChronoZoom → the cautionary tale.** An open-source, well-funded, SXSW-award-winning Big History timeline that is now **retired and unsupported**. The lesson is structural: a timeline product whose content cannot be updated by anyone but its authors dies when the authors stop. Design the contribution workflow *before* the content.
4. **Histography → visual conviction.** Its whole identity is one confident visual idea, executed. Knewzly currently has five generic lanes, eight cards and three disconnected arcs. Pick one visual idea and commit.
5. **Brilliant → mobile learning design.** One idea per screen, immediate interaction, progress that persists. It never shows a legend for something not on screen. Knewzly's mobile problem is entirely solved territory here.
6. **Wikipedia → the bar you must clear.** It is free, covers precursors through 2026, has both AI winters, expert systems, and hundreds of footnotes. **A learner today is better served by Wikipedia than by Knewzly**, and will be until Knewzly's differentiators — regional comparison, typed relationships, guided journey, Archie — actually work.

**Where Knewzly can be genuinely different.** Nobody in this set does *typed, evidence-graded relationships across regions* with an explicit "this is influence vs. this is coincidence" vocabulary. That is a real gap and a defensible product. It is also precisely the thing the current arcs fail to render.

**Sources:** [Histography](https://histography.io/) · [Chronas](https://chronas.org/) · [chronas-api (MIT + CC BY-SA)](https://github.com/Chronasorg/chronas-api) · [Our World in Data — About](https://ourworldindata.org/about) · [ChronoZoom — Microsoft Research](https://www.microsoft.com/en-us/research/project/chronozoom/) · [ChronoZoom (Wikipedia)](https://en.wikipedia.org/wiki/ChronoZoom) · [History of artificial intelligence (Wikipedia)](https://en.wikipedia.org/wiki/History_of_artificial_intelligence) · [Brilliant](https://brilliant.org/)

---

## G. Archie assessment

**What Archie currently does: nothing.** No entry point, no surface, no code path, no string. Confirmed across the full 39-item tab order and full page text at every viewport. `product-design-review.md` deliberately deferred Archie out of F01, and the design-spike remediation removed it from the header. **That was a reasonable sequencing call and I am not faulting it** — but it means the product's named differentiator is currently unevaluated and unbuilt, and the score reflects the product, not the decision.

**What the prototype reveals about the Archie-shaped hole.** The "Explain the bridge" textarea (C-12) is the exact place Archie belongs. Today it grades free-text historical reasoning with an 8-keyword regex and tells confident wrong answers they are "strong". That is a feature that *needs* a model and currently fakes one — the worst configuration.

**Minimum trustworthy public-alpha Archie.** Deliberately small; each item exists to prevent a specific failure:

1. **Grounded-only answering.** Archie may only answer from the event/relationship/source records in the repo. No open-web recall. Prevents hallucinated history — the one failure that would destroy Knewzly's premise.
2. **Every claim carries the event or source card it came from,** rendered as a link back to the timeline.
3. **A hard refusal path:** "That isn't in Knewzly's sources yet." Modelled on the prototype's existing honesty about pending sources — keep that voice.
4. **Three explanation levels** — *Explain simply* / *Explain normally* / *Show the disagreement* — replacing the untyped textarea. The third level is the differentiator: it must present at least two readings when historians disagree.
5. **Fact vs. interpretation vs. uncertainty labelling**, reusing the existing relationship-type vocabulary so the UI stays consistent.
6. **Persistent AI disclosure** on every response, plus "Archie can be wrong — check the sources."
7. **Free-text explanation feedback done honestly** — Archie evaluates the learner's answer against the event's actual before/change/after content, and says what is missing. This replaces C-12.
8. **Safety floor:** no PII collection, no chat persistence without consent, prompt-injection hardening on any ingested source text (source excerpts are untrusted input and must never be treated as instructions), per-session rate limits, and a visible cost/usage boundary.
9. **Provider abstraction** behind one interface with a documented no-key fallback, so the open-source project is usable without an API key and is not locked to one vendor.

**Stronger future Archie:** Socratic mode that asks before it tells; misconception challenge ("most people think backprop was invented in 1986 — want to see why that's contested?"); two-region comparison generated from the graph; counterfactual prompts; conversation history tied to saved journeys; and contributor-facing use — drafting source records for human editorial review rather than publishing directly.

---

## H. Current events and source quality

**Audit of the two Today stories.** Neither is specific, current, sourced, or attributed. "Why 'context' keeps returning" carries `datetime="2026-08-01"` with no publisher, author, or URL. "Who gets to shape deployment?" has a `<time>` element with **no `datetime` attribute at all** and reads "JUL 29 · SOURCE PENDING". The topic filters above them are dead controls (C-8). The freshness box honestly states "No live feed, citation, or freshness claim is connected."

**Assessment of "source review pending".** Treated as the brief instructs — as a placeholder, not as evidence quality. As a *display contract* it is well designed: nine fields including counter-reading and last-reviewed is a more rigorous schema than most journalism ships. As *evidence* it is zero. The risk is that repeating it 72 times (9 fields × 8 events) makes rigour feel performed rather than practised. **One fully worked, genuinely cited event would demonstrate more than the current 72 placeholders.**

**Recommended sourcing and editorial workflow for an open-source project.**

- **Source selection tiers.** T1 primary (papers, archives, patents, legislation, oral histories); T2 scholarly secondary (peer-reviewed history of computing); T3 quality journalism; T4 commentary — usable only as *labelled* interpretation, never as fact. Publish the rubric in the repo.
- **Source metadata record:** id, title, author(s), publisher, publication date, access date, URL + archive URL, language, tier, region, licence, rights note. Sources live in their own file, referenced by id — never inline in an event.
- **Claim extraction.** One claim = one source id + one quoted excerpt + a locator (page/section/timestamp). A claim with no locator cannot be published. Relationships cite claims, not vibes.
- **Editorial review.** Two-reviewer rule for any relationship stronger than `conceptual lens`; one reviewer for events. Reviewer identity and date recorded in the record. Anything unreviewed renders in a visibly distinct "draft" state.
- **Regional balance as a gate, not a goal.** A CI check that fails the build if any region exceeds a share ceiling of events, or if a region has zero T1 sources. Make Americentrism a build failure.
- **Correction history.** Append-only `corrections` array per event; a public "Corrections" page; corrections are content, and showing them builds more trust than never erring.
- **Update cadence.** History: quarterly review sweep, `lastReviewed` surfaced in the UI and stale after 12 months. Current stories: weekly curation, maximum 5 live, each mapped to ≥1 historical event, auto-expiring at 90 days.
- **Contested claims.** First-class: `contested: true` plus ≥2 cited readings. Contested claims render as *two* statements, never as one hedge.
- **Community contribution.** Issue templates for "propose an event", "propose a source", "report an error", "challenge a relationship". A `CONTENT_GUIDE.md`. PRs touching content require a source id — enforced by CI.
- **Citation display.** Inline on the claim (OWID pattern), plus per-event "Cite this" and per-event JSON export.

---

## I. Feature gap analysis

### Launch blockers (no credible public alpha without these)

| Gap | Learner / trust problem it solves |
|---|---|
| Date-accurate plotting (C-1) | The timeline currently teaches false chronology |
| Geometrically correct arcs for **all** relationships (C-2, C-3) | The connection graph is the product |
| Real content: ≥24 events with named people, institutions, dates | There is currently no history in the history product |
| ≥1 real cited source per event | "Pending" ×72 is not a trust model |
| Purpose-built mobile experience (C-5, C-6) | Most learners will arrive on a phone |
| Remove or implement dead controls (C-8) | False affordances undermine everything else |
| Fix contrast + heading order + accessible names (C-9) | Excludes users; and current claims overstate conformance |
| Search | 24+ events without search is unusable |
| Glossary / term-on-first-use definitions | "Institutionalized", "conceptual lens" are never defined |
| Repo, licence (code + content separately), README, data files | It cannot be an open-source project as a single HTML file |

### High-value next

Beginner mode (plain-language toggle) · minimum Archie (§G) · region comparison view · source explorer · clickable related-events graph traversal · event bookmarking · "why this matters" per event · current-story→history links with real sources · open-data export · user error reports · contributor workflow · privacy-respecting analytics.

### Nice to have

Saved journeys · learner progress · spaced review · Archie conversation history · alternate views (map, network, list) · counterfactual/contested views · shareable evidence permalinks · language support · offline/low-bandwidth · accessibility preference panel.

### Adds complexity without enough value *yet*

Accounts and auth · scored quizzes · social/comments · full personalisation · a broad news feed (explicitly out of scope in PLAN.md — keep it there) · 3D/globe visualisation · real-time collaboration.

---

## J. Open-source public-alpha readiness

| Dimension | State | Blocker? |
|---|---|:--:|
| Installation / setup | None. Open an HTML file | Yes |
| Documentation | No README, no docs | Yes |
| Project structure | One 75 KB HTML file; content, style, logic, data all inline | Yes |
| Licence | **Absent** — no code licence, no content licence | Yes |
| Contribution guidance | None | Yes |
| Issue templates | None | Yes |
| Source-data format | None — data is JS object literals in a `<script>` | Yes |
| Content / schema model | Implicit only; no schema, no validation | Yes |
| Provenance model | Well-designed *shape*, zero instances | Yes |
| Test coverage | Zero automated tests | Yes |
| Browser support | Chromium only (this review + priors) | Yes |
| Accessibility testing | Manual, partial, no CI, no AT verification | Yes |
| AI provider abstraction | N/A — no AI | Yes (before Archie) |
| Secrets / privacy | No secrets, no network, no storage — **currently clean** | No |
| Cost / rate-limit risk | None today; unbounded once Archie lands | Yes (before Archie) |
| Moderation / abuse | None; needed once contributions open | Yes |
| Data update workflow | None | Yes |
| Deployment instructions | None | Yes |
| **Can it evolve without a rewrite?** | **No.** Hardcoded coordinates, inline data, and per-event singleton relationships mean the next 16 events require a rewrite of the rendering layer | **Yes** |

**The structural point:** the prototype's content model is the thing preventing it from becoming a product. Every finding in §C-1 through §C-3 has the same root cause — presentation values (`left:40%`, `d="M90 328…"`) are authored by hand instead of derived from data. Extract the data model first; most of the P0 backlog collapses into it.

---

## K. Codex task backlog

Ordered in the sequence Codex should execute. **Every task below is proposed work on the planning prototype and/or future implementation. None of it is authorised by this review — F01 requirements, design, tasks, and `.status` must be created and approved through the normal SDD gates first.**

---

### P0 — Correctness and foundation

**KNW-001 · Extract the content model into structured data files** — P0 · Large
*Problem:* Events, relationships, provenance, and journeys are JS object literals inline in `prototype.html`, with presentation coordinates hand-authored. No contributor can add an event; no test can validate one.
*Outcome:* A documented, validated content schema in versioned data files, consumed by the renderer. Adding an event is a data change, never a CSS change.
*Affected:* new `data/events.json`, `data/relationships.json`, `data/sources.json`, `data/schema/*.json`; `prototype.html` script block.
*Guidance:* Event: `id, title, plainTitle, start{year,precision}, end?, region, lane, kind, summary, before, change, after, people[], institutions[], relatedIds[], sourceIds[], topics[], lastReviewed`. Relationship: `id, fromId, toId, type, confidence, contested, uncertainty, sourceIds[], explanation`. Source: the full record from §H. **Remove `left:` and `d=` from authored content entirely** — both become derived. Add JSON Schema + a validation script.
*Acceptance:* All 8 existing events render identically from data; schema validation fails on a missing required field; no positional value appears in any data file.
*Verification:* Validation script in CI; snapshot test that rendered output matches pre-refactor at 1440 and 390.
*Depends on:* none. **Do this first — KNW-002/003/004 all depend on it.**

**KNW-002 · Plot events from real dates on a declared time scale** — P0 · Medium
*Problem:* All 8 events are mis-plotted, up to 133 years; "Agency & reason" (1800s) renders right of "Codebreaking" (1940s). The timeline teaches false chronology. (§C-1)
*Outcome:* Position is a pure function of date. The axis and the events use one scale.
*Affected:* renderer, `.years`, `.timeline-canvas`.
*Guidance:* One `timeScale(year) → x` used by both axis ticks and event placement. If a compressed early period is kept, make it explicit — label the compressed segment and mark the break visually. Handle imprecise dates (`1800s`, `2020s`) as a span with a visible extent rather than a false point. Delete every `style="left:N%"`.
*Acceptance:* For every event, |plotted year − stated year| ≤ 1 year (or falls within its stated span). Rendered order matches chronological order. Axis ticks derive from the same function.
*Verification:* Automated test that reads each event's rendered centre, inverts the scale, and asserts against its data date — the exact measurement in §C-1, run in CI at 1440, 1024 and 640.
*Depends on:* KNW-001.

**KNW-003 · Generate relationship arcs from live endpoint geometry, for every relationship** — P0 · Large
*Problem:* Three hand-typed arcs miss their endpoints by 120–387 px; four relationships have no arc, so selecting them dims everything and highlights nothing. (§C-2, §C-3)
*Outcome:* Every relationship in the data renders an arc that visibly terminates on both event cards, at every width and after every resize/filter/scroll.
*Affected:* `.arc-layer`, renderer.
*Guidance:* After layout, read both endpoints' rendered centres and emit a curve between them. Recompute on resize, filter change, and density change (`ResizeObserver`). Anchor each label to its own path midpoint. Add a transparent `stroke-width: 24` hit path under each visible stroke and raise the arc layer above `.lane-track` so pointer hits land (fixes §C-4). Encode type by stroke pattern **and** label, never colour alone.
*Acceptance:* For every relationship: arc start within 8 px of the source card edge and end within 8 px of the target card edge, at 1440/1024/640 and after a resize. Arc count equals relationship count. Pointer click succeeds at ≥5 sampled points along every arc. No relationship selection produces an all-dimmed state.
*Verification:* Automated endpoint-distance assertion (the §C-2 measurement) plus a real pointer-click loop over all arcs. Screenshots at 1440 and 640.
*Depends on:* KNW-001, KNW-002.

**KNW-004 · Author 24–30 real, sourced anchor events with named people and institutions** — P0 · Large
*Problem:* Zero named people, zero named institutions, zero verifiable dates, euphemistic titles a beginner cannot search. (§C-10, §D)
*Outcome:* A curated spine matching PLAN.md's ten clusters, where each event names who, where, when, and what changed — with at least one real citation.
*Affected:* `data/events.json`, `data/sources.json`.
*Guidance:* Follow the §D recommendations. Non-negotiables: rename euphemisms to the real thing (*Attention / the Transformer*, *Rosenblatt's perceptron*); **fix Symbolic AI's region — Dartmouth 1956 is North American, not European**; split Codebreaking into Polish Cipher Bureau → Bletchley → Colossus and name the women operators; split backpropagation into the independent-discovery cluster (Linnainmaa 1970, Werbos 1974, Amari, Rumelhart–Hinton–Williams 1986) — this is the highest-leverage genuine-globality fix available; add the missing decades between 1986 and 2017 (LSTM, word2vec, ImageNet, GPUs, seq2seq); add AI winters and expert systems; add real Asian anchors (Fukushima 1980, Fifth Generation, Amari) and real Global South anchors (annotation labour, Masakhane, regional AI policy).
*Acceptance:* ≥24 events; every event names ≥1 person or institution; every event has ≥1 T1/T2 source with author, publisher, date, URL and a quoted excerpt with locator; no region exceeds 40% of events; ≥3 events each for Asia, Africa/Global South, and Europe; ≥1 event each for Latin America and the Middle East; every date verifiable against its cited source.
*Verification:* Schema + balance validation in CI; editorial review checklist; spot-check 5 citations against their sources.
*Depends on:* KNW-001. Runs in parallel with 002/003.

**KNW-005 · Add region and Latin America / Middle East lanes; make lane labels persistent** — P0 · Medium
*Problem:* Two named regions have no lane; lane labels are `position: static` and scroll out of view, so region context is lost precisely when comparing regions; at 640 px 41% of the canvas and 4 of 8 events are hidden with no affordance. (§C-7)
*Outcome:* Lane identity is always visible; all regions in the data have a lane; the learner can tell there is more timeline to the right.
*Guidance:* `position: sticky; left: 0` on `.lane-label` with an opaque background and a z-index above the track. Add a scroll-position indicator and edge fades. Consider collapsing empty lanes into a single "no anchors in this period" affordance rather than rendering blank rows.
*Acceptance:* After `scrollLeft = 400` at 1440 and 640, all five-plus lane labels remain visible and legible. Lanes exist for every distinct `region` in the data. A visible affordance indicates off-screen content.
*Verification:* Scripted horizontal-scroll test asserting label visibility; screenshots at 1440/1024/640.
*Depends on:* KNW-001.

**KNW-006 · Remove or implement dead controls; eliminate false ARIA state** — P0 · Small
*Problem:* Today's "All/Models/Policy" buttons have no event listener and permanently report `aria-pressed="true"`; "Search atlas" produces no visible feedback. (§C-8)
*Outcome:* Every rendered control does what it appears to do, or is not rendered.
*Guidance:* Either wire the Today topic filter to real filtering, or remove the buttons. Either build search (KNW-011) or remove the button. Nothing may carry `aria-pressed` it does not honour. Any deliberately-future affordance must be visibly and programmatically disabled with a stated reason.
*Acceptance:* Every control with `aria-pressed` changes state on activation and produces a visible result. No control's only feedback is a live region.
*Verification:* Automated sweep: activate every interactive control, assert a visible DOM change or a `disabled` state.
*Depends on:* none.

**KNW-007 · Fix contrast, heading order, accessible names, and dim states** — P0 · Medium
*Problem:* AAA fails on 1.4.6 (orientation strip 6.93:1); 1.4.11 fails on arcs (1.54:1 / 1.14:1) and the simulated pill border (2.36:1); dimmed events fail even AA (1.72:1 / 2.12:1) while remaining focusable; heading order runs h2→h3→h1; event accessible names concatenate without separators and omit region; no skip link. (§C-9)
*Outcome:* AA is met everywhere including transient states; AAA is met on all text; conformance claims are supported by evidence.
*Guidance:* Darken the orientation strip text or lighten its background to ≥7:1. Raise resting arc opacity so the stroke clears 3:1, and express de-emphasis by width/saturation rather than by opacity alone. Give the sim pill a ≥3:1 border. **Replace opacity-based dimming with a de-emphasis that keeps text ≥4.5:1** (reduce weight/saturation, keep foreground contrast) — or make dimmed events `inert` so unreadable content is not focusable. Restructure headings so `h1` precedes all `h2`. Build event accessible names explicitly: `"1958, Learning machines, North America, neural branch"`. Add a skip link. Raise 9 px labels to ≥11 px.
*Acceptance:* All text ≥7:1 in default state and ≥4.5:1 in every transient state; all meaningful non-text ≥3:1; heading order sequential; every event's accessible name contains date, title and region separated by commas; skip link present and functional.
*Verification:* Automated contrast sweep across default, selected, dimmed, and quiet-density states; axe-core scan; manual NVDA + VoiceOver pass. **Do not claim AAA until a full applicable-criterion audit with AT verification is complete.**
*Depends on:* none.

---

### P1 — Beginner experience and mobile

**KNW-008 · Rewrite all learner-facing copy for an 18-year-old beginner** — P1 · Medium
*Problem:* Copy explains the prototype rather than the history; jargon-dense (*excerpt* ×11, *iterated on* ×8, *conceptual lens* ×6); vague phrases like "made the problem visible"; euphemistic titles. (§E)
*Outcome:* Every event answers what happened / who / why it mattered / what changed / what followed in concrete language, with uncertainty phrased as a person speaking.
*Guidance:* Use the §E rewrite table as the voice reference. Ban self-referential words (*anchor*, *demo*, *prototype*, *this card*) from learner-facing strings. Every relationship type gets a plain-language definition shown inline on first use. Every abstraction gets one concrete example. Target grade 9–10 reading level.
*Acceptance:* No learner-facing string references the software; every relationship type defined at point of use; automated reading-level check ≤ grade 10 on summaries; 5 unfamiliar readers can state what each of 3 sampled events was and why it mattered.
*Verification:* Reading-level script in CI; unmoderated comprehension test with 5 participants aged 17–19.
*Depends on:* KNW-004.

**KNW-009 · Rebuild the mobile experience as a designed surface** — P1 · Large
*Problem:* 947 px of chrome before the first event; a line-style legend for arcs that do not render on mobile; keyboard instructions on a touch device; a "shared time axis" header over a view with no axis. (§C-5)
*Outcome:* A mobile learner reaches real history within one screen, through an interface designed for a phone.
*Guidance:* Cut, do not stack. Remove the relationship-key legend and keyboard help below 600 px entirely. Lead with the h1 and one entry action. Move topic lenses into a compact sticky filter bar. Replace the "shared time axis" header with mobile-true wording. Give mobile a real time affordance — a horizontal period scrubber (1940s · 1950s · 1980s · 2010s · Now) above date-grouped events — rather than five stacked region lists. Consider period-first grouping on mobile and region-first on desktop; they are different questions and may deserve different shapes.
*Acceptance:* At 390 px and 320 px, the first historical event is above 500 px. No legend for a non-rendered visualisation. No keyboard-only instructions below 600 px. No horizontal overflow. All targets ≥44 px.
*Verification:* Scripted first-event-offset measurement at 390/360/320; screenshots; 3-participant phone usability pass.
*Depends on:* KNW-001, KNW-008.

**KNW-010 · Rework the event drawer into a two-layer learning flow** — P1 · Medium
*Problem:* The drawer leads with four "pending" metadata fields before any history; 2200 px of content in a 756 px mobile window (2.9 screens); the selected event is not visible behind the mobile drawer. (§C-6)
*Outcome:* Layer 1 teaches; layer 2 is inspected deliberately.
*Guidance:* **Layer 1 (default):** title, date, region, a 2–3 sentence plain-language explanation, who was involved, and *what changed* — nothing else. **Layer 2 (behind an explicit "Inspect the bridge" / "Check the sources" action):** relationship type and evidence, full provenance, counter-readings. Keep the simulated banner but shrink it once real sources exist. On mobile, reduce drawer height so the selected card stays visible, or scroll it to the visible strip before opening. Preserve keyboard focus and focus return exactly as today — that behaviour is correct and must not regress.
*Acceptance:* Layer 1 fits one 390×900 screen without scrolling. Layer 2 requires a deliberate action. Selected event visible behind/above the drawer at 390 and 320. Focus enters the drawer title on open and returns to the selected event on close. Escape still closes.
*Verification:* Measure layer-1 height at 390 and 320; keyboard-only open/close/focus-return test; screenshots both layers, both widths.
*Depends on:* KNW-008.

**KNW-011 · Add search across events, people, institutions, and regions** — P1 · Medium
*Problem:* The button exists and does nothing; 24+ events are unnavigable without it. (§C-8)
*Outcome:* Typing a name, place, or year finds and selects the matching event.
*Guidance:* Client-side index over title, plainTitle, summary, people, institutions, region, year. Keyboard-first (`/` to focus, arrows, Enter, Escape); combobox pattern with `aria-activedescendant`; announce result counts. Selecting a result selects the event and scrolls it into view.
*Acceptance:* Searching a person's name finds their event; searching a year finds events in that span; fully keyboard operable; zero-results state explains what is searchable.
*Depends on:* KNW-001, KNW-004, KNW-006.

**KNW-012 · Make the graph traversable from the drawer** — P1 · Medium
*Problem:* Each event exposes exactly one relationship though several participate in four; "Related events" is dead plain text. (§C-11)
*Outcome:* The learner can walk the graph without returning to the canvas.
*Guidance:* List *all* relationships where the event is source or target, grouped by direction ("led to…" / "came from…"), each a button that selects that relationship. Make related events links. Reconsider whole-canvas dimming at low event counts (§C-13) — keep the endpoints prominent but keep the map readable.
*Acceptance:* Symbolic AI's drawer lists all four of its relationships; every related event is activatable; selection is reversible; selection never renders more than half the atlas illegible.
*Depends on:* KNW-001, KNW-003.

**KNW-013 · Ship one fully sourced exemplar event end-to-end** — P1 · Small
*Problem:* 72 "pending" provenance fields demonstrate a schema but no capability. (§H)
*Outcome:* One event proves the whole provenance chain works, before it is scaled to 24.
*Guidance:* Pick a well-documented event (Dartmouth 1956 or Rosenblatt's perceptron). Populate every field with real values: author, publisher, publication date, access date, archive URL, tier, quoted excerpt with page/section locator, editorial interpretation, a genuine counter-reading, reviewer, review date. Render it in the UI. Use it as the template for KNW-004.
*Acceptance:* Zero "pending" strings on that event; the citation resolves to a real, live, archived source; the excerpt genuinely supports the stated claim.
*Depends on:* KNW-001.

**KNW-014 · Open-source scaffolding: repo, licences, README, contribution workflow** — P1 · Medium
*Problem:* No repo, licence, README, issue templates, or contribution path. It cannot function as an open-source project. (§J)
*Outcome:* A credible public repository someone could contribute an event to.
*Guidance:* Follow the Chronas split: permissive licence for code, CC BY-SA (or CC BY) for content, stated separately in `LICENSE` and `LICENSE-CONTENT`. README with what/why/screenshot/quickstart/contributing/status ("public alpha — content in progress"). `CONTRIBUTING.md` and `CONTENT_GUIDE.md` (the §H sourcing rubric). Issue templates: propose event / propose source / report error / challenge relationship. `CODE_OF_CONDUCT.md`. CI running schema validation, the plotting and arc-geometry assertions, axe-core, and the regional-balance gate.
*Acceptance:* A new contributor can clone, run locally from the README alone, and open a valid event PR; CI blocks a content PR with no source id; CI blocks a regional-balance violation.
*Depends on:* KNW-001.

---

### P2 — Differentiators

**KNW-015 · Minimum trustworthy Archie** — P2 · Large
*Problem:* The product's named differentiator does not exist; "Explain the bridge" currently fakes evaluation with an 8-keyword regex and praises confident wrong answers. (§C-12, §G)
*Outcome:* A grounded, citing, honestly-uncertain historian assistant, and honest feedback on learner explanations.
*Guidance:* Implement §G items 1–9. Retrieval strictly over the repo's event/relationship/source records. Every response cites the records it used, as links. A real refusal path. Three explanation levels replacing the free textarea. Persistent AI disclosure. Provider abstraction with a documented no-key fallback so the OSS project runs without an API key. **Treat all source excerpts as untrusted data — never as instructions** (prompt-injection surface). No PII, no unconsented persistence, per-session rate limits.
*Acceptance:* Archie cannot produce a historical claim absent from the corpus (adversarial eval set); every claim carries a resolvable citation; out-of-corpus questions are refused with the stated message; AI disclosure present on every response; a documented injection attempt in a source excerpt does not alter behaviour; the app runs with no API key configured.
*Verification:* Grounding eval set with known-absent facts; injection test suite; rate-limit and cost-ceiling test.
*Depends on:* KNW-001, KNW-004, KNW-013, KNW-014.

**KNW-016 · Beginner mode and glossary** — P2 · Medium — Plain-language toggle plus term definitions on first use for every relationship type and technical term. *Depends on:* KNW-008.

**KNW-017 · Region comparison view** — P2 · Medium — Pick two regions, see their events on a shared axis with cross-region relationships highlighted; delivers PLAN.md's F04 promise and the "compare regional paths" claim. *Depends on:* KNW-002, KNW-004, KNW-005.

**KNW-018 · Source explorer and open-data export** — P2 · Medium — Browse all sources by tier/region/date; per-event and full-corpus JSON download; "Cite this" per event. Adopts the OWID pattern that makes trust an artifact. *Depends on:* KNW-004, KNW-013.

**KNW-019 · Real Today panel with cited current stories** — P2 · Medium — Replace the two placeholders with ≤5 real, cited, dated stories, each mapped to ≥1 historical event, auto-expiring at 90 days; working topic filters; visible freshness. *Depends on:* KNW-004, KNW-006, KNW-014.

**KNW-020 · Contested-history and counter-reading views** — P2 · Medium — Render `contested: true` claims as two cited readings side by side rather than one hedge; the clearest expression of "without flattening it". *Depends on:* KNW-004.

---

### P3 — Retention and reach

**KNW-021** · Bookmarks and saved journeys — P3 · Medium · local-first, no account.
**KNW-022** · Spaced review built on the existing predict→explain loop — P3 · Medium.
**KNW-023** · Shareable evidence permalinks (deep-link to event + relationship + layer) — P3 · Small.
**KNW-024** · Accessibility preference panel (motion, density, text size, dyslexia-friendly face) — P3 · Small.
**KNW-025** · Offline / low-bandwidth mode — P3 · Medium — meaningful for Global South reach, which the product's premise implies.
**KNW-026** · Language support beyond English — P3 · Large — a global atlas readable only in English is a limit worth naming.
**KNW-027** · Privacy-respecting analytics (no cookies, no third-party, aggregate only, documented) — P3 · Small.

---

## L. Final recommendation

### The three most important changes

1. **Make the picture true.** Plot events from dates; draw arcs between real endpoints; render every relationship. (KNW-001 → 002 → 003.) Everything else in the product is decoration on top of a visualisation that currently encodes nothing. Nothing else should ship first.
2. **Put actual history in it.** 24–30 events with named people, named institutions, real dates, and at least one real citation each — with the specific corrections in §D, especially Symbolic AI's region, the codebreaking split, and the backpropagation independent-discovery cluster. (KNW-004, KNW-013.) Today a learner is better served by Wikipedia.
3. **Design mobile, don't collapse desktop.** Cut the arc legend, cut the keyboard help, lead with history, and split the drawer into teach-then-inspect. (KNW-009, KNW-010.) This is what makes it feel human-made.

### The three biggest risks

1. **Trust collapse from a plausible-but-wrong picture.** Knewzly's differentiator is honesty about evidence. A product that hedges every sentence in prose while drawing confidently false arcs and mis-dated events fails in the most damaging possible way — it looks *more* trustworthy than it is. This risk is live right now.
2. **Decorative globality.** Five lanes with Asia = 1 and "Africa & global" = 1, no Latin America, no Middle East, no named non-Western person, and a single-chain graph that reproduces the linear Western narrative the product exists to refute. Reviewers and learners from those regions will notice, and the criticism will be fair. Regional balance must be a CI gate, not an intention.
3. **The single-file architecture ossifying.** Hardcoded coordinates, inline data, and one-relationship-per-event mean the 9th event costs more than the 8th. ChronoZoom is the cautionary precedent: a well-funded, award-winning open-source timeline, now retired, whose content only its authors could update. Extract the data model before writing more content.

### Recommended sequence for Codex

```
KNW-001 (data model)
   ├─→ KNW-002 (date plotting) ─→ KNW-003 (arc geometry) ─→ KNW-012
   ├─→ KNW-004 (real content) ──┬─→ KNW-008 (copy) ─→ KNW-009 (mobile) ─→ KNW-010 (drawer)
   │                            └─→ KNW-013 (exemplar source) ─→ KNW-018
   ├─→ KNW-005 (lanes)
   └─→ KNW-014 (OSS scaffolding) ─→ KNW-015 (Archie)
KNW-006, KNW-007 (dead controls, a11y) — independent, start immediately
KNW-011 (search) after 004 + 006
P2/P3 after the P0/P1 band is green
```

Run KNW-006 and KNW-007 in parallel from day one — they have no dependencies and remove the most visible credibility damage per hour spent.

### What must be true before calling Knewzly a credible public-alpha AAA product

- [ ] Every event plots within 1 year (or its stated span) of its own date, asserted in CI.
- [ ] Every relationship renders an arc terminating on both endpoint cards, at every tested width, asserted in CI.
- [ ] ≥24 events, each naming ≥1 person or institution, each with ≥1 real citation carrying author, publisher, date, URL and a located excerpt.
- [ ] Zero "pending" strings visible to learners.
- [ ] No region >40% of events; ≥1 event each for Latin America and the Middle East; ≥3 each for Asia and Africa/Global South — enforced by CI.
- [ ] Mobile: first historical event above 500 px at 390 and 320; no legend for a non-rendered visualisation.
- [ ] Every rendered control does something visible; no false `aria-pressed`.
- [ ] All text ≥7:1 in default state and ≥4.5:1 in every transient state; all meaningful non-text ≥3:1; sequential headings; skip link.
- [ ] A completed WCAG 2.2 audit across all applicable criteria with real AT verification (NVDA, VoiceOver, TalkBack), on ≥2 browser engines — **and conformance claimed only at the level actually demonstrated.**
- [ ] Public repo with code and content licences, README, CONTRIBUTING, CONTENT_GUIDE, issue templates, and CI running schema, plotting, arc-geometry, contrast and balance checks.
- [ ] A new contributor can add an event from the README alone.
- [ ] Either Archie meets the §G minimum, or the regex-graded "Explain the bridge" is removed rather than shipped pretending to evaluate.
- [ ] Five 17–19-year-olds who have never used it can each explain one event and one relationship, unprompted, after five minutes.

That last line is the real bar. Everything above it is how you get there.

---

## Appendix — Evidence index

**Screenshots** (`artifacts/planning/f01-global-history-atlas/screenshots/`, captured 2026-08-01, Chromium, DPR 2):

| File | Shows |
|---|---|
| `review-2026-08-01-desktop-1440-initial.png` | Mis-plotted events; arcs and labels floating in empty space; "Deployment choices" clipped at the right edge |
| `review-2026-08-01-desktop-1440-drawer-open.png` | Desktop drawer over the atlas |
| `review-2026-08-01-desktop-1440-arc-selected.png` | **Key evidence**: correct endpoints highlighted, bold arc connecting neither; six events dimmed to 1.72:1 |
| `review-2026-08-01-desktop-640-midband.png` | 41% of canvas hidden, 4 of 8 events clipped, unpinned lane labels |
| `review-2026-08-01-mobile-390-initial.png` | **Key evidence**: 947 px of chrome; arc legend with no arcs; keyboard help on touch |
| `review-2026-08-01-mobile-390-scrolled-to-events.png` | Stacked mobile lanes |
| `review-2026-08-01-mobile-390-drawer-open.png` | **Key evidence**: metadata before history; selected event not visible behind drawer |
| `review-2026-08-01-mobile-320-initial.png` | 320 px reflow — no overflow (pass) |

**Measurements performed:** axis-inversion plotting audit (8 events); arc endpoint-distance audit (3 arcs × 2 endpoints); arc pointer hit-test (3 arcs × 3 sample points); relationship-to-arc coverage (7 relationships); per-event drawer relationship correctness (8 events); tab-order enumeration (39 controls); touch-target sweep (all controls, 6 widths); contrast computation (16 pairs incl. transient states); text-spacing stress at 320 px; overflow check at 1440/720/640/390/360/320; heading-order extraction; dead-control activation sweep; mobile scroll-depth and drawer-height measurement; console-error capture (zero found).

**Reviewer note on scope.** This review did not verify screen-reader announcements, voice control, real browser zoom, non-Chromium engines, or reading-level criteria against assistive technology. **No WCAG conformance level is claimed as met by this review**; two failures are affirmatively demonstrated. All historical content in the prototype is simulated and no approved source record exists for any claim in it.
