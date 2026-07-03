/* ==========================================================================
   MDMP Workflow Engine — multi-agent orchestration of the 3MBDE bot roster.

   The S3 BOT is the primary orchestrating agent (the document places the
   AI Integrator role in the S3 cell): it sequences the pipeline, extracts
   the knowledge bank, drafts WARNOs and the OPORD shell, and enforces
   consistency. Functional specialists (S2/S4/FSO/ENG), the Red Team agent,
   and the XO Coach run under its orchestration.

   Inputs (both required before the batch runs):
     - KNOWLEDGE BANK: higher OPORDs, WARNORDs, annexes/appendices, FRAGOs
     - CDR'S INTENT WORKSHEET: human-authored purpose, key tasks, end state

   The pipeline runs the entire batch and PAUSES for human interaction:
     - Phase 3: COA development (hard human gate — humans at the map)
     - Phase 6: named-validator sign-off before export

   Two engines: Simulation (offline/DDIL-safe, [TBD] skeletons) and Live
   (browser-direct Anthropic Messages API with the user's key).
   ========================================================================== */

const ENGINE = (function () {
  "use strict";

  /* ---------- Shared governance preamble (the Five Principles, as a system prompt) ---------- */
  const GOVERNANCE = `You are an AI staff-augmentation agent supporting a U.S. Army brigade staff during MDMP, operating under the brigade's Five Fundamental Principles of AI-Enabled Staff Work:
1. HUMAN-IN-THE-LOOP: You augment, never replace, professional military judgment. The human planner is the tactical author. You organize, format, synthesize, and challenge; you do not command, decide, or accept risk.
2. STAFF AUGMENTATION ONLY: You never author commander's intent, select the decisive operation, authorize fires, accept risk, or sign orders. When the commander's intent worksheet is provided, incorporate it VERBATIM — it is human-authored command thought; preserve and formalize it, never rewrite it.
3. ZERO FABRICATION TOLERANCE: Never invent MGRS grids, DTGs, unit designations, task organization relationships, fires coordination data, casualty estimates, or supply quantities. If information is unavailable, write [TBD] and note the RFI. Every assumption must be paired with an RFI and LTIOV.
4. CITE SOURCES: Tag factual claims to the knowledge bank document and paragraph provided (e.g., "source: HHQ OPORD, para 3.b"). If you cannot cite a source, mark the claim as UNVERIFIED.
5. FORMAT BEFORE CONTENT: Follow the requested output format exactly. Do not overproduce — generate only the product requested.
Every output you produce is a DRAFT until a named human validator signs it.`;

  /* ---------- Bot roster (S3 Bot = primary orchestrator) ---------- */
  const BOTS = {
    s3: {
      id: "s3", label: "S3 BOT · ORCHESTRATOR", roleName: "S3 Operations",
      persona: "You are the S3 Bot, the brigade's PRIMARY ORCHESTRATING AGENT (the AI Integrator role resides in the S3 cell). You sequence the planning pipeline, manage timelines and 1/3-2/3 discipline, synthesize commander guidance and the intent worksheet into structured inputs, enforce OPORD/WARNO structure, task the functional specialist bots, and flag inconsistencies across successive products. You own maneuver and air planning and orders production."
    },
    s2: {
      id: "s2", label: "S2 BOT", roleName: "S2 Intelligence",
      persona: "You are the S2 Bot, specialized in IPOE, running estimates, PIR/CCIR development, and enemy course-of-action development. You preserve analyst judgment — you draft, the S2 validates."
    },
    s4: {
      id: "s4", label: "S4/SPO BOT", roleName: "S4 Sustainment",
      persona: "You are the S4/SPO Bot, specialized in logistics analysis and sustainment forecasting: consumption forecasts, supply triggers, and route-risk assessments by phase."
    },
    fso: {
      id: "fso", label: "FSO BOT", roleName: "Fire Support Officer",
      persona: "You are the FSO Bot, focused on fires planning and effects integration: fires running estimates, shift matrices, and trigger logic. All fires products require FSO and maneuver-commander validation before any rehearsal."
    },
    eng: {
      id: "eng", label: "ENGINEER BOT", roleName: "Brigade Engineer",
      persona: "You are the Engineer Bot, specialized in obstacle analysis, mobility corridors, and obstacle effects (disrupt, turn, fix, block)."
    },
    redteam: {
      id: "redteam", label: "RED TEAM", roleName: "Red Team Agent",
      persona: "You are the Red Team Agent — a second, independent validator. You proof staff products for gaps, bad assumptions, date-time-group errors, MGRS errors, mismatched control-measure labels, non-standard phrasing, and doctrinal inconsistencies. You do NOT rewrite products; you return a numbered discrepancy list. Finding nothing wrong is a failure of effort — dig."
    },
    xocoach: {
      id: "xocoach", label: "XO COACH", roleName: "Executive Officer",
      persona: "You are the XO Coach — an experienced brigade executive officer. You generate pointed, adversarial questions across the warfighting functions that stress-test the plan. You enhance rigor without displacing judgment: a staff coach, not a staff commander. Frame each question so a specific staff section must answer with specifics."
    }
  };

  /* ---------- Pipeline definition ---------- */
  const STEPS = [
    {
      id: "extract", phase: 1, bot: "s3", product: "Knowledge Bank Extraction",
      validator: "S3", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: Markdown with exactly these H2 sections: Specified Tasks, Implied Tasks, Essential Tasks (Recommended), Constraints & Restraints, Command Relationships, Control Measures, Critical Deadlines, RFIs. Bullet lists only. Cite the knowledge bank document and paragraph for each item where possible; mark unknowns [TBD].

As the orchestrating S3 Bot, analyze ALL knowledge bank documents below for ${c.unit} and extract the mission-analysis factors into the format above. Reconcile the documents against each other and flag any contradictions between them under RFIs. Do not generate a WARNO or any other product.

HIGHER HQ: ${c.hhq}
RECEIPT OF MISSION: ${c.receiptDtg}
--- COMMANDER'S INTENT WORKSHEET (human-authored, verbatim) ---
${c.intentText}
--- KNOWLEDGE BANK ---
${c.kbText}`,
      sim: (c) => `## Specified Tasks\n- [Extract from ${c.kbTitles[0] || "HHQ OPORD"} paragraph 3 — TBD pending staff read] (source: ${c.kbTitles[0] || "[TBD]"})\n- ${c.unit} conducts operations per higher intent (source: ${c.kbTitles[0] || "HHQ order"}, para [TBD])\n\n## Implied Tasks\n- Establish planning timeline IAW 1/3–2/3 rule from receipt ${c.receiptDtg}\n- Nest all products under the CDR's intent worksheet end state: "${trunc1(c.intent.endState) || "[end state TBD]"}"\n\n## Essential Tasks (Recommended)\n- Derived from CDR key tasks: ${trunc1(c.intent.keyTasks) || "[TBD — requires S3 validation]"}\n\n## Constraints & Restraints\n- [TBD — extract from coordinating instructions across ${c.kbTitles.length} knowledge bank document(s)]\n\n## Command Relationships\n- ${c.unit} under ${c.hhq} [relationship TBD — verify against Annex A]\n\n## Control Measures\n- [GRID TBD] — AO boundaries pending overlay\n\n## Critical Deadlines\n- OPORD publish NLT ${c.publishDtg} (1/3 point)\n\n## RFIs\n1. Confirm task organization effective DTG (LTIOV: [TBD])\n2. Reconcile any WARNORD/annex contradictions with base OPORD (LTIOV: [TBD])`
    },
    {
      id: "warno1", phase: 1, bot: "s3", product: "WARNO #1 (Draft)",
      validator: "S3", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: Doctrinally formatted WARNO IAW FM 5-0: heading (unit, DTG, WARNO number), Situation (1), Mission (2 — higher mission and intent incorporated verbatim where provided), Execution (3 — initial timeline and instructions; include the commander's expanded purpose VERBATIM from the worksheet), Sustainment (4), Command and Signal (5). Use [TBD] for all unknown grids, task org, and times. Keep under 450 words.

Using the extraction and the knowledge bank, draft WARNO #1 for ${c.unit}, nested under ${c.hhq}. Receipt of mission ${c.receiptDtg}; brigade OPORD publish NLT ${c.publishDtg}. Do not invent data.

--- CDR'S INTENT WORKSHEET (verbatim) ---
${c.intentText}
--- EXTRACTION ---
${c.products.extract || "[none]"}
--- KNOWLEDGE BANK (extracts) ---
${trunc(c.kbText)}`,
      sim: (c) => `WARNING ORDER #1 — ${c.unit}\nDTG: ${c.receiptDtg}\nReferences: ${c.kbTitles.join("; ") || "[HHQ order TBD]"}\n\n1. SITUATION. See ${c.hhq} OPORD paragraph 1. Enemy and friendly situation [TBD pending S2 refinement].\n\n2. MISSION. ${c.unit} [mission statement TBD — nested verbatim under higher mission and intent upon commander approval].\n\n3. EXECUTION.\n   Commander's expanded purpose (verbatim): ${c.intent.purpose || "[TBD]"}\n   a. Planning timeline: Receipt of mission ${c.receiptDtg}. Brigade OPORD publish NLT ${c.publishDtg} (1/3 point). Mission analysis brief [TBD]. COA DEV/analysis [TBD].\n   b. Movement/reconnaissance instructions: [TBD].\n   c. CCIR: Initial CCIR pending commander's guidance.\n\n4. SUSTAINMENT. Current sustainment posture per LOGSTAT. No change until OPORD.\n\n5. COMMAND AND SIGNAL. No change. Acknowledge receipt.\n\nDRAFT — NOT VALID UNTIL S3 SIGN-OFF.`
    },
    {
      id: "timeline", phase: 1, bot: "s3", product: "Planning Timeline (1/3–2/3)",
      validator: "S3", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: A markdown table with columns DTG | Event | Owner | Notes, followed by a one-line statement of the brigade 1/3 window. All computed DTGs must derive arithmetically from receipt ${c.receiptDtg} and publish NLT ${c.publishDtg}; if either input is not a parseable DTG, mark computed rows [TBD] rather than guessing.

As the orchestrating S3 Bot, generate the brigade planning timeline for ${c.unit}: WARNO #1 within one hour of receipt, mission analysis brief, WARNO #2, COA development (HUMAN-LED — no AI authorship), COA analysis/wargame, COA decision + WARNO #3, orders production with voice-to-doctrine support, OPORD publish, and confirmation brief windows preserving the subordinate 2/3.`,
      sim: (c) => `| DTG | Event | Owner | Notes |\n|---|---|---|---|\n| ${c.receiptDtg} | Receipt of Mission | S3 | Knowledge bank verified: ${c.kbTitles.length} document(s) |\n| ${c.receiptDtg} +1HR | WARNO #1 released | S3 | AI-drafted, S3-validated |\n| [TBD] | Mission Analysis Brief | XO | Staff enters with working products |\n| [TBD] | WARNO #2 | S3 | Includes approved mission statement, CCIR |\n| [TBD] | COA Development | CDR/S3/Plans | HUMAN-LED — AI takes a back seat |\n| [TBD] | COA Analysis / Wargame | XO | XO Coach questions walked into sync meeting |\n| [TBD] | COA Decision + WARNO #3 | CDR | Commander decides |\n| [TBD] | Orders Production | Staff | Voice-to-doctrine first draft ~30 min |\n| ${c.publishDtg} | OPORD PUBLISH (NLT) | S3 | 1/3 point — battalion 2/3 protected |\n\nBrigade 1/3 window: ${c.receiptDtg} → ${c.publishDtg}. Compute exact interior DTGs with the Timeline Calculator tab.`
    },
    /* ---------- Phase 2: parallel running estimates ---------- */
    {
      id: "est_s2", phase: 2, bot: "s2", product: "S2 Running Estimate + CCIR",
      validator: "S2 section chief", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: H2 sections: Facts, Assumptions (each with paired RFI and LTIOV), Enemy Situation & Capabilities, Terrain & Weather Effects, Recommended PIR, Recommended CCIR Linkage (tie each PIR to a commander decision or phase transition — use the CDR intent worksheet's key tasks and end state as the decision anchors). Mark all unknowns [TBD]. Do NOT develop friendly COAs.

Draft the S2 running estimate for ${c.unit} from the knowledge bank and extraction below.

--- CDR'S INTENT WORKSHEET (verbatim) ---\n${c.intentText}\n--- KNOWLEDGE BANK ---\n${c.kbText}\n--- EXTRACTION ---\n${c.products.extract || ""}`,
      sim: (c) => `## Facts\n- Knowledge bank received ${c.receiptDtg}: ${c.kbTitles.join("; ") || "[none]"}\n\n## Assumptions\n- A1: Enemy disposition per ${c.hhq} Annex B remains current. RFI: request updated INTSUM. LTIOV: [TBD]\n\n## Enemy Situation & Capabilities\n- [TBD — extract from Annex B; no enemy data fabricated]\n\n## Terrain & Weather Effects\n- [TBD — pending MCOO and light/weather data]\n\n## Recommended PIR\n1. Will enemy commit reserve before [PHASE TBD]?\n2. [TBD]\n\n## Recommended CCIR Linkage\n- PIR 1 → CDR decision: commit of brigade reserve, anchored to key task: ${trunc1(c.intent.keyTasks) || "[TBD]"}.`
    },
    {
      id: "est_s3", phase: 2, bot: "s3", product: "S3 Running Estimate",
      validator: "S3", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: H2 sections: Facts, Assumptions (paired RFI + LTIOV), Friendly Forces & Task Organization, Maneuver Considerations, Recommended FFIR. Mark unknowns [TBD]. Do NOT propose courses of action — COA development is human-led.

Draft the S3 running estimate for ${c.unit}.\n--- CDR'S INTENT WORKSHEET (verbatim) ---\n${c.intentText}\n--- KNOWLEDGE BANK ---\n${c.kbText}\n--- EXTRACTION ---\n${c.products.extract || ""}`,
      sim: (c) => `## Facts\n- ${c.unit} planning window: ${c.receiptDtg} to ${c.publishDtg}\n\n## Assumptions\n- A1: Task organization per current MTOE remains effective. RFI: confirm attachments/detachments with ${c.hhq} G3. LTIOV: [TBD]\n\n## Friendly Forces & Task Organization\n- [TBD — verify against Annex A; no unit designations fabricated]\n\n## Maneuver Considerations\n- All maneuver options must achieve the CDR end state (verbatim): ${trunc1(c.intent.endState) || "[TBD]"}\n- COA development reserved for commander, plans officer, and S3 at the map.\n\n## Recommended FFIR\n1. Loss of [key platform/capability TBD] below [threshold TBD]\n2. [TBD]`
    },
    {
      id: "est_s4", phase: 2, bot: "s4", product: "S4 Sustainment Estimate",
      validator: "S4 / SPO", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: H2 sections: Facts, Assumptions (paired RFI + LTIOV), Sustainment Forecast by Phase, Supply Triggers, Route Risk Assessment, Shortfalls & Recommendations. Never invent supply quantities — use [TBD] where LOGSTAT data is not provided.

Draft the S4 sustainment estimate for ${c.unit}.\n--- KNOWLEDGE BANK ---\n${c.kbText}\n--- LOGSTAT / SUSTAINMENT DATA PROVIDED ---\n${c.logstat || "[none provided — use doctrinal planning factors and mark quantities TBD]"}`,
      sim: (c) => `## Facts\n- No LOGSTAT export provided to this session.\n\n## Assumptions\n- A1: CSR remains at currently published rates. RFI: confirm CSR with ${c.hhq} G4. LTIOV: [TBD]\n\n## Sustainment Forecast by Phase\n- Phase [TBD]: CL III/V consumption [TBD — requires LOGTAK/GCSS-A export]\n\n## Supply Triggers\n- Trigger: CL V below [TBD]% → emergency resupply request\n\n## Route Risk Assessment\n- MSR [TBD]: risk [TBD] — pending route status\n\n## Shortfalls & Recommendations\n- Ingest LOGSTAT export to generate evidence-backed forecasts (quantities not fabricated).`
    },
    {
      id: "est_fso", phase: 2, bot: "fso", product: "Fires Running Estimate",
      validator: "FSO + maneuver CDR", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: H2 sections: Facts, Assumptions (paired RFI + LTIOV), Available Fires Assets, Fires Considerations by Phase, Draft Trigger Logic (mark every grid [GRID TBD]), Coordination Requirements. Never fabricate TRPs, range fans, or grids.

Draft the fires running estimate for ${c.unit}.\n--- KNOWLEDGE BANK ---\n${c.kbText}\n--- EXTRACTION ---\n${c.products.extract || ""}`,
      sim: (c) => `## Facts\n- Fires assets per ${c.hhq} Annex D: [TBD — not fabricated]\n\n## Assumptions\n- A1: DS battalion remains DS to ${c.unit}. RFI: confirm with ${c.hhq} FSCOORD. LTIOV: [TBD]\n\n## Available Fires Assets\n- [TBD — verify against Annex D]\n\n## Fires Considerations by Phase\n- Phase [TBD]: priority of fires [TBD]\n\n## Draft Trigger Logic\n- Shift from [GRID TBD] to [GRID TBD] when [condition TBD] — REQUIRES FSO + maneuver commander validation against TRPs and range fans before any rehearsal.\n\n## Coordination Requirements\n- A2C2 deconfliction for [TBD]; FSCM review at COA decision.`
    },
    {
      id: "est_eng", phase: 2, bot: "eng", product: "Engineer Running Estimate",
      validator: "Brigade Engineer", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: H2 sections: Facts, Assumptions (paired RFI + LTIOV), Mobility Corridors, Obstacle Intelligence, Recommended Obstacle Effects (disrupt/turn/fix/block) by area, Engineer Task Considerations. Mark all grids [GRID TBD].

Draft the engineer running estimate for ${c.unit}.\n--- KNOWLEDGE BANK ---\n${c.kbText}\n--- EXTRACTION ---\n${c.products.extract || ""}`,
      sim: (c) => `## Facts\n- Engineer task organization: [TBD — verify Annex A]\n\n## Assumptions\n- A1: Route clearance assets available D-day. RFI: confirm with ${c.hhq} ENCOORD. LTIOV: [TBD]\n\n## Mobility Corridors\n- [TBD — pending MCOO]\n\n## Obstacle Intelligence\n- [TBD — no obstacle data fabricated]\n\n## Recommended Obstacle Effects\n- Area [TBD]: TURN enemy into EA [TBD]\n\n## Engineer Task Considerations\n- Breach/gap-crossing requirement [TBD] drives task organization timing.`
    },
    {
      id: "redteam1", phase: 2, bot: "redteam", product: "Red Team Proof — Mission Analysis Products",
      validator: "XO", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: A numbered discrepancy list. Each item: [PRODUCT] — [SEVERITY: CRITICAL/MAJOR/MINOR] — finding — recommended correction. End with a one-line completeness verdict. Do not rewrite the products.

Red-team the following draft products for ${c.unit}: gaps, bad assumptions, DTG errors, inconsistencies between products, missing RFI/LTIOV pairings, fabricated-looking data (any specific grid, quantity, or unit designation not traceable to the knowledge bank), nesting failures against the CDR intent worksheet, and doctrinal noncompliance.

--- CDR'S INTENT WORKSHEET ---\n${c.intentText}\n--- WARNO #1 ---\n${c.products.warno1 || ""}\n--- TIMELINE ---\n${c.products.timeline || ""}\n--- S2 ESTIMATE ---\n${c.products.est_s2 || ""}\n--- S3 ESTIMATE ---\n${c.products.est_s3 || ""}\n--- S4 ESTIMATE ---\n${c.products.est_s4 || ""}\n--- FIRES ESTIMATE ---\n${c.products.est_fso || ""}\n--- ENGINEER ESTIMATE ---\n${c.products.est_eng || ""}`,
      sim: () => `1. [WARNO #1] — MAJOR — Mission statement is [TBD]; WARNO cannot be released without an approved mission statement. Recommend commander approval before release.\n2. [ALL ESTIMATES] — MAJOR — Multiple assumptions lack LTIOV. Recommend S3 assign LTIOV to every RFI before the MA brief.\n3. [TIMELINE] — MINOR — Interior milestone DTGs are [TBD]; compute with the Timeline Calculator and republish.\n4. [CROSS-PRODUCT] — MINOR — Verify phase naming is identical across S2/S4/FSO estimates and nested against the CDR end state before the MA brief.\n\nVERDICT: Products are structurally sound drafts; no fabricated data detected; not releasable until named validators sign.`
    },
    /* ---------- Phase 4 (Phase 3 is the human gate) ---------- */
    {
      id: "xoquestions", phase: 4, bot: "xocoach", product: "XO Coach — Wargame Questions",
      validator: "XO", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: Numbered questions grouped under H2 headings by warfighting function (Intelligence, Movement & Maneuver, Fires, Sustainment, Protection, C2). 2-4 questions each. Each question must name the staff section that owes the answer and reference a specific element of the COA, an estimate, or the CDR intent worksheet.

The commander's staff developed this course of action (HUMAN-authored — do not modify or judge its selection). Generate adversarial wargame questions that stress-test it against the commander's intent, including timing failures (e.g., what happens if the main effort is 30 minutes early/late) and passage-of-lines vulnerabilities.

--- CDR'S INTENT WORKSHEET ---\n${c.intentText}\n--- HUMAN COA ---\n${c.coa}\n--- RUNNING ESTIMATES SUMMARY ---\nS2: ${trunc(c.products.est_s2)}\nS4: ${trunc(c.products.est_s4)}\nFIRES: ${trunc(c.products.est_fso)}`,
      sim: (c) => `## Intelligence\n1. S2: What indicator confirms the enemy reserve has committed, and is a collection asset tasked against it with an LTIOV that beats the decision point?\n2. S2: If the COA's assumption about enemy disposition is wrong, which of the CDR's key tasks (${trunc1(c.intent.keyTasks) || "[TBD]"}) fails first?\n\n## Movement & Maneuver\n3. S3: If the main effort arrives 30 minutes early at [objective TBD], is the fires shift trigger condition-based or time-based — and who owns the call?\n4. S3: Where exactly does FPOL occur, and which control measures deconflict passing/stationary units?\n\n## Fires\n5. FSO: Can the shift matrix survive a comms-degraded environment — what is the backup trigger?\n\n## Sustainment\n6. S4: Which phase consumes CL V fastest, and does the trigger fire early enough given route risk?\n\n## Protection\n7. ADA: What is the RED AIR response posture during the most exposed phase?\n\n## C2\n8. S6: Where does C2 transfer between phases, and does the end state ("${trunc1(c.intent.endState) || "[TBD]"}") remain achievable if the PACE plan degrades at that seam?`
    },
    {
      id: "redteam2", phase: 4, bot: "redteam", product: "Red Team — COA Gap Analysis",
      validator: "XO", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: Numbered list. Each item: [SEVERITY: CRITICAL/MAJOR/MINOR] — gap or inconsistency between the COA, the CDR intent worksheet, and the running estimates — recommended staff action. Do not evaluate whether the COA is a good plan; identify only gaps, unsourced data, nesting failures, and synchronization risks.

Analyze the HUMAN-authored COA against the commander's intent and the running estimates for ${c.unit}.

--- CDR'S INTENT WORKSHEET ---\n${c.intentText}\n--- HUMAN COA ---\n${c.coa}\n--- ESTIMATES ---\nS2: ${trunc(c.products.est_s2)}\nS3: ${trunc(c.products.est_s3)}\nS4: ${trunc(c.products.est_s4)}\nFIRES: ${trunc(c.products.est_fso)}\nENG: ${trunc(c.products.est_eng)}`,
      sim: () => `1. [MAJOR] — COA phases are not yet mapped to the S4 sustainment forecast; consumption by phase is [TBD]. Recommend S4 align forecast to COA phasing before wargame.\n2. [MAJOR] — Fires trigger logic in the estimate contains [GRID TBD] placeholders; wargame cannot validate shifts until FSO populates TRPs.\n3. [MINOR] — Confirm every CDR key task from the intent worksheet maps to a task in the COA; flag any orphaned key task.\n4. [MINOR] — Engineer obstacle effects not yet tied to COA engagement areas.`
    },
    /* ---------- Phase 5 ---------- */
    {
      id: "opord", phase: 5, bot: "s3", product: "OPORD Draft (Para 1–3 Shell)",
      validator: "Section chiefs → CDR signs", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: OPORD paragraphs 1 (Situation), 2 (Mission) and 3 (Execution) IAW FM 5-0. Paragraph 3 Commander's Intent must reproduce the CDR intent worksheet VERBATIM under the label "Commander's Intent (CDR-provided, verbatim):" — you formalize command thought, you never author it; if the worksheet is empty, write [CDR PROVIDES — NON-DELEGABLE]. Then: concept of operations by phase, scheme of maneuver, scheme of fires, one-line task statements to subordinate units (use [UNIT TBD] where task org unconfirmed), coordinating instructions with CCIR, and an execution timeline. Use [TBD]/[GRID TBD] for all unknowns. This is a DRAFT shell — the commander approves the mission statement and signs the order.

As the orchestrating S3 Bot, assemble the OPORD draft for ${c.unit} from the human COA, the intent worksheet, and validated staff products.

--- CDR'S INTENT WORKSHEET (verbatim) ---\n${c.intentText}\n--- HUMAN COA ---\n${c.coa}\n--- WARNO #1 ---\n${trunc(c.products.warno1)}\n--- EXTRACTION ---\n${trunc(c.products.extract)}\n--- ESTIMATES ---\nS2: ${trunc(c.products.est_s2)}\nS3: ${trunc(c.products.est_s3)}\nS4: ${trunc(c.products.est_s4)}\nFIRES: ${trunc(c.products.est_fso)}\nENG: ${trunc(c.products.est_eng)}\n--- WARGAME OUTPUTS ---\n${trunc(c.products.xoquestions)}\n${trunc(c.products.redteam2)}`,
      sim: (c) => `OPORD [NUMBER TBD] — ${c.unit}\nReferences: ${c.kbTitles.join("; ") || "[TBD]"}; map sheets [TBD]. Time zone: [TBD].\n\n1. SITUATION.\n   a. Enemy: per S2 running estimate and ${c.hhq} Annex B [details TBD].\n   b. Friendly: ${c.hhq} mission and intent [incorporate verbatim — TBD].\n   c. Attachments/Detachments: [TBD — verify Annex A].\n\n2. MISSION. [Approved mission statement — CDR approval required.]\n\n3. EXECUTION.\n   Commander's Intent (CDR-provided, verbatim):\n${c.intentText ? indent(c.intentText) : "   [CDR PROVIDES — NON-DELEGABLE]"}\n   a. Concept of Operations: Derived from commander-selected COA — ${firstLine(c.coa)} [phases TBD].\n   b. Scheme of Maneuver: [Built from human COA — populate control measures; grids TBD].\n   c. Scheme of Fires: [FSO validates triggers against TRPs and range fans before rehearsal].\n   d. Tasks to Subordinate Units:\n      (1) [UNIT TBD]: [one-line task and purpose].\n      (2) [UNIT TBD]: [one-line task and purpose].\n   e. Coordinating Instructions: CCIR per approved list; every assumption carries an RFI + LTIOV; execution timeline aligned to phases.\n\nDRAFT SHELL — section chiefs validate; commander approves the mission statement and signs. AI incorporated the CDR's intent verbatim and did not select the decisive operation or accept risk.`
    },
    {
      id: "redteam3", phase: 5, bot: "redteam", product: "Final Consistency Check",
      validator: "XO", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: Numbered discrepancy list ([SEVERITY] — finding — correction), then an H2 "Release Checklist" with the named validator for each product class (mission statement/intent → Commander; fires → FSO + maneuver CDR; estimates → WfF chiefs; all products → section-chief sign-off). Do not rewrite products.

Run the final consistency check across ALL products for ${c.unit} before publication: mismatched labels and phase names, inconsistent DTGs, tasks in the OPORD not supported by an estimate, any deviation between the OPORD's Commander's Intent text and the worksheet (it must be verbatim), [TBD]s that must be resolved before release vs. acceptable RFIs, and any unvalidated fabrication risk.

--- CDR'S INTENT WORKSHEET (verbatim source) ---\n${c.intentText}\n--- OPORD DRAFT ---\n${c.products.opord || ""}\n--- WARNO #1 ---\n${trunc(c.products.warno1)}\n--- TIMELINE ---\n${trunc(c.products.timeline)}\n--- COA ---\n${trunc(c.coa)}`,
      sim: (c) => `1. [CRITICAL] — Mission statement remains [TBD]: OPORD is not releasable until the commander approves the mission statement.\n2. [MAJOR] — Tasks to subordinate units contain [UNIT TBD]; resolve task organization against Annex A before publication.\n3. [MINOR] — Verify the OPORD Commander's Intent matches the worksheet verbatim (${c.intentText ? "worksheet present — character-match before release" : "worksheet EMPTY — intent missing"}).\n4. [MINOR] — Ensure WARNO #1 timeline DTGs match the OPORD execution timeline after final computation.\n\n## Release Checklist\n- Mission statement & commander's intent → COMMANDER approval\n- Fires products → FSO + maneuver commander validation (before rehearsal)\n- Running estimates → warfighting-function chiefs sign for accuracy\n- Every fact → cross-referenced: units vs Annex A, grids vs ATAK, DTGs vs timeline, enemy vs Annex B\n- All products → section-chief sign-off, then CDR signs the order`
    }
  ];

  const PHASES = {
    1: { title: "Phase 1 — Receipt of Mission", note: "S3 Bot extracts the knowledge bank, drafts WARNO #1, and builds the timeline." },
    2: { title: "Phase 2 — Mission Analysis", note: "S3 Bot tasks the functional specialists; running estimates draft in parallel; Red Team proofs the batch." },
    3: { title: "Phase 3 — COA Development", note: "DOCTRINAL BOUNDARY. Humans at the map. The pipeline pauses here and will not proceed without a human-authored COA." },
    4: { title: "Phase 4 — COA Analysis / Wargame", note: "XO Coach stress-tests the human COA against the CDR's intent; Red Team runs gap analysis." },
    5: { title: "Phase 5 — Orders Production", note: "S3 Bot assembles the OPORD shell (CDR intent inserted verbatim); Red Team runs the final consistency check." },
    6: { title: "Phase 6 — Validation & Export", note: "Named validators sign each product class. Unsigned products export stamped DRAFT." }
  };

  function trunc(s) { return (s || "").slice(0, 2500); }
  function trunc1(s) { return (s || "").split("\n")[0].slice(0, 120); }
  function firstLine(s) { return (s || "").split("\n")[0].slice(0, 160); }
  function indent(s) { return s.split("\n").map((l) => "   " + l).join("\n"); }

  /* ---------- Live engine: Anthropic Messages API from the browser ---------- */
  async function callClaude(cfg, bot, userPrompt) {
    const body = {
      model: cfg.model,
      max_tokens: 8192,
      system: GOVERNANCE + "\n\n" + BOTS[bot].persona,
      messages: [{ role: "user", content: userPrompt }]
    };
    if (cfg.model.indexOf("haiku") === -1) body.thinking = { type: "adaptive" };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      let msg = "HTTP " + res.status;
      try { const e = await res.json(); msg = (e.error && e.error.message) || msg; } catch (_) { /* keep status */ }
      throw new Error(msg);
    }
    const data = await res.json();
    if (data.stop_reason === "refusal") throw new Error("Model declined the request (stop_reason: refusal).");
    return data.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  }

  function simulate(step, ctx) {
    return new Promise((resolve) => setTimeout(() => resolve(step.sim(ctx)), 500 + Math.random() * 700));
  }

  async function runStep(step, ctx, cfg, onState) {
    onState(step.id, "running");
    try {
      const out = cfg.mode === "live"
        ? await callClaude(cfg, step.bot, step.prompt(ctx))
        : await simulate(step, ctx);
      ctx.products[step.id] = out;
      onState(step.id, "complete", out);
    } catch (err) {
      onState(step.id, "error", String(err.message || err));
      throw err;
    }
  }

  /* Runs the requested phases in order; parallel steps within a phase run concurrently. */
  async function runPhases(phaseList, ctx, cfg, onState) {
    for (const ph of phaseList) {
      const steps = STEPS.filter((s) => s.phase === ph);
      const parallel = steps.filter((s) => s.parallel);
      for (const s of steps) {
        if (s.parallel) continue;
        const idx = steps.indexOf(s);
        const pendingParallel = parallel.filter((p) => steps.indexOf(p) < idx && !ctx._ran[p.id]);
        if (pendingParallel.length) {
          pendingParallel.forEach((p) => { ctx._ran[p.id] = true; });
          await Promise.all(pendingParallel.map((p) => runStep(p, ctx, cfg, onState)));
        }
        ctx._ran[s.id] = true;
        await runStep(s, ctx, cfg, onState);
      }
      const remaining = parallel.filter((p) => !ctx._ran[p.id]);
      if (remaining.length) {
        remaining.forEach((p) => { ctx._ran[p.id] = true; });
        await Promise.all(remaining.map((p) => runStep(p, ctx, cfg, onState)));
      }
    }
  }

  return { BOTS, STEPS, PHASES, runPhases };
})();

/* ==========================================================================
   Workflow Engine UI
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const KEY = "mdmp.engine";
  const DOC_TYPES = ["HHQ OPORD", "HHQ WARNORD", "ANNEX / APPENDIX", "FRAGO", "SOP / TEMPLATE", "OTHER"];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* private mode */ }
  }

  let state = Object.assign({
    unit: "3MBDE, 101st ABN DIV (AASLT)", hhq: "101st ABN DIV",
    receiptDtg: "", publishDtg: "", logstat: "",
    kb: [],                                    // knowledge bank documents
    intent: { purpose: "", keyTasks: "", endState: "", risk: "" },
    coa: "", mode: "sim", model: "claude-opus-4-8", apiKey: "",
    products: {}, signed: {}, stage: "idle"    // idle | ran12 | complete
  }, load());

  // Migrate v1 state (single order textarea) into the knowledge bank
  if (state.order && (!state.kb || !state.kb.length)) {
    state.kb = [{ id: "mig1", type: "HHQ OPORD", title: "Migrated higher order", text: state.order }];
    delete state.order;
    save(state);
  }
  if (!state.intent) state.intent = { purpose: "", keyTasks: "", endState: "", risk: "" };
  if (!state.kb) state.kb = [];

  let running = false;

  /* ---------- Readiness ---------- */
  function missingInputs() {
    const miss = [];
    if (!state.kb.length) miss.push("Knowledge Bank: add at least one higher OPORD or WARNORD");
    if (!(state.intent.purpose || "").trim()) miss.push("CDR's Intent Worksheet: expanded purpose");
    if (!(state.intent.endState || "").trim()) miss.push("CDR's Intent Worksheet: end state");
    return miss;
  }
  function phase12Done() {
    return ENGINE.STEPS.filter((s) => s.phase <= 2).every((s) => state.products[s.id]);
  }
  function allDone() {
    return ENGINE.STEPS.every((s) => state.products[s.id]);
  }

  /* ---------- Persistence of inputs ---------- */
  function persistInputs() {
    ["unit", "hhq", "receiptDtg", "publishDtg", "logstat"].forEach((k) => {
      const el = $("#eng_" + k);
      if (el) state[k] = el.value;
    });
    ["purpose", "keyTasks", "endState", "risk"].forEach((k) => {
      const el = $("#intent_" + k);
      if (el) state.intent[k] = el.value;
    });
    const m = $("#engMode"), md = $("#engModel"), kk = $("#engKey");
    if (m) state.mode = m.value;
    if (md) state.model = md.value;
    if (kk) state.apiKey = kk.value;
    save(state);
  }

  function intentText() {
    const i = state.intent;
    if (!(i.purpose || i.keyTasks || i.endState || i.risk)) return "";
    return "EXPANDED PURPOSE: " + (i.purpose || "[TBD]") +
      "\nKEY TASKS: " + (i.keyTasks || "[TBD]") +
      "\nEND STATE: " + (i.endState || "[TBD]") +
      (i.risk ? "\nRISK GUIDANCE: " + i.risk : "");
  }

  function kbText() {
    return state.kb.map((d) => "=== [" + d.type + "] " + d.title + " ===\n" + d.text).join("\n\n");
  }

  function ctx() {
    return {
      unit: state.unit || "[UNIT TBD]", hhq: state.hhq || "[HHQ TBD]",
      receiptDtg: state.receiptDtg || "[DTG TBD]", publishDtg: state.publishDtg || "[DTG TBD]",
      kbText: kbText() || "[No knowledge bank documents provided]",
      kbTitles: state.kb.map((d) => "[" + d.type + "] " + d.title),
      intent: state.intent, intentText: intentText() || "[No intent worksheet provided]",
      logstat: state.logstat, coa: state.coa,
      products: state.products, _ran: {}
    };
  }

  function cfg() {
    return { mode: state.mode, model: state.model, apiKey: (state.apiKey || "").trim() };
  }

  /* ---------- Render ---------- */
  function render() {
    const el = $("#view-engine");
    if (!el) return;
    el.innerHTML =
      "<h2>MDMP Workflow Engine — Multi-Agent Orchestration</h2>" +
      '<p class="lede">The <strong>S3 Bot is the primary orchestrating agent</strong> (the AI Integrator role lives in the S3 cell): it extracts the knowledge bank, tasks the functional specialists (S2/S4/FSO/ENG), sequences the Red Team and XO Coach, and assembles the orders. Load the <strong>Knowledge Bank</strong> and the <strong>CDR\'s Intent Worksheet</strong>, then run the full batch — the pipeline pauses and asks whenever human interaction is required.</p>' +

      renderKnowledgeBank() +
      renderIntentWorksheet() +
      renderMissionMeta() +
      renderEngineMode() +
      renderStatusBanner() +
      '<div id="engBoard">' + renderBoard() + "</div>";

    wire();
  }

  /* --- Knowledge Bank --- */
  function renderKnowledgeBank() {
    return '<h3 class="section-label">Step 1 · Knowledge Bank</h3>' +
      '<div class="callout">Upload the doctrine of this fight: higher OPORDs, WARNORDs, annexes/appendices, FRAGOs. The bots cite these documents and never fabricate what they don\'t contain. Use clear names per the brigade convention (e.g., <span class="mono">HHQ OPORD Division Level</span>).</div>' +
      '<div class="kb-add">' +
      '<div class="field"><label>Document Type</label><select id="kbType">' +
      DOC_TYPES.map((t) => '<option value="' + esc(t) + '">' + esc(t) + "</option>").join("") +
      "</select></div>" +
      '<div class="field"><label>Document Title</label><input id="kbTitle" placeholder="e.g., 101st ABN DIV OPORD 26-07"></div>' +
      '<div class="field" style="grid-column:1/-1"><label>Document Text</label><textarea id="kbBody" rows="5" placeholder="Paste the order / annex text here…"></textarea></div>' +
      '<div style="grid-column:1/-1; display:flex; gap:8px; flex-wrap:wrap; align-items:center">' +
      '<button class="btn primary" id="kbAdd">+ ADD TO KNOWLEDGE BANK</button>' +
      '<label class="btn" for="kbFile" style="cursor:pointer">⬆ UPLOAD .TXT / .MD FILES</label>' +
      '<input type="file" id="kbFile" accept=".txt,.md,.text" multiple style="display:none">' +
      "</div></div>" +
      '<div class="kb-list" id="kbList">' + renderKbList() + "</div>";
  }

  function renderKbList() {
    if (!state.kb.length) return '<div class="callout red"><strong>Knowledge bank empty.</strong> Add at least one higher OPORD or WARNORD before the batch can run.</div>';
    return '<div class="table-wrap"><table><thead><tr><th>Type</th><th>Title</th><th>Size</th><th></th></tr></thead><tbody>' +
      state.kb.map((d) =>
        '<tr><td class="mono">' + esc(d.type) + "</td><td><strong>" + esc(d.title) + '</strong></td><td class="mono">' + d.text.length.toLocaleString() + ' chars</td>' +
        '<td><button class="btn danger" data-kbdel="' + esc(d.id) + '">✗ REMOVE</button></td></tr>'
      ).join("") + "</tbody></table></div>";
  }

  /* --- CDR's Intent Worksheet --- */
  function renderIntentWorksheet() {
    const i = state.intent;
    return '<h3 class="section-label">Step 2 · CDR\'s Intent Worksheet</h3>' +
      '<div class="callout red"><strong>Human-authored — non-delegable.</strong> The commander (or a human capturing the commander\'s words) fills this worksheet. The bots incorporate it <em>verbatim</em>: they preserve and formalize command thought, they never write it.</div>' +
      '<div class="agent-card human-gate"><div style="padding:14px 16px">' +
      wsField("purpose", "Expanded Purpose (the WHY — beyond the mission statement)", i.purpose, 2, "e.g., Uncoil rapidly and shape the enemy below 50% combat power to enable the division's decisive operation…") +
      wsField("keyTasks", "Key Tasks (what the force must do to achieve the end state)", i.keyTasks, 2, "e.g., 1) Seize OBJ EAGLE 2) Prevent enemy reserve commitment north of PL COBRA 3) Retain bridgehead…") +
      wsField("endState", "End State (friendly / enemy / terrain / civil)", i.endState, 2, "e.g., Friendly: brigade consolidated on OBJ EAGLE… Enemy: unable to counterattack in battalion strength… Terrain: bridge intact…") +
      wsField("risk", "Risk Guidance & Priorities (optional)", i.risk, 2, "e.g., Accept risk in the north; priority of fires to the main effort; no acceptance of risk to the bridgehead.") +
      "</div></div>";
  }
  function wsField(k, label, val, rows, ph) {
    return '<div class="field"><label>' + esc(label) + '</label><textarea id="intent_' + k + '" rows="' + rows + '" placeholder="' + esc(ph) + '">' + esc(val || "") + "</textarea></div>";
  }

  /* --- Mission meta + engine mode --- */
  function renderMissionMeta() {
    const s = state;
    return '<h3 class="section-label">Step 3 · Mission Data</h3>' +
      '<div class="calc-inputs">' +
      metaField("unit", "Unit", s.unit) +
      metaField("hhq", "Higher HQ", s.hhq) +
      metaField("receiptDtg", "Receipt of Mission (DTG)", s.receiptDtg, "e.g., 030600Z JUL 26") +
      metaField("publishDtg", "OPORD Publish NLT (DTG)", s.publishDtg, "e.g., 040600Z JUL 26") +
      "</div>" +
      '<div class="field"><label>LOGSTAT / Sustainment Data (optional)</label><textarea id="eng_logstat" rows="2">' + esc(s.logstat || "") + "</textarea></div>";
  }
  function metaField(k, label, val, ph) {
    return '<div class="field"><label>' + esc(label) + '</label><input id="eng_' + k + '" value="' + esc(val || "") + '" placeholder="' + esc(ph || "") + '"></div>';
  }

  function renderEngineMode() {
    const s = state;
    return '<h3 class="section-label">Engine Mode</h3>' +
      '<div class="calc-inputs">' +
      '<div class="field"><label>Mode</label><select id="engMode">' +
      '<option value="sim"' + (s.mode === "sim" ? " selected" : "") + ">Simulation — offline / DDIL-safe skeletons</option>" +
      '<option value="live"' + (s.mode === "live" ? " selected" : "") + ">Live — Claude via Anthropic API</option>" +
      "</select></div>" +
      '<div class="field"><label>Model (live mode)</label><select id="engModel">' +
      opt("claude-opus-4-8", "Claude Opus 4.8 — complex reasoning / doctrinal analysis", s.model) +
      opt("claude-sonnet-5", "Claude Sonnet 5 — balanced", s.model) +
      opt("claude-haiku-4-5", "Claude Haiku 4.5 — light / routine formatting", s.model) +
      "</select></div>" +
      '<div class="field"><label>Anthropic API Key (live mode)</label><input type="password" id="engKey" value="' + esc(s.apiKey) + '" placeholder="sk-ant-..."></div>' +
      "</div>" +
      '<div class="callout red"><strong>OPSEC:</strong> Live mode sends your knowledge bank to a commercial API endpoint — the document\'s Challenge 6 applies. Do not paste classified or CUI material into live mode. The key is stored only in this browser\'s localStorage. Rehearse in Simulation mode for degraded operations.</div>';
  }
  function opt(v, label, cur) {
    return '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + esc(label) + "</option>";
  }

  /* --- Pipeline status banner + run control --- */
  function renderStatusBanner() {
    const miss = missingInputs();
    let cls = "", icon = "", title = "", body = "", button = "";

    if (running) {
      cls = ""; icon = "⚙"; title = "PIPELINE RUNNING";
      body = "The S3 Bot is orchestrating. Products appear below as each agent completes.";
    } else if (!phase12Done()) {
      if (miss.length) {
        cls = "red"; icon = "■"; title = "NOT READY — INPUTS REQUIRED";
        body = "Submit both inputs to release the batch:<ul style='list-style:none; margin-top:6px'>" +
          miss.map((m) => "<li>▸ " + esc(m) + "</li>").join("") + "</ul>";
        button = '<button class="btn primary" id="engRunAll" disabled>▶ RUN FULL MDMP</button>';
      } else {
        cls = "green"; icon = "▶"; title = "READY — KNOWLEDGE BANK & INTENT SUBMITTED";
        body = "The S3 Bot will run Receipt of Mission and Mission Analysis, then pause at the COA gate for human interaction.";
        button = '<button class="btn primary" id="engRunAll">▶ RUN FULL MDMP</button>';
      }
    } else if (!allDone()) {
      cls = "red"; icon = "✋"; title = "PAUSED — HUMAN INTERACTION REQUIRED";
      body = "Mission analysis is complete. The pipeline is holding at <strong>Phase 3 — COA Development</strong>. Humans to the map: enter the commander-selected COA below, then resume.";
    } else {
      cls = "green"; icon = "✔"; title = "BATCH COMPLETE — HUMAN VALIDATION REQUIRED";
      body = "All agent products are drafted. Go to <strong>Phase 6</strong>: named validators sign each product class, then export the packet.";
    }

    return '<h3 class="section-label">Pipeline Control</h3>' +
      '<div class="callout ' + cls + '"><strong>' + icon + " " + esc(title) + ":</strong> " + body + "</div>" +
      '<div style="display:flex; gap:10px; margin:0 0 16px; flex-wrap:wrap;">' +
      button +
      '<button class="btn danger" id="engReset">RESET ALL PRODUCTS</button>' +
      "</div>";
  }

  function renderBoard() {
    let html = "";
    [1, 2, 3, 4, 5, 6].forEach((ph) => {
      const meta = ENGINE.PHASES[ph];
      html += '<h3 class="section-label">' + esc(meta.title) + "</h3>" +
        '<p class="lede" style="margin-bottom:12px">' + esc(meta.note) + "</p>";
      if (ph === 3) { html += renderHumanGate(); return; }
      if (ph === 6) { html += renderValidation(); return; }
      ENGINE.STEPS.filter((st) => st.phase === ph).forEach((st) => { html += renderStepCard(st); });
    });
    return html;
  }

  function renderStepCard(st) {
    const out = state.products[st.id];
    const bot = ENGINE.BOTS[st.bot];
    const status = out ? "complete" : "queued";
    return '<div class="agent-card" data-step="' + st.id + '">' +
      '<div class="agent-head">' +
      '<span class="pill ai">' + esc(bot.label) + "</span>" +
      "<h4>" + esc(st.product) + "</h4>" +
      '<span class="agent-status ' + status + '" id="st_' + st.id + '">' + (out ? "COMPLETE — DRAFT" : "QUEUED") + "</span>" +
      "</div>" +
      '<div class="agent-out" id="out_' + st.id + '"' + (out ? "" : ' style="display:none"') + ">" +
      '<div class="prompt-text">' + esc(out || "") + "</div>" +
      '<button class="btn" data-copyout="' + st.id + '">COPY</button> ' +
      '<span class="pill role">Validator: ' + esc(st.validator) + "</span>" +
      "</div></div>";
  }

  function renderHumanGate() {
    const ready = phase12Done();
    const resumed = allDone();
    return '<div class="agent-card human-gate">' +
      '<div class="agent-head"><span class="pill human">HUMAN ONLY</span><h4>Commander\'s Course of Action</h4>' +
      '<span class="agent-status ' + (state.coa ? "complete" : "gate") + '">' + (resumed ? "COA ENTERED — WARGAMED" : (state.coa ? "COA ENTERED" : (ready ? "AWAITING HUMANS AT THE MAP" : "LOCKED — RUN PHASES 1–2 FIRST"))) + "</span></div>" +
      '<p class="use-note" style="padding:0 16px">AI is locked out of this step. The plans officer, commander, and S3 build the concept manually — against terrain, enemy disposition, and the commander\'s intent worksheet above. Enter the selected COA (concept statement, phasing, main/supporting efforts, decisive point):</p>' +
      '<div style="padding:0 16px 14px">' +
      '<textarea id="eng_coa" rows="5" style="width:100%; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--text); font-family:var(--mono); font-size:0.8rem; padding:10px;"' + (ready ? "" : " disabled") + ">" + esc(state.coa || "") + "</textarea>" +
      '<div style="margin-top:10px"><button class="btn primary" id="engResume" ' + ((ready && state.coa && !resumed) ? "" : "disabled") + ">▶ RESUME PIPELINE — RUN WARGAME &amp; ORDERS</button>" +
      (resumed ? ' <span class="pill" style="border-color:var(--green); color:var(--green)">PHASES 4–5 COMPLETE</span>' : "") +
      "</div></div></div>";
  }

  function renderValidation() {
    const products = ENGINE.STEPS.filter((s) => state.products[s.id]);
    if (!products.length) {
      return '<div class="callout">No products yet — run the batch. Every AI output is a draft until a qualified human validator signs for it.</div>';
    }
    return '<div class="table-wrap"><table><thead><tr><th>Product</th><th>Named Validator</th><th>Status</th><th>Sign</th></tr></thead><tbody>' +
      products.map((s) =>
        "<tr><td><strong>" + esc(s.product) + '</strong></td><td class="mono">' + esc(s.validator) + "</td>" +
        "<td>" + (state.signed[s.id] ? '<span class="pill" style="border-color:var(--green); color:var(--green)">VALIDATED</span>' : '<span class="pill ai">DRAFT</span>') + "</td>" +
        '<td><input type="checkbox" data-sign="' + s.id + '"' + (state.signed[s.id] ? " checked" : "") + ' style="accent-color:var(--gold)"></td></tr>'
      ).join("") +
      "</tbody></table></div>" +
      '<div style="margin-top:12px"><button class="btn primary" id="engExport">⬇ EXPORT PLANNING PACKET (.md)</button> ' +
      '<span class="pill">Unsigned products export stamped DRAFT — UNVALIDATED</span></div>';
  }

  /* ---------- State updates during a run ---------- */
  function onState(stepId, status, payload) {
    const chip = $("#st_" + stepId);
    const outBox = $("#out_" + stepId);
    if (!chip) return;
    chip.className = "agent-status " + status;
    if (status === "running") chip.textContent = "RUNNING…";
    if (status === "complete") {
      chip.textContent = "COMPLETE — DRAFT";
      state.products[stepId] = payload;
      delete state.signed[stepId];
      save(state);
      if (outBox) {
        outBox.style.display = "";
        $(".prompt-text", outBox).textContent = payload;
      }
    }
    if (status === "error") {
      chip.textContent = "ERROR";
      if (outBox) {
        outBox.style.display = "";
        $(".prompt-text", outBox).textContent = "⚠ " + payload;
      }
    }
  }

  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2400);
  }

  async function run(phases) {
    if (running) { toast("PIPELINE ALREADY RUNNING"); return; }
    persistInputs();
    const c = cfg();
    if (c.mode === "live" && !c.apiKey) { toast("API KEY REQUIRED FOR LIVE MODE"); return; }
    if (phases[0] === 1 && missingInputs().length) { toast("SUBMIT KNOWLEDGE BANK AND INTENT WORKSHEET FIRST"); return; }
    running = true;
    try {
      await ENGINE.runPhases(phases, ctx(), c, onState);
      toast(phases.includes(5) ? "BATCH COMPLETE — VALIDATE & EXPORT" : "PAUSED AT COA GATE — HUMANS TO THE MAP");
    } catch (err) {
      toast("PIPELINE HALTED: " + String(err.message || err).slice(0, 60));
    } finally {
      running = false;
      render();
      // After phases 1-2, scroll the user to the human gate
      if (!phases.includes(5) && phase12Done()) {
        const gate = $(".human-gate:last-of-type") || $("#eng_coa");
        if (gate) gate.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  function exportPacket() {
    const lines = [
      "# MDMP Planning Packet — " + state.unit,
      "_Generated by the AI-Enabled MDMP Workflow Engine (S3 Bot orchestrating). Derived from 3MBDE TTP (6 JUN 2026)._",
      "",
      "Receipt of Mission: " + (state.receiptDtg || "[TBD]") + " · OPORD NLT: " + (state.publishDtg || "[TBD]"),
      "",
      "## Knowledge Bank Documents",
      state.kb.length ? state.kb.map((d) => "- [" + d.type + "] " + d.title).join("\n") : "- [none]",
      "",
      "## CDR's Intent Worksheet (HUMAN-AUTHORED, incorporated verbatim)",
      intentText() || "[not provided]",
      ""
    ];
    ENGINE.STEPS.forEach((s) => {
      if (!state.products[s.id]) return;
      const stamp = state.signed[s.id] ? "VALIDATED — " + s.validator : "DRAFT — UNVALIDATED (validator: " + s.validator + ")";
      lines.push("---", "", "## " + s.product + "  `[" + stamp + "]`", "", state.products[s.id], "");
    });
    if (state.coa) {
      lines.push("---", "", "## Commander's COA (HUMAN-AUTHORED)", "", state.coa, "");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mdmp-planning-packet.md";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("PACKET EXPORTED");
  }

  /* ---------- Wiring ---------- */
  function refreshBanner() {
    // Re-render only the status banner area by full render (cheap; inputs persisted first)
    persistInputs();
    render();
  }

  function wire() {
    // persist plain inputs on change (no re-render to avoid losing focus)
    $$("#view-engine input, #view-engine textarea, #view-engine select").forEach((el) => {
      el.addEventListener("change", persistInputs);
    });

    // Intent worksheet: re-evaluate readiness when purpose/endState change
    ["purpose", "endState"].forEach((k) => {
      const el = $("#intent_" + k);
      if (el) el.addEventListener("blur", refreshBanner);
    });

    // Knowledge bank add
    const addBtn = $("#kbAdd");
    if (addBtn) addBtn.addEventListener("click", () => {
      const type = $("#kbType").value;
      const title = $("#kbTitle").value.trim() || (type + " " + (state.kb.length + 1));
      const text = $("#kbBody").value.trim();
      if (!text) { toast("PASTE DOCUMENT TEXT FIRST"); return; }
      persistInputs();
      state.kb.push({ id: "kb" + Date.now(), type, title, text });
      save(state);
      render();
      toast("ADDED TO KNOWLEDGE BANK");
    });

    // Knowledge bank file upload
    const fileInput = $("#kbFile");
    if (fileInput) fileInput.addEventListener("change", () => {
      persistInputs();
      const type = $("#kbType") ? $("#kbType").value : "OTHER";
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;
      let pending = files.length;
      files.forEach((f) => {
        const reader = new FileReader();
        reader.onload = () => {
          state.kb.push({ id: "kb" + Date.now() + Math.random().toString(36).slice(2, 6), type, title: f.name, text: String(reader.result || "") });
          if (--pending === 0) { save(state); render(); toast(files.length + " FILE(S) ADDED"); }
        };
        reader.onerror = () => { if (--pending === 0) { save(state); render(); } };
        reader.readAsText(f);
      });
    });

    // Knowledge bank remove
    $$("[data-kbdel]").forEach((b) => b.addEventListener("click", () => {
      persistInputs();
      state.kb = state.kb.filter((d) => d.id !== b.dataset.kbdel);
      save(state);
      render();
      toast("DOCUMENT REMOVED");
    }));

    // COA gate
    const coaEl = $("#eng_coa");
    if (coaEl) coaEl.addEventListener("input", () => {
      state.coa = coaEl.value;
      save(state);
      const btn = $("#engResume");
      if (btn) btn.disabled = !(state.coa.trim() && phase12Done() && !allDone());
    });

    const runAll = $("#engRunAll");
    if (runAll) runAll.addEventListener("click", () => run([1, 2]));
    const resume = $("#engResume");
    if (resume) resume.addEventListener("click", () => run([4, 5]));
    const resetBtn = $("#engReset");
    if (resetBtn) resetBtn.addEventListener("click", () => {
      persistInputs();
      state.products = {};
      state.signed = {};
      save(state);
      render();
      toast("PRODUCTS CLEARED");
    });

    $$("[data-copyout]").forEach((b) => b.addEventListener("click", () => {
      const text = state.products[b.dataset.copyout] || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => toast("COPIED"));
      }
    }));
    $$("[data-sign]").forEach((c) => c.addEventListener("change", () => {
      persistInputs();
      state.signed[c.dataset.sign] = c.checked;
      save(state);
      render();
    }));
    const exp = $("#engExport");
    if (exp) exp.addEventListener("click", exportPacket);
  }

  render();
})();
