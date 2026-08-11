# Research Note: Initial Timeline Video Gap Analysis

> Supporting evidence only. This note cannot approve the plan or any SDD gate.
> Reviewed: 2026-07-31

## Source and Method

- **Reference video:** [Yapay Zeka Tarihi Nasıl Başladı? Nereden Nereye...](https://youtu.be/y_6UC1BFbqE)
- **Creator:** Arman ACAR
- **Runtime observed from YouTube metadata:** 29:55
- **Transcript condition:** YouTube exposed an auto-generated Turkish transcript. Topic coverage below is an observation from the video description and transcript, not a claim that every detail is historically complete or error-free.

## What the Video Already Covers Well

The video provides a coherent technical spine:

1. 1939 Bletchley Park, Enigma, and Alan Turing.
2. Turing's 1950 question about machine intelligence; McCulloch–Pitts and early neural-network ideas.
3. Dartmouth, the naming of artificial intelligence, Logic Theorist, and symbolic AI.
4. Perceptrons, SAINT, Shakey, the limitations of single-layer networks, and the first AI winter.
5. Expert systems, including DENDRAL and MYCIN, backpropagation, Japan's fifth-generation project, and the second AI winter.
6. Deep Blue, GPUs, data and compute, Watson, GANs, AlphaGo, Transformers, GPT-1/GPT-3, image generation, ChatGPT, multimodality, and recent ethics/regulation.

This is a useful backbone for Knewzly, but it is mostly a chronology of named technical milestones.

## Gaps to Address

### 1. Intellectual and philosophical prehistory

The video begins in 1939. Knewzly can add a conceptual lineage that makes the question “what is intelligence, language, interpretation, or agency?” visible before modern computing:

- **Formal reasoning:** Aristotle's logic; later formalization through Leibniz, Boole, Frege, Hilbert, Gödel, and Church.
- **Knowledge and categories:** Kant's account of concepts, judgment, and reason; Hegel's account of development through contradiction and mediation.
- **Language and meaning:** Wittgenstein's picture theory and language games; the limits of treating meaning as detached from use.
- **Interpretation:** Heidegger's being-in-the-world and Gadamer's hermeneutics as lenses on context, understanding, and interpretation.
- **Automata and animate artifacts:** Greek and Hellenistic automata, Islamic mechanical traditions, Chinese and Daoist stories of artificial beings, and Japanese karakuri traditions.
- **Anthropomorphism and relational agency:** Shinto animism can help explain why people are inclined to treat crafted objects as having spirit or agency.

These should be labelled as **conceptual ancestry or interpretive lens**, not presented as a direct causal pipeline into modern LLMs. The distinction matters: a philosophical idea can frame a question without being an engineering dependency.

Useful orientation sources: [Aristotle's Logic](https://plato.stanford.edu/entries/aristotle-logic/), [Kant](https://plato.stanford.edu/entries/kant/), [Hegel](https://plato.stanford.edu/entries/hegel/), [Wittgenstein](https://plato.stanford.edu/entries/wittgenstein/), [Heidegger](https://plato.stanford.edu/entries/heidegger/), [Gadamer](https://plato.stanford.edu/entries/gadamer/), [Daoism](https://plato.stanford.edu/entries/daoism/), and [Shinto](https://www.britannica.com/topic/Shinto).

### 2. Global and institutional origins

The video foregrounds a UK/US-centered technical story. A global atlas should audit:

- Polish cryptanalysis before and alongside Bletchley Park.
- The transnational wartime network around codebreaking, early computers, and women’s technical labor.
- Canadian, French, German, Soviet/Russian, Japanese, Chinese, Indian, African, Latin American, and Middle Eastern contributions where the evidence supports them.
- Universities, government labs, military procurement, corporations, open-source communities, and standards bodies as actors—not just individual inventors.

The goal is not a country checklist. It is to show how ideas, people, funding, migration, institutions, and hardware moved across regions.

### 3. Missing infrastructure layer

The narrative jumps from algorithms to capabilities without showing the enabling stack:

- transistors, integrated circuits, memory, networking, and semiconductor manufacturing;
- CPUs, GPUs, TPUs, cloud data centers, energy, water, and critical materials;
- datasets, web-scale corpora, data licensing, annotation, human feedback, and content moderation labor;
- capital, procurement, business models, and platform distribution.

This layer is essential if Knewzly is meant to cover the AI ecosystem as a whole rather than only model breakthroughs.

### 4. Missing model-development bridge to LLMs

The video names Transformers and GPT but does not give learners the connective mechanics:

- statistics and probabilistic modeling;
- decision trees, support-vector machines, ensembles, and Bayesian methods;
- word representations, embeddings, recurrent models, and sequence modeling;
- tokenization, attention, the Transformer architecture, pretraining, scaling, instruction tuning, human or AI feedback, retrieval, tool use, and agents.

The primary technical bridge should include [McCulloch–Pitts (1943)](https://doi.org/10.1007/BF02478259), [backpropagation (1986)](https://doi.org/10.1038/323533a0), the [Dartmouth proposal](http://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html), and [Attention Is All You Need (2017)](https://arxiv.org/abs/1706.03762).

### 5. Missing non-LLM ecosystem branches

The video touches image and video generation, but a full ecosystem map should also include:

- search and recommender systems;
- speech recognition and synthesis;
- computer vision and multimodal perception;
- robotics and embodied interaction;
- scientific and medical systems;
- games and simulation;
- edge and embedded AI;
- evaluation, benchmarks, interpretability, safety, and alignment.

These branches should connect back to shared foundations rather than appear as unrelated product categories.

### 6. Missing social, economic, and governance feedback loops

The video ends with ethics and regulation, but the atlas should connect these to the systems that produced them:

- bias, exclusion, privacy, surveillance, and security;
- labor, invisible data work, and professional displacement;
- copyright, licensing, and the economics of training data;
- concentration of compute and model access;
- safety evaluation, misuse, incidents, standards, and law;
- how deployment changes the data, incentives, and research agenda in return.

### 7. Missing relationship types

The video is primarily a sequence. Knewzly's insight engine needs typed edges between events:

- **preceded by**
- **influenced**
- **reacted against**
- **enabled by**
- **reused or iterated on**
- **commercialized by**
- **constrained or regulated by**

This is the mechanism that turns “no idea is original” into a navigable, evidence-backed learning experience rather than a list of dates.

### 8. Missing evidence and uncertainty model

Every event or connection should be able to show:

- source and attribution;
- whether the statement is fact, interpretation, or hypothesis;
- confidence or strength of the connection;
- contested or incomplete history;
- what evidence would change the current interpretation.

## Product Implication

Keep the chosen **continent lanes** as the main geography view, then add ecosystem dimensions as filters, tags, and relationship types rather than multiplying the number of visual lanes. A learner could filter the same timeline by `philosophy`, `formal reasoning`, `hardware`, `data`, `models`, `applications`, `governance`, or `labor` while retaining the geographic context.

Philosophy should be a parallel conceptual lane connected to technical events, not a claim that Aristotle or Heidegger directly caused an LLM architecture. This preserves the user's insight about ancestry without collapsing analogy into causation.

## Candidate Seed-Set Shape

Not an approved feature list. A balanced first spine could include connective nodes from:

1. automata, agency, and formal reasoning;
2. logic, computation, information, and cybernetics;
3. wartime computation and global codebreaking;
4. early neural and symbolic AI;
5. expert systems, connectionism, and the AI winters;
6. statistics, backpropagation, data, and compute;
7. deep learning, representation learning, and reinforcement learning;
8. attention, Transformers, pretraining, and LLMs;
9. multimodal and generative systems;
10. deployment, labor, governance, safety, and the current news layer.

The video can help judge visual pacing and density, but the seed set still needs a separate evidence and inclusion decision.

## Open Questions Raised by This Review

- **Resolved:** Philosophy appears as a persistent parallel lane connected to technical and geographic events. It must be labelled as conceptual ancestry or interpretive lens where direct causation is not evidenced.
- Which events belong in the initial global spine, and what counts as “key” evidence?
- How much of infrastructure, labor, and governance belongs in the first learner experience?
- What relationship types are strong enough to draw as visible arcs?
- How should contested or indirect philosophical connections be labelled?
