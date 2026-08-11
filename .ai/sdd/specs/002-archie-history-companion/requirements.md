# Feature: Archie — History Desk Companion

> Status: Approved
> Source: `.ai/sdd/PLAN.md` (F08); `.ai/sdd/design/archie-companion-concept.html`; `artifacts/planning/f01-global-history-atlas/product-design-review.md`
> Approved: 2026-08-09 (Henry, direct chat approval)

## Overview

Archie is Knewzly's AI learning companion: a persistent, cross-surface presence that answers questions about AI's present and past, connects the two, and shows its work doing it. It exists to close a specific gap the F01 design review flagged and deliberately deferred — "AI guidance can overreach historical evidence" — by giving every Archie answer a visible claim type, source, date, and freshness state, and by treating an unsourced or unlabeled claim as a defect, not a shortcut.

Archie grounds its answers in Knewzly's own curated knowledge graph — the atlas's typed anchors and relationships — first, and reaches for open web search only to extend or verify beyond what the graph already covers. Archie activates through a bring-your-own-key (BYOK) model: a learner supplies their own model API key, and Knewzly neither subsidizes nor proxies model access.

Archie serves the same two personas as the rest of Knewzly:

- **Curious learner:** wants a quick, trustworthy answer to "why does this news story keep mentioning some 1800s economist?" without losing track of what's proven versus argued.
- **Guided learner:** wants Archie to narrate the connections between a news item, an atlas anchor, and the broader technical/philosophical/regional relationships between anchors, in language a 16-year-old can follow.

## Business Context

`artifacts/planning/f01-global-history-atlas/product-design-review.md` explicitly deferred Archie out of F01: "Later for F01 — define it after provenance contracts." `.ai/sdd/design/archie-companion-concept.html` proposed that contract (typed claims, visible uncertainty, sourced/dated/fresh citations, a hard no-fabrication rule), and Henry approved moving Archie into the plan as F08 (`.ai/sdd/PLAN.md`, "Archie Deferral Lifted" decision, 2026-08-09). This document turns that contract into testable requirements.

Success signal: a learner can ask Archie an open-ended AI-history or current-news question and, for every substantive claim in the answer, immediately tell whether it is an established fact, a defensible interpretation, an untested hypothesis, or a structural analogy — and where it came from.

## User Stories

### US-001: Ask about current AI news

**As a** curious learner
**I want to** ask Archie what's happening in AI right now, optionally filtered by topic
**So that** I get a summary I can trust without hunting through multiple sources

**Acceptance Criteria:**
- [ ] Archie accepts an open-ended or topic-filtered news question.
- [ ] The response is summarized, not just a link dump.
- [ ] Every news claim in the response shows a source, a date, and a freshness indicator (e.g., "refreshed 6 min ago" or "stale — last checked [date]").
- [ ] Archie grounds the response in the atlas's knowledge graph first, reaching for web search only to extend or verify beyond it (FR-013).

### US-002: Trace a present event to its historical origin

**As a** guided learner
**I want to** ask Archie why a current story keeps referencing a historical figure, event, or idea
**So that** I understand the connection instead of taking the reference at face value

**Acceptance Criteria:**
- [ ] Archie identifies the relevant historical anchor(s) and states the relationship type (influenced / enabled / reacted against / iterated on / institutionalized / regulated / conceptual lens — per PLAN.md's Relationship Vocabulary).
- [ ] Archie distinguishes a documented historical fact from the present-day analogy built on it.

### US-003: Filter by topic

**As a** learner
**I want to** filter Archie's answers to common topics (matching Today panel categories) or a topic I define myself
**So that** I can focus on what I care about without wading through everything

**Acceptance Criteria:**
- [ ] Common topics match the Today panel's existing category set.
- [ ] A learner can define a custom topic in their own words.
- [ ] Filtering narrows scope; it never removes or locks content that would otherwise be reachable (consistent with F01's D-001: visited/browsed state is never access-gated).

### US-004: See uncertainty and competing interpretations

**As a** guided learner
**I want** Archie to show me when historians or commentators genuinely disagree, instead of picking a side
**So that** I learn to hold a live debate rather than memorize a false consensus

**Acceptance Criteria:**
- [ ] When a claim is contested, Archie presents at least the two most prominent readings rather than asserting one as settled.
- [ ] Archie never resolves a genuinely open disagreement by silently picking one side and omitting the other.

### US-005: Generate a labeled explainer

**As a** guided learner
**I want to** turn an Archie exchange into a standalone explainer I can read later or share
**So that** the sourcing and claim labels aren't lost when I leave the conversation

**Acceptance Criteria:**
- [ ] The generated explainer preserves every claim-type tag, source, and date from the original exchange unchanged.
- [ ] Generation never adds a new claim that wasn't already in the conversation.

### US-006: Get further reading and video recommendations

**As a** curious learner
**I want** Archie to point me to primary sources or a good explainer video
**So that** I can go deeper than a chat answer allows

**Acceptance Criteria:**
- [ ] Recommendations are cross-checked before being named specifically; Archie does not name a specific video or article it cannot verify exists and is on-topic.
- [ ] If Archie cannot verify a specific recommendation, it says so rather than inventing a plausible-sounding one.

### US-007: Trust that Archie won't make things up

**As any learner**
**I want** a visible, standing guarantee that Archie won't invent citations, dates, people, relationships, or confidence levels
**So that** I can rely on Archie the way I'd rely on a careful teacher, not a search-autocomplete

**Acceptance Criteria:**
- [ ] The no-fabrication rule is visible in the product (not buried in a settings/about page), consistent with the concept mockup's "posted like a corrections policy" treatment.
- [ ] When Archie lacks a verifiable answer, it says so explicitly instead of filling the gap with a plausible-sounding but unverified claim.

### US-008: Activate Archie with my own API key

**As a** learner who wants to use Archie
**I want to** provide my own model API key to turn Archie on
**So that** I control which model and provider I use and what it costs, and Knewzly isn't paying for or proxying my usage

**Acceptance Criteria:**
- [ ] Before a key is provided, Archie is visibly inactive with clear instructions for adding one — it does not silently fail or pretend to answer.
- [ ] Adding a key gives clear success or failure feedback.
- [ ] The key can be removed at any time, which immediately deactivates Archie.
- [ ] The key is never sent to or stored by a Knewzly-operated backend.

## Functional Requirements

### FR-001: Claim typing on every substantive answer — Must Have

WHEN Archie produces a substantive answer
THE SYSTEM SHALL label every claim within it as one of: Fact, Interpretation, Hypothesis, or Conceptual analogy (per PLAN.md's four-type Source and Provenance Baseline)
SO THAT a learner can tell what kind of statement they're reading without inferring it themselves

### FR-002: Source, date, and freshness on every claim — Must Have

WHEN Archie states a claim drawn from a source
THE SYSTEM SHALL show that source, its date, and — for current-news claims — a freshness or staleness indicator
SO THAT every claim is independently checkable

### FR-003: Decline and flag instead of fabricating — Must Have

WHEN Archie cannot support a claim with a real source, date, person, relationship, or confidence level
THE SYSTEM SHALL withhold that specific claim and state plainly that it could not be verified, rather than inventing one
SO THAT Archie never presents a fabricated detail as if it were sourced

### FR-004: Topic filtering — Must Have

WHEN a learner requests a common or user-defined topic filter
THE SYSTEM SHALL scope Archie's answer to that topic
SO THAT learners can focus without needing to phrase a perfect open-ended question

### FR-005: Trace present events to historical anchors — Must Have

WHEN a learner asks about the historical origin of a current event or claim
THE SYSTEM SHALL identify the relevant atlas anchor(s) and the typed relationship connecting them (per PLAN.md's Relationship Vocabulary)
SO THAT the connection is legible, not just asserted

### FR-006: Explain technical, philosophical, and regional relationships — Should Have

THE SYSTEM SHALL explain, in accessible language, how two or more atlas anchors relate technically, philosophically, or regionally when asked

### FR-007: Surface competing interpretations — Should Have

THE SYSTEM SHALL present genuinely contested claims as multiple labeled interpretations rather than a single resolved answer

### FR-008: Recommend further reading and video — Should Have

THE SYSTEM SHALL recommend further reading or video only after cross-checking that the specific recommendation exists and is on-topic, and SHALL state when it cannot make a specific verified recommendation

### FR-009: Generate a labeled explainer — Could Have

THE SYSTEM SHALL generate a standalone explainer view from an Archie exchange that preserves all claim-type tags, sources, and dates from that exchange unchanged

### FR-010: Global persistent companion — Must Have

THE SYSTEM SHALL make Archie reachable as a persistent companion from both the Atlas (F01) and the Today panel (F03)
SO THAT Archie can trace connections across both surfaces without forcing a learner to leave their current context

### FR-011: Label claims outside Knewzly's curated data — Must Have

WHEN Archie answers from general AI-history knowledge not sourced from Knewzly's curated atlas or Today panel data
THE SYSTEM SHALL visibly distinguish that claim from a Knewzly-sourced claim
SO THAT expanding Archie's knowledge scope beyond the curated dataset (per D-001) does not blur what Knewzly has itself vetted against what Archie is asserting from broader general knowledge

### FR-012: Source, date, and freshness on independently-fetched news — Must Have

WHEN Archie performs an independent live news lookup beyond F03's curated slice (per D-002)
THE SYSTEM SHALL show that item's source, date, and freshness state, and SHALL state plainly when a live fetch fails or returns stale data rather than presenting it as current
SO THAT expanding news coverage beyond F03's reviewed slice does not weaken the freshness/provenance guarantee learners get from F03 today

### FR-013: Knowledge-graph-first retrieval — Must Have

WHEN Archie answers a question
THE SYSTEM SHALL first attempt to ground the answer in the atlas's curated knowledge graph (its typed anchors and relationships) and use web search only to extend or verify beyond what the graph already supports
SO THAT web search supplements Knewzly's vetted history data rather than bypassing it, and every answer favors the source Knewzly has already reviewed when one exists

### FR-014: BYOK activation gate — Must Have

WHEN a learner has not provided a valid model API key
THE SYSTEM SHALL present Archie in a clearly inactive state with instructions for adding a key, and SHALL NOT attempt to answer questions or perform lookups
SO THAT no model inference happens on Knewzly's behalf or at Knewzly's cost without the learner's own key

### FR-015: Key management — Should Have

THE SYSTEM SHALL let a learner add, replace, or remove their API key, and SHALL confirm activation success or failure when a key is added
SO THAT a learner can tell whether Archie is usable and can revoke access at any time

## Non-Functional Requirements

### NFR-001: Usability
- Archie's language must be understandable to a 16-year-old without flattening nuance or omitting uncertainty (P-002).

### NFR-002: Accessibility
- The Archie companion affordance and its answers must be keyboard-reachable and screen-reader compatible, consistent with F01's Responsive Interaction Baseline.

### NFR-003: Trust / Privacy
- Archie does not persist conversation history across sessions or require a Knewzly account in this slice (see Out of Scope).
- Nothing a learner types to Archie is used for purposes beyond answering that question, pending any future accounts/personalization decision.
- Knewzly does not proxy, log, or store the learner's model API key or their questions server-side; model inference happens using the learner's own key (see NFR-005).

### NFR-004: Reliability
- Live lookups (news, source verification, recommendation checking) must have explicit loading, error, and stale states — Archie never silently shows nothing or shows outdated content as current.

### NFR-005: Security — API key handling
- The learner's API key is stored locally to the learner's device/session only, never transmitted to or stored on any Knewzly-operated backend.
- The key is never written to logs, error reports, or the generated explainer (FR-009).
- A learner can remove their key at any time (FR-015), which immediately deactivates Archie (FR-014).

## Out of Scope

- Selecting the LLM, retrieval/embedding implementation, or specific news/search API or provider (design work).
- Accounts or conversation history persisted across sessions (personalization boundary remains an open PLAN.md decision).
- Automated source ingestion pipeline (F06 territory).
- Any node/relationship "unlocking" — Archie surfaces and explains content; it never gates access to atlas or Today panel content (consistent with F01's D-001).
- Voice interface or multi-turn memory beyond the current conversation.
- Defining the exact mechanics of which web search provider Archie uses and how individual sources are vetted (Q-001 — priority order resolved by D-005; provider mechanics deferred to design, mirroring F03's own unresolved "Today update mechanism" decision).
- Which specific model providers are supported for BYOK (e.g., Anthropic, OpenAI, others), key format validation rules, and any usage/cost display (design work).
- Knewzly subsidizing, proxying, or metering model usage on the learner's behalf — the BYOK model means inference cost and provider choice are the learner's own.
- Designing the BYOK setup/onboarding flow, including any accessibility mitigation for learners without an API key — flagged as a real friction point against P-002 (Accessible Without Flattening) that design must address, not resolved here.

## Decisions

### D-001: Archie's knowledge scope is open-ended, not bounded to Knewzly's curated data

**Decision:** Archie may answer from general AI-history knowledge, not only the atlas's sourced anchors and F03's curated Today slice.
**Reason:** Henry explicitly chose this over the bounded-scope recommendation, which would have more directly closed the original overreach risk but limited Archie to only what Knewzly has already vetted.
**Source:** Direct user instruction, this session.
**Impacts:** FR-011 (mandatory labeling of non-Knewzly-sourced claims) was added specifically to mitigate the reopened overreach risk this decision creates; P-004 ("Claims Need Provenance") applies to this feature at full force as a result.

### D-002: Archie may perform independent live news lookups

**Decision:** Archie is not limited to F03's existing curated, reviewed news slice; it can fetch from sources F03 hasn't vetted.
**Reason:** Henry explicitly chose broader current-news coverage over the bounded-to-F03 recommendation.
**Source:** Direct user instruction, this session.
**Impacts:** FR-012 (mandatory source/date/freshness on every live claim); opened Q-001 (source-vetting policy, deferred to design — mirrors F03's own unresolved provider decision rather than inventing a stricter standard only for Archie).

### D-003: Archie is a global persistent companion

**Decision:** One Archie companion, reachable from both the Atlas and the Today panel, rather than being scoped to a single surface.
**Reason:** Matches the concept mockup's framing and the cross-surface tracing job Archie exists to do; Henry accepted the recommended option.
**Source:** Direct user instruction (accepted recommendation), this session.
**Impacts:** FR-010.

### D-004: Four-type claim vocabulary

**Decision:** Archie uses the same four claim types as the rest of Knewzly: Fact, Interpretation, Hypothesis, Conceptual analogy.
**Reason:** `.ai/sdd/PLAN.md`'s Source and Provenance Baseline was updated 2026-08-09 to add Hypothesis project-wide (not Archie-specific), per Henry's explicit choice to fold it into the shared baseline.
**Source:** `.ai/sdd/PLAN.md`, "Source and Provenance Baseline."
**Impacts:** FR-001.

### D-005: Knowledge-graph-first retrieval, web search as supplement

**Decision:** Archie prioritizes grounding answers in the atlas's curated knowledge graph (typed anchors and relationships) and uses web search to extend or verify only beyond what the graph already covers, rather than treating web search as an equal, independent source.
**Reason:** Direct user instruction, this session. Resolves the priority-order half of Q-001 (the exact provider/allowlist mechanics remain deferred to design).
**Source:** Direct user instruction, this session.
**Impacts:** FR-013 (new); narrows Q-001 to provider mechanics only; reinforces P-004 by keeping Knewzly's own vetted data as the default source of truth even though D-001/D-002 opened the door to broader scope.

### D-006: Archie activates through BYOK (bring your own key)

**Decision:** A learner must supply their own model API key to activate Archie. Knewzly does not provide, subsidize, or proxy model access.
**Reason:** Direct user instruction, this session. Keeps model inference cost and provider choice with the learner rather than Knewzly, and avoids Knewzly operating as a paid inference backend.
**Source:** Direct user instruction, this session.
**Impacts:** FR-014, FR-015, NFR-003, NFR-005 (new). Flagged trade-off: BYOK introduces real setup friction against the product's "curious 16-year-old" persona (P-002) — most likely to not already hold an API key. This draft does not resolve that friction; it's recorded in Out of Scope as a required design concern, not silently accepted.

## Questions

### Q-001: What are the exact mechanics for Archie's web search provider and per-source vetting?

**Status:** open (narrowed by D-005)
**Why it matters:** Affects data behavior and NFR-004; determines what "verified" means for FR-012/FR-013 in practice.
**Recommended:** D-005 already resolves the priority order (knowledge graph first, web search to supplement/verify). What remains is mechanical: which web search provider/API, and how an individual web result's credibility is assessed before Archie treats it as source-able. Defer this to design, mirroring F03's own unresolved "Today update mechanism (API, hook, or RSS)" decision (`PLAN.md`, "Product Shape Decided So Far"). FR-012 and FR-013 already hold regardless of which provider design selects, so this does not need to block `requirements:approved`.

| Option | Answer | Choose this if... | Impact |
|--------|--------|-------------------|--------|
| A | Defer to design (Recommended) | You want this resolved alongside F03's own provider decision, not duplicated here | No requirements change; design.md must resolve it before implementation |
| B | Restrict to a specific pre-approved source allowlist now | You want a hard boundary decided at requirements stage | Would add a new Must Have FR naming the allowlist |
| Custom | — | Neither fits | Update this question and FR-012/FR-013 accordingly |

### Q-002: Does the generated explainer (FR-009) produce a downloadable file, an in-app view, or both?

**Status:** open
**Why it matters:** Affects NFR scope (file handling) and FR-009's acceptance criteria, but FR-009 is Could Have, so this does not block `requirements:approved`.
**Recommended:** In-app view with an optional download, matching the concept mockup's inline preview treatment.

| Option | Answer | Choose this if... | Impact |
|--------|--------|-------------------|--------|
| A | In-app view + optional download (Recommended) | You want the explainer usable immediately without a file-handling round trip | FR-009 acceptance criteria include a rendered preview and a download action |
| B | In-app view only | You want to keep FR-009 as small as possible for v1 | Drop download from FR-009's acceptance criteria |
| C | Downloadable file only | Sharing outside the app matters more than in-app reading | FR-009 acceptance criteria center on file generation, not an in-app view |
| Custom | — | Neither fits | Update FR-009 accordingly |

## Glossary

- **Claim type:** One of Fact, Interpretation, Hypothesis, or Conceptual analogy — the label every substantive Archie statement carries.
- **Freshness:** A visible indicator of how recently a current-news claim was checked or refreshed, including an explicit stale state.
- **Companion:** Archie's product framing — a persistent, cross-surface presence, not a page-specific widget or a one-off chatbot embed.
- **Anchor:** An atlas historical event/moment, per F01/F02's existing vocabulary.
- **Knowledge graph:** The atlas's curated set of anchors and typed relationships between them (per PLAN.md's Relationship Vocabulary) — Archie's primary, first-priority source before web search.
- **BYOK (bring your own key):** An activation model where the learner supplies their own model API key; Knewzly does not provide, subsidize, meter, or proxy model access.
