/* ==========================================================================
   Content extracted from "Evolving Brigade MDMP with AI-Orchestrated Planning"
   3D Mobile Brigade, 101st Airborne Division (AASLT) — v2.0, 6 June 2026
   ========================================================================== */

const DATA = {

  /* ---------------- Overview ---------------- */
  bottomLine: "AI-enabled MDMP is no longer a science project. It is a repeatable and scalable brigade tactic.",

  keyFindings: [
    { title: "Planning Velocity", text: "WARNO #1 and planning timelines generated in minutes (5 prompts, 10 minutes), enabling earlier parallel planning across staff sections." },
    { title: "Doctrinal Rigor", text: "AI-generated products demonstrated doctrinal compliance — LTP coaches rated 3MBDE's WARNO #1–3 among the best they had observed in the previous six rotations." },
    { title: "Decision Focus", text: "CCIR quality improved by linking them directly to the commander's initial planning guidance and phase transitions, sharpening decision making." },
    { title: "Synchronization", text: "Multi-agent orchestration integrated fires, air, logistics, and maneuver effects earlier in the planning cycle with fewer errors." },
    { title: "Scalability", text: "The workflow — integrator + WfF working group, planning cell + role-based LLM + MDMP step chat + doctrinal upload + validation — is transferable to any brigade or battalion staff." },
    { title: "Cognitive Time Preservation", text: "AI compression of clerical, translational, and formatting labor freed cognitive time for the conceptual work of command: understanding the problem, visualizing the operation, accepting risk, and deciding. The second-order effect — not the compressed timeline itself — is the principal finding." },
    { title: "Voice-to-Doctrine Translation", text: "During JRTC 26-06, transcribed verbal commander and planner dialogue was converted into a first-draft OPORD in correct doctrinal format in approximately thirty minutes. The machine did not produce command judgment; it preserved and formalized command thought." },
    { title: "Doctrinal Boundary", text: "AI was correctly excluded from COA development, determination of commander's intent, and approval-authority decisions. AI is artificial staff support, never a substitute for command judgment. This boundary is the entire finding." }
  ],

  ecosystem: [
    { role: "AI Integrator (S3 cell / AS3)", text: "Manages timelines, templates, and doctrine upload; synthesizes commander guidance into structured inputs; flags inconsistencies across successive products. Critical to scaling AI-assisted MDMP across the staff." },
    { role: "Functional Specialists (S2, S3, S4, FSO, ENG, Enablers)", text: "Use role-specific chats to draft running estimates, CCIR, COA sketches, and annex stubs." },
    { role: "Red Team Agent", text: "A second LLM + validator that proofs outputs for gaps, bad assumptions, date-time group errors, and doctrinal inconsistencies." },
    { role: "Knowledge Bank", text: "Shared doctrine, HHQ OPORD, SOPs, and templates ensure all agents operate from the same authoritative source." }
  ],

  principles: [
    { title: "Human-in-the-Loop is Non-Negotiable", text: "AI is a tool to augment, not replace, professional military judgment. The human planner remains the tactical author. AI organizes, formats, synthesizes, and challenges; it does not command, decide, or accept risk." },
    { title: "AI Functions as Staff Augmentation", text: "AI performs the cognitive labor of synthesis, formatting, cross-referencing, and checklist enforcement. The commander's visualization, tactical judgment, risk acceptance, and final approval remain exclusively human functions." },
    { title: "Zero Fabrication Tolerance", text: "AI will never fabricate MGRS grids, DTGs, unit designations, task organization relationships, or fires coordination data. If information is unavailable, AI marks it [TBD] and requests clarification. Staff verify AI-generated factual claims against source documents before dissemination." },
    { title: "Iteration is the Designed Workflow", text: "Expect two to three iterations per product. A staff officer writing from scratch takes two to four hours; AI produces a first draft in thirty seconds and human refinement takes fifteen to thirty minutes. Iteration is not failure — it is the intended path." },
    { title: "Format Specification Before Content", text: "Every AI request specifies the desired output format before requesting content. Format misalignment is the single most common source of rework. Define columns, structure, naming conventions, and level of detail upfront." }
  ],

  evolution: {
    dims: ["AI Role", "Scope", "Functional Integration", "Collaboration", "Inconsistency Detection", "Planning Math", "Governance"],
    events: ["SEP STAFFEX (Sep 2025)", "JRTC LTP (Oct 2025)", "JRTC Rotation 26-06 (Apr 2026)"],
    rows: [
      ["Doctrinal drafting aid", "Disciplined, role-based planning partner", "Governance-first staff augmentation with voice-to-doctrine"],
      ["End-to-end MDMP", "Compressed Steps 1–2, integrated wargaming", "Full force-on-force MDMP under JRTC pressure, 23 hrs to OPORD"],
      ["S2, S3, S4, FSO", "S2, S3, S4, FSO, ENG, ADA, S6", "All staff sections plus CUOPs Battle Captain and XO Coach roles"],
      ["Discrete outputs in shared environment", "Continuous co-authoring with real-time validation", "Voice-to-doctrine transcription pipeline; AI surfaces questions for sync meetings"],
      ["Manual flagging of inconsistencies", "Automated inconsistency detection and correction", "Red Team agent + validation hierarchy by product class"],
      ["Doctrinal structure", "Doctrinal structure + time math, nesting, QC", "Doctrinal structure + cognitive-time preservation as design intent"],
      ["Ad hoc", "AI Integrator role and prompt library", "Validation hierarchy, named validators, single source of truth, DDIL rehearsed"]
    ]
  },

  caseStudies: [
    { name: "SEP 2025 STAFFEX — Large-Scale Air Assault", text: "End-to-end MDMP for a large-scale air/ground infiltration against layered enemy defenses, EW threats, and IADS. Doctrine (ADP 5-0, ADP/FM 3-0, FM 3-90, FM 3-34, 101st Gold/Purple Books), the division OPORD, and BDE templates were uploaded to the knowledge bank. A primary integrator model reconciled higher guidance with doctrine and enforced OPORD/WARNO structure with placeholders for unknown data; specialist variants supported air-assault lift calculations, HLZ capacity trade-offs, and artillery mobility planning. Output: a staff-ready product set spanning mission analysis to orders production, each assumption paired with an RFI and LTIOV." },
    { name: "JRTC LTP OCT 2025 — Compressed Timeline", text: "A doctrinally formatted WARNO #1 nested under the higher order in ten minutes and fewer than five prompts — computed 1/3–2/3 planning windows, named milestones, and higher mission and intent incorporated verbatim. Low-fidelity audio from commander's guidance was converted into operational phrasing (three fights: uncoil, shape the enemy below 50% combat power, sustain momentum). LLM agents automatically flagged inconsistencies across successive WARNOs and OPORD drafts — mismatched passage point labels, non-standard phrasing, inconsistent DTGs." },
    { name: "JRTC ROTATION 26-06 APR 2026 — Force-on-Force Under Pressure", text: "Approximately two weeks of force-on-force operations against a dedicated OPFOR. A complete brigade OPORD was produced in approximately twenty-three hours while preserving the 1/3–2/3 rule. Within four hours of receipt of mission, the staff had transitioned from raw text ingestion to working product generation. The variable that produced the outcome was the discipline with which the staff employed the tools, not the tools themselves." }
  ],

  /* ---------------- MDMP Workflow ---------------- */
  mdmpSteps: [
    {
      num: "1", title: "Receipt of Mission", tagline: "WARNORD out in under one hour",
      humanOnly: false,
      aiUses: [
        "Feed the higher order set into an AI tool to surface specified and implied tasks, constraints, restraints, command relationships, control measures, and critical deadlines.",
        "Generate a draft warning order for staff refinement — 3MBDE published a complete WARNORD to subordinate battalions within one hour of receipt of mission.",
        "Generate the planning timeline: computed 1/3–2/3 windows within duty hours, named key milestones, higher HQ mission and intent incorporated verbatim for doctrinal nesting."
      ],
      humanUses: [
        "Commander issues initial guidance; the staff validates extracted tasks against the source order.",
        "S3 approves the timeline and WARNO before release."
      ],
      chat: "Commander, S3, AS3s / AI Integrator(s)"
    },
    {
      num: "2", title: "Mission Analysis", tagline: "Structured draft instead of a blank page",
      humanOnly: false,
      aiUses: [
        "Ingest documents, extract mission-analysis factors, cross-reference details, and generate structured outputs for staff refinement.",
        "Draft running estimates per warfighting function: organize facts, preserve assumptions, cluster updates, and generate draft revisions as new guidance arrives.",
        "Develop decision-linked CCIR/FFIR tied to commander's guidance and phase transitions; pair every assumption with a corresponding RFI and LTIOV."
      ],
      humanUses: [
        "Essential tasks require human validation; assumptions require human judgment; risks require human assessment.",
        "The S-3 enters the mission analysis brief with a working product rather than a folder of marked-up notes — an operationally significant shift.",
        "Section chiefs treat AI outputs as drafting aids: the machine produces the first pass, humans own validation and sign for accuracy."
      ],
      chat: "AS2, Collection Manager, S2, S3, AS3s, S4/SPO, FSO, ENG"
    },
    {
      num: "3", title: "COA Development", tagline: "DOCTRINAL BOUNDARY — humans at the map",
      humanOnly: true,
      aiUses: [
        "AI properly takes a back seat. It remains present in the planning cell for reference and formatting support only.",
        "AI is NOT the conceptual author of the operation."
      ],
      humanUses: [
        "COA development depends on tactical imagination, doctrinal literacy, terrain appreciation, enemy understanding, and the commander's sense of acceptable risk.",
        "The plans officer stands at the map with the commander and the S-3 and builds the concepts manually — against terrain, against enemy disposition, against the commander's intent.",
        "AI is never employed to determine commander's intent, select the decisive operation, authorize fires, accept risk, or sign orders. These functions are non-delegable to machines — command responsibility is not an administrative task."
      ],
      chat: "All Warfighting Functions, Commander, AS3s / AI Integrator(s), Enablers"
    },
    {
      num: "4-5", title: "COA Analysis & Comparison", tagline: "Wargame support and red-teaming",
      humanOnly: false,
      aiUses: [
        "XO Coach role: generate pointed questions across warfighting functions — identify vulnerabilities during forward passage of lines, evaluate consequences if the main effort breaches thirty minutes early — and walk those questions into the synchronization meeting.",
        "Red-team drafts to surface gaps, bad assumptions, DTG/MGRS errors, and inconsistencies.",
        "Feed logistics analysis into COA comparison (sustainment forecasts, triggers, route-risk by phase)."
      ],
      humanUses: [
        "The machine enhances rigor without displacing judgment — a staff coach, not a staff commander.",
        "Commander selects and modifies the COA; staff owns the wargame turn-by-turn adjudication."
      ],
      chat: "All Warfighting Functions, Commander, AS3s / AI Integrator(s), Enablers"
    },
    {
      num: "6-7", title: "Orders Production, Dissemination & Transition", tagline: "Assess the plan, don't maintain its mechanics",
      humanOnly: false,
      aiUses: [
        "Draft warning orders, structured OPORD paragraphs, execution timelines, tasks to subordinate units, and first drafts of synchronization tools.",
        "Voice-to-doctrine: transcribe verbal planning sessions and translate transcripts into doctrinally structured drafts — first-draft OPORD in ~30 minutes reflecting what the humans actually said.",
        "Automatically flag inconsistencies between successive WARNOs and OPORD drafts — mismatched passage point labels, non-standard phrasing, inconsistent date-time groups.",
        "One-line task statements for subordinate units, integrated engineer and fires effects, FPOL control measures, A2C2 notes, coherent execution timeline in local time."
      ],
      humanUses: [
        "The staff spends its energy assessing the quality of the plan rather than maintaining the mechanics of the plan.",
        "Each AI output is tagged as a draft until validated; final products are section-chief approved and signed before publication.",
        "Commander signs the order. Always."
      ],
      chat: "S2, S3, S4/SPO, FSO, ENG, ADA, Enablers, AS3 / AI Integrator(s)"
    }
  ],

  wffSync: [
    { wff: "S2 Intelligence", text: "Refine IPOE products and threat assessments while preserving analyst judgment on enemy COA development. Enemy COA analysis per ATP 7-100.1 and lessons from Ukraine. ASCOPE framework for civil-military analysis of population centers." },
    { wff: "FSO Fires", text: "Draft the fires shift matrix and trigger logic — with full FSO and maneuver-commander validation against TRPs, range fans, and trigger logic before any rehearsal." },
    { wff: "S4 Sustainment", text: "Ingest LOGSTAT data to generate sustainment forecasts, triggers, and route-risk assessments; feed logistics analysis into COA comparison and orders production; identify supply shortfalls and recommend branch/sequel logistics support." },
    { wff: "S6 Signal", text: "Validate network architecture against the maneuver plan, identify communication gaps and recommend redundancy, ensure C2 continuity across phase transitions." },
    { wff: "ENG / ADA / Ground Movement Cell", text: "Role-specific chats draft functional inputs to the OPORD, map control measures (passage points, stationary/passing roles, reporting standards), and lay out copyable execution timelines aligned to phases of the scheme of maneuver." }
  ],

  /* ---------------- Prompt Library ---------------- */
  promptCategories: ["All", "Planning", "Command Post", "Fires", "Coaching"],
  prompts: [
    {
      cat: "Planning", role: "S2", title: "Running Estimate from Higher OPORD",
      note: "Step 2 — Mission Analysis. Verify extracted tasks against the source order before the MA brief.",
      text: "Analyze the higher OPORD and generate a running estimate for [UNIT] including facts, assumptions, specified/implied tasks, constraints, and RFIs."
    },
    {
      cat: "Planning", role: "S3", title: "Planning Timeline (1/3–2/3)",
      note: "Step 1 — Receipt of Mission. Produced a nested WARNO #1 in under ten minutes at LTP.",
      text: "Attached is [HHQ ORDER] from [HHQ]. This is the higher HQ, Division Order. For planning purposes, we will have received this order at [DTG] and will publish the order on [DTG]. Please assist me with generating the planning timeline. From [DTG] until [DTG], this time will be dedicated as the first 1/3, all towards brigade planning."
    },
    {
      cat: "Planning", role: "S4", title: "Sustainment Forecast from LOGSTAT",
      note: "Feed the output into COA comparison and orders production. SPO validates all quantities.",
      text: "Ingest the LOGSTAT export and generate sustainment forecasts, supply triggers, and route-risk assessments for each phase."
    },
    {
      cat: "Command Post", role: "Battle Captain", title: "Commander's Update Brief (CUB)",
      note: "Run at shift change every six hours, and 30 minutes prior to the BUB. Cite source per bullet.",
      text: "Generate a CUB covering the last 12 hours of operational traffic. Populate the positions table only with explicit grids; prioritize MASCALs and CCIRs with grids, RED AIR and EW timeline, rear-area threats near PAAs, and fires targets requiring clearance. Cite source per bullet."
    },
    {
      cat: "Command Post", role: "Battle Captain", title: "Structured BLUF",
      note: "Pre-brief preparation, 30 minutes prior to the Battle Update Brief or CUB.",
      text: "Produce a two-to-three-sentence BLUF for pre-brief preparation covering: enemy disposition with sources, friendly posture and key incidents, protection (air/UAS/COMSEC), sustainment posture and risks, and key events for the next 12–24 hours with DTGs and grids."
    },
    {
      cat: "Command Post", role: "Battle Captain", title: "Two-Minute Drill",
      note: "On demand for the commander. Grids and CCIR matches only — constrain scope.",
      text: "Produce a focused 12-hour extraction prioritized on these focus areas: COMSEC events, RED AIR/EW, and casualty-producing strikes. Include grids and CCIR matches only."
    },
    {
      cat: "Fires", role: "FSO", title: "Fires Thread Extraction",
      note: "Run after significant fires activity. FSO reads the summary verbatim.",
      text: "Extract the fires thread from current traffic: points of origin and impact with grids, time, and source; battery status by DTG; all mission numbers with action (sent, canceled, EOM); current PAA; survivability moves; CAS and AAA status. Output as bullets plus a one-paragraph summary the FSO can read verbatim."
    },
    {
      cat: "Fires", role: "ADA / Battle Captain", title: "RED AIR / Air Defense Timeline",
      note: "Run after RED AIR or ADA events. AI identifies what evidence is still missing.",
      text: "Extract HIND and Stinger reports from the last [WINDOW] with DTG, grid, source, stated BDA, and confidence. Generate a three-step verification plan (ISR check, ADA team debrief, ground SSE) and identify the evidence still missing."
    },
    {
      cat: "Fires", role: "FSO / Battle Captain", title: "Deconfliction & Proximity Check",
      note: "Run before fires execution. The battle captain holds clearance authority — AI only recommends.",
      text: "List all enemy sightings within 500 meters of friendly grids from the most recent traffic paste. Output: enemy grid/type/time/source paired with friendly grid/unit/time/source, with a Hold/Engage recommendation column for fires clearance."
    },
    {
      cat: "Command Post", role: "Battle Captain", title: "Conflict Check Between Reports",
      note: "AI surfaces the conflict; the battle captain adjudicates and publishes the authoritative report.",
      text: "These two reports disagree: [REPORT A] / [REPORT B]. Identify which is authoritative based on source, time, and corroborating traffic. Flag as CONFLICT DETECTED with both source reports and a recommended action."
    },
    {
      cat: "Coaching", role: "XO", title: "XO Coach — Adversarial Questions",
      note: "Walk the questions into the synchronization meeting. A staff coach, not a staff commander.",
      text: "Acting as an experienced brigade XO, generate pointed questions across the warfighting functions for this plan: [PLAN SUMMARY]. Identify vulnerabilities during forward passage of lines and evaluate consequences if the main effort breaches thirty minutes early. Frame each question so a staff section must answer with specifics."
    },
    {
      cat: "Coaching", role: "Red Team", title: "Red Team Draft Review",
      note: "Second model proofs the first. Correct flagged errors immediately — never publish known inconsistencies.",
      text: "Red-team this draft [PRODUCT] against the knowledge bank. Surface: gaps, bad assumptions, DTG and MGRS errors, mismatched control measure labels, non-standard phrasing, and doctrinal inconsistencies with [DOCTRINE REFS]. Do not rewrite the product — return a numbered discrepancy list with source citations."
    },
    {
      cat: "Command Post", role: "Battle Captain / RTO", title: "CP Context Load (Session Initialization)",
      note: "Run before processing ANY operational traffic, and again after every session reset. Do not rely on context persistence.",
      text: "Initialize with this operational context before processing traffic:\n- Roster: [KEY LEADER NAMES, POSITIONS, CALL SIGNS, UNIT ASSIGNMENTS]\n- Current CCIR/PIR and FFIR: [LIST]\n- Current control measures: [PHASE LINES, NAIs, OBJECTIVES, BATTLE POSITIONS, FSCMs]\n- Current phase and H-hour: [PHASE / H-HOUR]\n- Time standard: [LOCAL/ZULU]\n- Task organization: [TASK ORG]\nTag every extracted fact with a source (name, unit if known, timestamp). Tag sources not on this roster as UNKNOWN. Flag contradictory reports as CONFLICT DETECTED. Never infer unit assignments, grids, task and purpose, or PIR/CCIR matches not explicitly stated — request confirmation instead of guessing."
    }
  ],

  /* ---------------- Prompt Builder (scaffolding) ---------------- */
  builderFields: [
    { key: "role", label: "[ROLE / AUTHORITY]", hint: "You are the [role] supporting [unit] during [phase/mission]. Act within [doctrine refs].", placeholder: "You are the brigade S4 planner supporting 3MBDE during Phase II Defense. Act within FM 4-0 and ATP 4-90.", rows: 2 },
    { key: "purpose", label: "[PURPOSE & END-STATE]", hint: "Your task is to [decision/purpose]. Success = [MOP/MOE — e.g., ≤10% variance to historical usage; ≥80% CSI; output in ≤1 screen per class].", placeholder: "Your task is to produce a triaged emergency resupply plan. Success = ≤10% variance to historical usage; ≥80% CSI; ≤1 screen per class.", rows: 2 },
    { key: "context", label: "[REALITY / CONTEXT]", hint: "Unit (UIC, type, strength, key platforms) · Mission/Phase · Terrain/Weather · Tempo/COA · Constraints (CSR %, lift windows, pallets/tons, time to next resupply) · Risk thresholds.", placeholder: "Unit: ... / Phase: II Defense / Terrain: mountainous, wet season / Constraints: CSR limits, lift windows / Risk: no >48h gap for Class IX to maneuver.", rows: 4 },
    { key: "sources", label: "[DATA SOURCES]", hint: "Use and cite: doctrinal refs (version/date), historical (rotation/year), live status (data range, work orders), ammunition (TAMIS date), equipment densities (UDL/MTOE), CSI list (date/version). If a dataset is missing, state the gap, proceed with doctrinal baseline, and list assumptions.", placeholder: "Doctrine: FM 4-0 / ATP 4-90 (version, date). Historical: JRTC/NTC rotation, year. Live: GCSS-A DPE data range...", rows: 4 },
    { key: "analysis", label: "[REQUIRED ANALYSIS / INSTRUCTIONS]", hint: "Numbered steps: compute, compare planned vs actual, flag variances >[X]%, prioritize under constraints, provide risks and mitigation, ask for exactly N missing items if needed (no more).", placeholder: "1) Compute stockage by class... 2) Compare planned vs actual (GCSS-A/TAMIS); flag variances >[X]%... 3) Prioritize loads under constraints... 4) Risks and mitigation... 5) Ask for exactly 3 missing items if needed.", rows: 5 },
    { key: "format", label: "[OUTPUT FORMAT]", hint: "Specify format BEFORE content — columns, headers, prose vs. table, level of detail. This is Rule #1.", placeholder: "Return TWO sections only: A) Executive Summary (≤7 bullets). B) Tables as markdown — Table 1: Stockage Plan by Class (Class, Item, Qty, Source Used, Rationale, Risk, Action)...", rows: 4 },
    { key: "gates", label: "[TESTS / QUALITY GATES]", hint: "Sanity checks and thresholds. Note any assumption that could swing the plan by >[X]%.", placeholder: "Sanity check: fuel/ammo within ±10% of historical; highlight if outside. Confirm CSI coverage ≥80% ASL or flag. Note any assumption that could swing plan by >15%.", rows: 3 },
    { key: "confirm", label: "[REQUEST FOR CONFIRMATION]", hint: "End by asking for feedback and confirmation that the model has understood the prompt and request.", placeholder: "Before executing, confirm your understanding of this request and ask any clarifying questions.", rows: 2 }
  ],

  promptingRules: [
    { title: "Specify Format First", text: "Tell AI exactly how you want the output structured before asking for content. Columns, headers, prose vs. table, level of detail. Format misalignment is the single most common source of rework." },
    { title: "Constrain Scope", text: "Tell AI what NOT to generate. Limit the request to the specific product needed. Reject the model's default tendency to overproduce." },
    { title: "Provide Context", text: "Upload source documents. Reference specific orders, paragraphs, and prior products. Context starvation is the second most common source of rework." },
    { title: "Demand Sources", text: "Require AI to cite source documents for every factual claim. If a model cannot cite a source, treat the claim as unverified." },
    { title: "Iterate Deliberately", text: "Expect two to three iterations per product. Refine with precision, not frustration. The first output is a starting point, not a deliverable." }
  ],

  /* ---------------- Governance ---------------- */
  validationHierarchy: [
    { product: "Mission statement & commander's intent", validator: "Commander", note: "AI never authors these. Approval-authority products are non-delegable." },
    { product: "Essential tasks & assumptions", validator: "Staff (section chiefs)", note: "Essential tasks require human validation; assumptions require human judgment; risks require human assessment." },
    { product: "Fires products (shift matrix, trigger logic)", validator: "FSO + maneuver commander", note: "Validated against TRPs, range fans, and trigger logic before any rehearsal." },
    { product: "Running estimates", validator: "Warfighting-function chief", note: "AI assembles the draft estimate; the WfF chief signs for its accuracy." },
    { product: "Every AI-generated fact", validator: "Originating staff section", note: "Unit designations vs Annex A · grids vs ATAK and source overlays · DTGs vs the planning timeline · enemy capabilities vs Annex B. When in doubt, require AI to cite the specific source paragraph." },
    { product: "All published products", validator: "Section chief sign-off", note: "Every AI output is tagged as a draft until validated; final products are section-chief approved and signed before publication." }
  ],

  governanceFailures: [
    { mode: "Format Drift", text: "Plausible output in incorrect structure.", fix: "Specify format before content — every prompt declares the required structure (columns, headers, naming conventions, level of detail) before requesting content." },
    { mode: "Overgeneration", text: "Excess content that slows review.", fix: "Constrain scope — prompts explicitly tell AI what NOT to generate. Limit outputs to the specific product needed." },
    { mode: "Version-Control Failure", text: "Partially updated products multiplying faster than humans can reconcile.", fix: "Establish a single source of truth: one file class per product, version-controlled, named validators by product class. After every plan change, run a consistency check across derived products before the next planning event." },
    { mode: "Command-Post Overload", text: "AI generates products faster than the headquarters can govern.", fix: "Govern the production rate — AI generation rate is capped by validation capacity, not by model throughput. A headquarters that produces quickly but cannot validate rigorously has only accelerated the production of confusion." }
  ],

  hallucinationChecklist: [
    "Treat every AI output as a draft — no product is final until a qualified human validator signs for it.",
    "Cross-reference unit designations against Annex A.",
    "Cross-reference grid references against ATAK and source overlays.",
    "Cross-reference DTGs against the planning timeline.",
    "Cross-reference enemy capabilities against Annex B.",
    "When in doubt, require AI to cite the specific source paragraph.",
    "Confirm all unknowns are marked [TBD] and routed to staff for resolution — codified in unit SOP, not left to operator judgment under pressure.",
    "Verify no fabricated MGRS grids, DTGs, casualty estimates, supply quantities, or task-organization relationships.",
    "Remember: a polished paragraph is not a correct paragraph. A clean matrix is not an approved matrix."
  ],

  knowledgeBankChecklist: [
    "Upload all relevant doctrine BEFORE the exercise (ADP 5-0, ADP/FM 3-0, FM 3-90, FM 3-34, ATPs, threat doctrine).",
    "Upload brigade SOPs (PSOP, MCSOP), template WARNOs/OPORDs, annexes, and running estimate shells.",
    "Upload the higher headquarters OPORD and annexes.",
    "Apply the standardized naming convention (see examples).",
    "Validate every document is searchable and accessible to the appropriate staff sections.",
    "Ensure adequate network connectivity before uploading; consider edge node capability for forward-deployed operations.",
    "Conduct uploads during pre-exercise planning — never during the exercise itself."
  ],

  namingExamples: [
    "DOCTRINE FM 5-0 Planning and Orders Production",
    "DOCTRINE ADP 3-0 Unified Land Operations",
    "HHQ OPORD Division Level",
    "SOP Brigade MDMP Timeline",
    "TEMPLATE WARNORD Shell"
  ],

  /* ---------------- CP Operations ---------------- */
  cpUseCases: [
    { name: "Live Chat-Feed Processing", text: "Continuous processing of operational traffic producing an auto-categorized log by warfighting function." },
    { name: "COP Maintenance", text: "Extract explicit positions and control-measure references from traffic to keep the common operational picture current — explicit grids only, never inferred." },
    { name: "Command-Product Generation", text: "CUBs, BLUFs, and two-minute drills on demand from the running traffic log." },
    { name: "Conflict Detection", text: "Contradictory reports flagged as CONFLICT DETECTED with both source reports and a recommended action. The battle captain adjudicates and publishes the authoritative report." },
    { name: "CCIR/PIR Matching", text: "Traffic matched against loaded CCIR/PIR — only with control measures loaded; matches never inferred." }
  ],

  contextLoad: [
    "Roster: key leader names, positions, call signs, unit assignments.",
    "Current CCIR/PIR and FFIR.",
    "Current control measures: phase lines, NAIs, objectives, battle positions, FSCMs.",
    "Current phase and H-hour.",
    "Time standard (local/Zulu).",
    "Task organization.",
    "If the AI session resets, re-initialize with the FULL context load — the brigade does not rely on context persistence."
  ],

  urgentFlags: [
    "MASCAL or combat-ineffective reports",
    "RED AIR with proximity to friendly positions",
    "COMSEC compromise indicators",
    "Fratricide or Purple reports",
    "Friendly–enemy proximity that blocks fires",
    "Route or area hazards (obstacles, IDF, cratering charges)"
  ],

  willNotInfer: [
    "Unit assignments for unknown senders",
    "Grid locations not explicitly stated",
    "Task and purpose not stated in traffic",
    "PIR/CCIR matches without loaded control measures"
  ],

  battleRhythm: [
    { when: "Shift change (every 6 hours)", what: "Full CUB plus running log" },
    { when: "30 minutes prior to BUB/CUB", what: "Structured BLUF" },
    { when: "On demand (commander)", what: "Focused two-minute drill" },
    { when: "After significant fires activity", what: "Fires roll-up" },
    { when: "After RED AIR or ADA events", what: "Air-picture summary" },
    { when: "Before fires execution", what: "Proximity / deconfliction check" },
    { when: "Continuous", what: "Chat processing producing an auto-categorized log" }
  ],

  cpRules: [
    "AI tags every extracted fact with a source — name, unit if known, and timestamp.",
    "Sources not on the loaded roster are tagged UNKNOWN and must be verified by staff before action.",
    "AI flags contradictory reports as CONFLICT DETECTED with both source reports and a recommended action; the battle captain adjudicates.",
    "When inference is required, AI requests confirmation rather than guessing.",
    "Advanced (Opus-class) models for live CUOPs processing; light models acceptable for grid lookups or format conversions.",
    "AI organizes; the battle captain decides; the commander commands. AI does not replace decision authority, fires clearance, COMSEC handling, or official reporting channels."
  ],

  /* ---------------- Challenges & Playbook ---------------- */
  challenges: [
    {
      title: "Knowledge Bank Preparation and Upload",
      problem: "Uploading doctrine, HHQ orders, SOPs, and templates is time-consuming and requires careful organization. Early on, uploading a higher-level OPORD took over an hour with multiple failures — bandwidth constraints, large files, no naming standard, no edge node capability.",
      solutions: [
        "<strong>Pre-deployment preparation:</strong> conduct knowledge bank uploads during pre-exercise planning, not during the exercise.",
        "<strong>Standardized file structure:</strong> establish a naming convention and folder structure for all documents (e.g., 'DOCTRINE FM 5-0 Planning and Orders Production', 'TEMPLATE WARNORD Shell').",
        "<strong>Bandwidth mitigation:</strong> ensure adequate connectivity before uploading; consider edge nodes for forward-deployed operations.",
        "<strong>Validation checklist:</strong> after upload, verify all documents are searchable and accessible to the appropriate staff sections."
      ]
    },
    {
      title: "Prompt Crafting / Engineering and Response Time",
      problem: "Prompt engineering requires extremely specific language; response time can exceed five minutes, negating the benefit. Root causes: no prompt templates, insufficient training, generic prompts requiring multiple iterations, model latency at peak demand.",
      solutions: [
        "<strong>Prompt library development:</strong> create pre-tested, role-specific prompts for each staff section before deployment (see the Prompt Library tab).",
        "<strong>Scaffolding:</strong> structure complicated prompts with Role/Authority, Purpose & End-State, Reality/Context, Data Sources, Required Analysis, Output Format, Quality Gates, and a Request for Confirmation (see the Prompt Builder tab).",
        "<strong>Model selection:</strong> use faster models for routine tasks and reserve advanced models for complex reasoning and doctrinal analysis.",
        "<strong>Parallel processing:</strong> distribute prompts across multiple models simultaneously to reduce wait time and compare outputs."
      ]
    },
    {
      title: "Real-Time Collaboration and Continuity",
      problem: "Ensuring all staff sections work from the same version of the plan across planning sessions. Root causes: distributed cells with limited visibility, version control across iterations, loss of context when staff rotate, difficulty tracking decisions and rationale.",
      solutions: [
        "<strong>Group chat architecture:</strong> establish group chats for each MDMP step and planning cell (see the MDMP Workflow tab for rosters).",
        "<strong>Real-time visibility:</strong> all staff members with appropriate access can view AI-generated drafts, edits from other sections, validation status, and archived prompts/outputs for audit.",
        "<strong>Continuity management:</strong> copy chat history into successive MDMP chats; archive all prompts and validated outputs; maintain a 'plan profile' capturing unit locations, tasks, purposes, and timelines; enable rapid onboarding of replacements via the full planning history.",
        "<strong>Decision tracking:</strong> document all commander guidance, intent, and decisions in each group chat as they change — an audit trail that enables rapid branch/sequel development."
      ]
    },
    {
      title: "Hidden Confidence and Hallucination Risk",
      problem: "Machine output frequently appears polished enough to tempt premature acceptance. When content is subtly wrong — an incorrect unit designation, an inverted phase line, a fabricated control-measure name, a time-distance calculation off by forty minutes — polish becomes a hazard. Hidden confidence is the most operationally dangerous failure mode in an AI-enabled headquarters.",
      solutions: [
        "<strong>Treat every AI output as a draft.</strong> No product is final until a qualified human validator signs for it.",
        "<strong>Verify against source documents:</strong> units vs Annex A, grids vs ATAK, DTGs vs the timeline, enemy capabilities vs Annex B. When in doubt, require the AI to cite the specific source paragraph.",
        "<strong>Forbid fabrication of quantitative data.</strong> Unknowns are marked [TBD] and routed to staff — codified in unit SOP, not left to operator judgment under pressure."
      ]
    },
    {
      title: "Governance Failure Modes",
      problem: "Speed without governance produces faster confusion, not better plans. Four failure modes appear consistently even in disciplined units: format drift, overgeneration, version-control failure, and command-post overload.",
      solutions: [
        "<strong>Specify format before content</strong> in every prompt.",
        "<strong>Constrain scope</strong> — tell the AI what NOT to generate.",
        "<strong>Single source of truth:</strong> one file class per product, version-controlled, named validators; consistency check across derived products after every plan change.",
        "<strong>Govern the production rate:</strong> AI generation is capped by validation capacity, not model throughput."
      ]
    },
    {
      title: "DDIL Connectivity and Classification Handling",
      problem: "Tools proven in benign, connected, unclassified training environments are not necessarily deployable in classified, contested environments. Cloud-hosted commercial models require connectivity the Army may not possess in denied, degraded, intermittent, or limited (DDIL) conditions — and raise spillage risk. A headquarters that depends on a commercial API to produce orders has introduced a logistics dependency as critical as water or fuel.",
      solutions: [
        "<strong>Identify the DDIL tool stack:</strong> maintain a documented inventory of which AI tools function in DDIL conditions, which require connectivity, and which are unsuitable for classified work. The S6 owns it; updated quarterly.",
        "<strong>Rehearse without tools:</strong> at least one planning exercise per semi-annual period without AI. The brigade will fight with paper maps, butcher block, and acetate when required — AI dependency is a single point of failure.",
        "<strong>Prefer accredited-environment models for sensitive work</strong> over commercial API endpoints. Hardened on-premise or edge-deployable models are the operational objective for combat."
      ]
    },
    {
      title: "Adversary Adoption",
      problem: "Russian and Chinese forces face the same cognitive-time problem. Both the PLA and the Russian General Staff have publicly prioritized AI-enabled command-and-control. If they integrate AI into their planning cycles faster or more effectively, the tempo advantage demonstrated at JRTC evaporates.",
      solutions: [
        "<strong>Treat adoption as a race the U.S. must win on governance.</strong> Relative speed of adoption — and more importantly, relative discipline of governance — will shape which force presents faster, better-synchronized problems to the other at the start of the next conflict.",
        "<strong>Submit lessons learned to CALL and CADD</strong> for FM 5-0 revision consideration. The Army should not wait a decade to codify what the operating force is generating now."
      ]
    }
  ],

  bestPractices: [
    { title: "Designate AI Integrator(s)", text: "Assign AS3(s) to manage knowledge bank organization, prompt library development and certification, group chat architecture and access controls, timeline enforcement, and consistency checking across successive products." },
    { title: "Build a Doctrine-First Knowledge Bank", text: "Before the exercise: upload all relevant doctrine, SOPs, templates, and orders with clear naming conventions; validate searchability. The knowledge bank is the foundation of doctrinal compliance." },
    { title: "Develop and Train Role-Specific Bots", text: "S2 Bot (IPOE, running estimates, PIR/CCIR, enemy COADEV) · S3 Bot (maneuver and air planning, OPORD production, timelines) · S4/SPO Bot (logistics analysis, sustainment forecasting) · FSO Bot (fires planning and effects integration) · Engineer Bot (obstacle analysis, mobility corridors, obstacle effects)." },
    { title: "Use Group Chats for Real-Time Collaboration", text: "All staff see AI drafts in real time; edits and comments visible to the team; validation status transparent; archived conversations provide continuity and audit trail; the commander has visibility into planning progress." },
    { title: "Compress Early MDMP Steps", text: "Focus AI heavily on Steps 1–2: WARNO #1 and timelines in minutes, decision-linked CCIR, commander guidance synthesized into structured inputs. This front-loads parallel COA development downstream — the greatest time savings and decision impact." },
    { title: "Measure Key Metrics", text: "Time to WARNO #1 and subsequent WARNOs, doctrinal and format errors, staff-ready outputs (% requiring minimal revision), planning cycle compression, staff satisfaction and confidence (see the Metrics tab)." },
    { title: "Publish an AI-in-MDMP Annex to the Brigade PSOP", text: "Define inputs, specify expected outputs, establish validation criteria, describe chat room responsibilities, include the prompt library and bot specifications. The annex becomes the playbook for replicating the capability." },
    { title: "Establish Product-Governance Discipline Before Adoption", text: "A single source of truth, a version-control process, and named validators are the conditions under which AI integration succeeds. Build the governance first. Field the tools second." },
    { title: "Rehearse for Degraded Operations", text: "Assume connectivity will fail. A staff that cannot plan without its AI tools has not adopted AI; it has become dependent on it. Rehearse manual MDMP at least semi-annually." },
    { title: "Integrate AI Governance into PME", text: "Field-grade officers cannot govern tools they do not understand. Career courses and CGSC require block instruction on prompt discipline, output validation, version control, and governance failure modes." }
  ],

  rightLooksLike: [
    "Doctrinal foundation with enforced standards — comprehensive doctrinal base plus HHQ OPORD uploaded",
    "Role-specific bot orchestration with continuous collaboration — specialized bots for receipt-of-mission briefs, WARNORDs, OPORD paragraphs, reconnaissance guidance, AASLT planning, commander's guidance synthesis",
    "Group chat functionality for real-time collaboration among assistants, staff officers, and commander",
    "Decision-linked products with transparent traceability — running estimates, mission/problem statements, CCIR/FFIR tied directly to decisions and phase transitions",
    "Every assumption paired with a corresponding RFI and LTIOV to drive rapid conversion to facts",
    "Disciplined placeholders for unknown grids, AO boundaries, H-hour, HLZ/PZ locations, and sensitive control measures"
  ],

  wrongLooksLike: [
    "Inconsistent terminology and formatting — different staff sections using different formats or conventions, creating confusion and errors in disseminated products",
    "Allowing AI to fabricate unknown data (grids, unit locations, timelines, enemy dispositions) to 'complete' products",
    "Not validating AI outputs against source documents (higher HQ orders, doctrine)",
    "Siloed planning — AI used in isolation by individual staff officers without shared workspace or continuous collaboration",
    "Generating discrete AI outputs for individual use rather than building shared products in group chat",
    "Failing to involve commander and key staff in real-time validation of AI-generated guidance",
    "Not conducting quality checks before disseminating AI-generated products",
    "Accepting 'good enough' outputs without pushing for doctrinal precision"
  ],

  doNots: [
    { title: "Do Not Fabricate Data", text: "Never allow your LLM to invent grid coordinates, casualty estimates, supply quantities, or other quantitative information. Use placeholders (e.g., \"[GRID TBD]\") and require SME validation before publication." },
    { title: "Do Not Ignore Flagged Inconsistencies", text: "When an agent flags errors (mismatched labels, spelling, DTG errors), correct them immediately. Do not publish products with known inconsistencies." },
    { title: "Do Not Use Inconsistent Terminology", text: "Establish standard terminology for units, locations, control measures, and timelines. Ensure all LLM outputs use consistent phrasing." },
    { title: "Do Not Skip Knowledge Bank Preparation", text: "Avoid uploading doctrine during the exercise. Prepare in advance — a force multiplier that pays dividends throughout the planning cycle." },
    { title: "Do Not Treat AI as a Replacement for SME Judgment", text: "An LLM ecosystem accelerates and improves planning; it does not replace human expertise. SMEs must validate all outputs, especially those involving numbers, ROE, and risk." },
    { title: "Do Not Publish Without Validation", text: "Do not release AI-generated products without SME review and sign-off. Non-negotiable. The credibility of the plan depends on the quality of the products." },
    { title: "Do Not Lose the Plan Profile", text: "Maintain a detailed 'plan profile' capturing unit locations, tasks, purposes, and timelines. Carry it from one group chat to the next for consistency and rapid branch/sequel development." },
    { title: "Do Not Abandon Doctrine", text: "Do not use AI to circumvent doctrinal requirements. All AI outputs should cite doctrinal sources. AI should enhance MDMP, not replace it." },
    { title: "Do Not Confuse Polish with Correctness", text: "Polished output that is subtly wrong is the most dangerous failure mode in an AI-enabled headquarters. Treat every output as a draft until a qualified human validates it against source documents." },
    { title: "Do Not Allow AI Authorship of Commander's Intent or Approval-Authority Products", text: "AI does not generate commander's intent, select the decisive operation, accept risk, authorize fires, or sign orders. Command responsibility is the function for which an officer is commissioned. Codify these limits in unit SOPs before operational pressure tests them." },
    { title: "Do Not Depend on a Commercial API in Combat", text: "A headquarters that depends on a commercial API to produce orders has introduced a logistics dependency as critical as water or fuel. The relevant question is not whether AI works — it is whether it works when the enemy is actively trying to prevent it from working." }
  ]
};
