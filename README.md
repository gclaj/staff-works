# AI-Enabled MDMP Staff Toolkit

An interactive staff playbook built from **"Evolving Brigade MDMP with AI-Orchestrated Planning" v2.0** (3D Mobile Brigade, 101st Airborne Division (AASLT), 6 June 2026) — the after-action white paper documenting the brigade's nine-month maturation of AI-enabled planning across SEP STAFFEX, JRTC LTP, and JRTC Rotation 26-06.

The document's own conclusion is the app's premise: *AI-enabled MDMP is no longer a science project. It is a repeatable and scalable brigade tactic.* This toolkit operationalizes that playbook so any brigade or battalion staff can replicate it.

## What's in the app

| Tab | What it does |
|---|---|
| **01 Overview** | Executive summary, 8 key findings, LLM ecosystem model, the Five Fundamental Principles, and the TiC 1.0 → 2.0 maturation table |
| **02 MDMP Workflow** | Step-by-step AI integration points per MDMP step, the human-only doctrinal boundary at COA development, group-chat rosters, and warfighting-function sync plays |
| **03 Prompt Library** | The pre-tested role-specific prompts from the paper (S2/S3/S4, CUB, BLUF, Two-Minute Drill, fires thread, RED AIR, deconfliction, XO Coach, Red Team, CP context load) with copy-to-clipboard and highlighted `[PLACEHOLDERS]` |
| **04 Prompt Builder** | Interactive builder for the 101st ABN "scaffolding" prompt structure — Role/Authority, Purpose & End-State, Reality/Context, Data Sources, Required Analysis, Output Format, Quality Gates, Request for Confirmation |
| **05 Timeline Calculator** | 1/3–2/3 planning-window calculator: enter receipt of mission and H-hour, get the brigade OPORD publish deadline and milestone DTGs (WARNO #1 within one hour, MA brief, COA dev, orders production) |
| **06 Governance & Validation** | Validation hierarchy by product class, the four governance failure modes, an interactive hidden-confidence/hallucination pre-publication checklist, and the knowledge-bank prep checklist |
| **07 Command Post Ops** | The five CP use cases, context-load checklist, auto-flag URGENT rules, the AI will-not-infer list, and the AI battle-rhythm schedule |
| **08 Challenges & Playbook** | All seven challenges with fielded solutions, ten best practices, right-vs-wrong comparison, and the eleven "What Not to Do" prohibitions |
| **09 Metrics Tracker** | Log exercises and track the paper's recommended metrics (time to WARNO #1, doctrinal errors, staff-ready %, planning-cycle hours, staff confidence) with event-over-event deltas |
| **10 Workflow Engine** | Multi-agent orchestration of the paper's bot roster: the AI Integrator, functional specialist bots (S2/S3/S4/FSO/ENG), Red Team agent, and XO Coach run MDMP as a pipeline — higher-order extraction → WARNO #1 + timeline → parallel running estimates → Red Team proof → **hard human gate at COA development** → XO Coach wargame questions + Red Team gap analysis → OPORD shell → final consistency check → named-validator sign-offs → export the planning packet as markdown |

## The Workflow Engine

The engine has two modes, mirroring the paper's Challenge 6 (DDIL) guidance:

- **Simulation (default)** — fully offline. Each bot produces a doctrinally structured skeleton product built from your inputs, with `[TBD]` placeholders and paired RFIs everywhere data wasn't supplied (zero fabrication tolerance).
- **Live** — calls Claude directly from the browser via the Anthropic Messages API using your own API key (stored only in browser localStorage). Every bot runs under a shared governance system prompt encoding the paper's Five Principles; model selection follows the paper's guidance (Opus-class for complex doctrinal reasoning, lighter models for routine work). **Do not paste classified or CUI material into live mode** — the paper's commercial-API dependency warning applies.

Governance is enforced in code, not just prose: the pipeline **stops** at COA development and will not continue until a human types the commander-selected COA; AI never authors commander's intent (the OPORD shell marks it `[CDR PROVIDES — NON-DELEGABLE]`); every product is stamped DRAFT until its named validator signs it in Phase 6; unsigned products export stamped `DRAFT — UNVALIDATED`.

## Running it

No build step, no dependencies, no network calls — deliberately DDIL-friendly, per the document's own Challenge 6 guidance.

```bash
# Option 1: open directly
open index.html

# Option 2: serve locally
python3 -m http.server 8000
# then browse to http://localhost:8000
```

Checklists, the prompt builder draft, the timeline inputs, and logged metrics persist in the browser's `localStorage` only.

## Design constraints carried over from the source document

- **Human-in-the-loop is non-negotiable** — the app is a reference and drafting aid; it renders the doctrinal boundary (COA development, commander's intent, risk acceptance, fires authorization, order signing are human-only) prominently.
- **Zero fabrication tolerance** — library prompts keep `[TBD]`-style placeholders highlighted so they are filled by staff, never by the model.
- **Works offline** — static HTML/CSS/JS, no external fonts, CDNs, or APIs.

*For training use. Derived from a CUI-marked source document; verify handling requirements with your unit before distributing.*
