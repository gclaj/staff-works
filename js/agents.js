/* ==========================================================================
   MDMP Workflow Engine — the staff officer as CHIEF OF STAFF of AI agents.

   Backend framework per "Evolving Brigade MDMP with AI-Orchestrated
   Planning" (3MBDE, 101st ABN DIV, 6 JUN 2026):
     - Role-based bots mapped 1:1 to staff nodes: S1, S2, S3, S4, FIRES,
       S6, S8, MEDICAL — plus the Red Team agent and XO Coach as
       governance validators.
     - S3 Bot is the primary orchestrating agent (the AI Integrator role
       resides in the S3 cell).
     - The HUMAN USER is the orchestrator/Chief of Staff: the pipeline
       pauses at the end of every MDMP step for COS review; any product
       can be sent back with feedback for revision (iteration is the
       designed workflow — expect 2-3 iterations per product); only COS
       approval releases the next phase.
     - Doctrinal boundary enforced in code: COA development is human-only;
       commander's intent is inserted verbatim from the CDR worksheet;
       every product is a draft until a named validator signs.
     - Zero fabrication tolerance: unknowns are [TBD] with paired RFI+LTIOV.

   Two engines: Simulation (offline/DDIL-safe skeletons) and Live
   (browser-direct Anthropic Messages API with the user's key).
   ========================================================================== */

const ENGINE = (function () {
  "use strict";

  const GOVERNANCE = `You are an AI staff-augmentation agent on a U.S. Army brigade staff conducting MDMP. A human staff officer serves as Chief of Staff (COS) and orchestrator: they review, direct revisions to, and approve every product you draft. You operate under the brigade's Five Fundamental Principles of AI-Enabled Staff Work:
1. HUMAN-IN-THE-LOOP: You augment, never replace, professional military judgment. The human planner is the tactical author. You organize, format, synthesize, and challenge; you do not command, decide, or accept risk.
2. STAFF AUGMENTATION ONLY: You never author commander's intent, select the decisive operation, authorize fires, accept risk, or sign orders. When the commander's intent worksheet is provided, incorporate it VERBATIM — it is human-authored command thought; preserve and formalize it, never rewrite it.
3. ZERO FABRICATION TOLERANCE: Never invent MGRS grids, DTGs, unit designations, task organization relationships, fires coordination data, casualty estimates, or supply quantities. If information is unavailable, write [TBD] and note the RFI. Every assumption must be paired with an RFI and LTIOV.
4. CITE SOURCES: Tag factual claims to the knowledge bank document and paragraph provided (e.g., "source: HHQ OPORD, para 3.b"). If you cannot cite a source, mark the claim as UNVERIFIED.
5. FORMAT BEFORE CONTENT: Follow the requested output format exactly. Do not overproduce — generate only the product requested.
When the COS returns your draft with feedback, incorporate the feedback precisely, preserve everything not affected, and keep the same output format. Iteration is the designed workflow.
Every output you produce is a DRAFT until a named human validator signs it.`;

  /* ---------- Bot roster: 1:1 with staff nodes + governance agents ---------- */
  const BOTS = {
    s1: {
      id: "s1", label: "S1 BOT", roleName: "S1 Personnel",
      persona: "You are the S1 Bot, specialized in personnel services and human resources support: strength reporting, personnel status by unit, replacement operations, casualty reporting procedures, and postal/MWR considerations. You NEVER fabricate strength numbers or casualty estimates — those are [TBD] until fed by real PERSTAT data and validated by the S1."
    },
    s2: {
      id: "s2", label: "S2 BOT", roleName: "S2 Intelligence",
      persona: "You are the S2 Bot, specialized in IPOE, running estimates, PIR/CCIR development, and enemy course-of-action development. You preserve analyst judgment — you draft, the S2 validates."
    },
    s3: {
      id: "s3", label: "S3 BOT · ORCHESTRATOR", roleName: "S3 Operations",
      persona: "You are the S3 Bot, the brigade's PRIMARY ORCHESTRATING AGENT (the AI Integrator role resides in the S3 cell). You sequence the planning pipeline, manage timelines and 1/3-2/3 discipline, synthesize commander guidance and the intent worksheet into structured inputs, enforce OPORD/WARNO structure, task the staff-section bots, and flag inconsistencies across successive products. You own maneuver and air planning and orders production. You work for the human Chief of Staff."
    },
    s4: {
      id: "s4", label: "S4/SPO BOT", roleName: "S4 Sustainment",
      persona: "You are the S4/SPO Bot, specialized in logistics analysis and sustainment forecasting: consumption forecasts, supply triggers, and route-risk assessments by phase."
    },
    fires: {
      id: "fires", label: "FIRES BOT", roleName: "FSO / Fires Cell",
      persona: "You are the FIRES Bot, focused on fires planning and effects integration: fires running estimates, shift matrices, trigger logic, and airspace coordination. All fires products require FSO and maneuver-commander validation against TRPs, range fans, and trigger logic before any rehearsal."
    },
    s6: {
      id: "s6", label: "S6 BOT", roleName: "S6 Signal",
      persona: "You are the S6 Bot, specialized in signal and network planning: validating network architecture against the maneuver plan, identifying communication gaps, recommending redundancy, PACE planning, and ensuring C2 continuity across phase transitions."
    },
    s8: {
      id: "s8", label: "S8 BOT", roleName: "S8 Resource Management",
      persona: "You are the S8 Bot, specialized in resource management and financial operations: funding requirements by phase, contracting support, operational funds, cost capture, and fiscal constraints. You never invent dollar figures — funding data is [TBD] until provided and validated by the S8."
    },
    med: {
      id: "med", label: "MEDICAL BOT", roleName: "Brigade Surgeon Cell",
      persona: "You are the Medical Bot (brigade surgeon cell), specialized in Army Health System support planning: medical treatment and Role 1/2 laydown, MEDEVAC/CASEVAC planning (air and ground), Class VIII resupply, and patient movement. You NEVER fabricate casualty estimates — they are [TBD] until produced by staff planning factors and validated by the surgeon."
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

  /* ---------- Estimate step factory (keeps the eight staff estimates uniform) ---------- */
  function estimateStep(id, bot, product, validator, sections, extraPrompt, sim) {
    return {
      id, phase: 2, bot, product, validator, parallel: true,
      prompt: (c) => `OUTPUT FORMAT: H2 sections: ${sections}. Every assumption pairs with an RFI and LTIOV. Mark all unknowns [TBD]. ${extraPrompt || ""}

Draft this running estimate for ${c.unit} from the knowledge bank and extraction below.

--- CDR'S INTENT WORKSHEET (human-authored, verbatim) ---
${c.intentText}
--- KNOWLEDGE BANK ---
${c.kbText}
--- S3 EXTRACTION ---
${c.products.extract || ""}`,
      sim
    };
  }

  /* ---------- Pipeline ---------- */
  const STEPS = [
    /* Phase 1 — Receipt of Mission (S3 orchestrator) */
    {
      id: "extract", phase: 1, bot: "s3", product: "Knowledge Bank Extraction",
      validator: "S3", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: Markdown with exactly these H2 sections: Specified Tasks, Implied Tasks, Essential Tasks (Recommended), Constraints & Restraints, Command Relationships, Control Measures, Critical Deadlines, RFIs. Bullet lists only. Cite the knowledge bank document and paragraph for each item where possible; mark unknowns [TBD].

As the orchestrating S3 Bot, analyze ALL knowledge bank documents below for ${c.unit} and extract the mission-analysis factors into the format above. Reconcile the documents against each other and flag any contradictions between them under RFIs. Do not generate a WARNO or any other product.

HIGHER HQ: ${c.hhq}
RECEIPT OF MISSION: ${c.receiptDtg}
--- CDR'S INTENT WORKSHEET (human-authored, verbatim) ---
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

As the orchestrating S3 Bot, generate the brigade planning timeline for ${c.unit}: WARNO #1 within one hour of receipt, mission analysis brief, WARNO #2, COA development (HUMAN-LED — no AI authorship), COA analysis/wargame, COA decision + WARNO #3, orders production with voice-to-doctrine support, OPORD publish, and confirmation brief windows preserving the subordinate 2/3. Include the Chief of Staff review gates at the end of each MDMP step.`,
      sim: (c) => `| DTG | Event | Owner | Notes |\n|---|---|---|---|\n| ${c.receiptDtg} | Receipt of Mission | S3 | Knowledge bank verified: ${c.kbTitles.length} document(s) |\n| ${c.receiptDtg} +1HR | WARNO #1 released | S3 | AI-drafted, COS-reviewed, S3-validated |\n| [TBD] | COS Review Gate 1 | COS | Approve Phase 1 products |\n| [TBD] | Mission Analysis Brief | XO | Staff enters with working products |\n| [TBD] | COS Review Gate 2 + WARNO #2 | COS/S3 | Approved mission statement, CCIR |\n| [TBD] | COA Development | CDR/S3/Plans | HUMAN-LED — AI takes a back seat |\n| [TBD] | COA Analysis / Wargame | XO | XO Coach questions walked into sync meeting |\n| [TBD] | COS Review Gate 3 + COA Decision + WARNO #3 | COS/CDR | Commander decides |\n| [TBD] | Orders Production | Staff | Voice-to-doctrine first draft ~30 min |\n| ${c.publishDtg} | OPORD PUBLISH (NLT) | S3 | 1/3 point — battalion 2/3 protected |\n\nBrigade 1/3 window: ${c.receiptDtg} → ${c.publishDtg}. Compute exact interior DTGs with the Timeline Calculator tab.`
    },

    /* Phase 2 — Mission Analysis: eight staff-node estimates in parallel */
    estimateStep("est_s1", "s1", "S1 Personnel Estimate", "S1",
      "Facts, Assumptions, Personnel Strength by Unit ([TBD] until PERSTAT provided), Replacement Operations, Casualty Reporting & Estimation Plan (planning factors only — figures [TBD] until validated), HR Shortfalls & Recommendations",
      "Never fabricate strength numbers or casualty estimates.",
      (c) => `## Facts\n- No PERSTAT provided to this session.\n\n## Assumptions\n- A1: Current assigned strength per last PERSTAT holds. RFI: pull current PERSTAT from ${c.hhq} G1. LTIOV: [TBD]\n\n## Personnel Strength by Unit\n- [TBD — requires PERSTAT; strength numbers not fabricated]\n\n## Replacement Operations\n- Replacement flow via ${c.hhq} [node TBD]; priority of fill to [TBD per CDR guidance].\n\n## Casualty Reporting & Estimation Plan\n- Casualty estimate: [TBD — surgeon/S1 planning-factor workup required; AI does not fabricate casualty figures]\n- Reporting: DA 1156 flow per SOP; battle roster reconciliation at [TBD].\n\n## HR Shortfalls & Recommendations\n- Provide PERSTAT export to convert this estimate from shell to working product.`),
    estimateStep("est_s2", "s2", "S2 Running Estimate + CCIR", "S2 section chief",
      "Facts, Assumptions, Enemy Situation & Capabilities, Terrain & Weather Effects, Recommended PIR, Recommended CCIR Linkage (tie each PIR to a commander decision or phase transition — use the CDR intent worksheet's key tasks and end state as the decision anchors)",
      "Do NOT develop friendly COAs.",
      (c) => `## Facts\n- Knowledge bank received ${c.receiptDtg}: ${c.kbTitles.join("; ") || "[none]"}\n\n## Assumptions\n- A1: Enemy disposition per ${c.hhq} Annex B remains current. RFI: request updated INTSUM. LTIOV: [TBD]\n\n## Enemy Situation & Capabilities\n- [TBD — extract from Annex B; no enemy data fabricated]\n\n## Terrain & Weather Effects\n- [TBD — pending MCOO and light/weather data]\n\n## Recommended PIR\n1. Will enemy commit reserve before [PHASE TBD]?\n2. [TBD]\n\n## Recommended CCIR Linkage\n- PIR 1 → CDR decision: commit of brigade reserve, anchored to key task: ${trunc1(c.intent.keyTasks) || "[TBD]"}.`),
    estimateStep("est_s3", "s3", "S3 Running Estimate", "S3",
      "Facts, Assumptions, Friendly Forces & Task Organization, Maneuver Considerations, Recommended FFIR",
      "Do NOT propose courses of action — COA development is human-led.",
      (c) => `## Facts\n- ${c.unit} planning window: ${c.receiptDtg} to ${c.publishDtg}\n\n## Assumptions\n- A1: Task organization per current MTOE remains effective. RFI: confirm attachments/detachments with ${c.hhq} G3. LTIOV: [TBD]\n\n## Friendly Forces & Task Organization\n- [TBD — verify against Annex A; no unit designations fabricated]\n\n## Maneuver Considerations\n- All maneuver options must achieve the CDR end state (verbatim): ${trunc1(c.intent.endState) || "[TBD]"}\n- COA development reserved for commander, plans officer, and S3 at the map.\n\n## Recommended FFIR\n1. Loss of [key platform/capability TBD] below [threshold TBD]\n2. [TBD]`),
    estimateStep("est_s4", "s4", "S4 Sustainment Estimate", "S4 / SPO",
      "Facts, Assumptions, Sustainment Forecast by Phase, Supply Triggers, Route Risk Assessment, Shortfalls & Recommendations",
      "Never invent supply quantities — use [TBD] where LOGSTAT data is not provided.",
      (c) => `## Facts\n- ${c.logstat ? "LOGSTAT data provided — see forecast." : "No LOGSTAT export provided to this session."}\n\n## Assumptions\n- A1: CSR remains at currently published rates. RFI: confirm CSR with ${c.hhq} G4. LTIOV: [TBD]\n\n## Sustainment Forecast by Phase\n- Phase [TBD]: CL III/V consumption [TBD — requires LOGTAK/GCSS-A export]\n\n## Supply Triggers\n- Trigger: CL V below [TBD]% → emergency resupply request\n\n## Route Risk Assessment\n- MSR [TBD]: risk [TBD] — pending route status\n\n## Shortfalls & Recommendations\n- Ingest LOGSTAT export to generate evidence-backed forecasts (quantities not fabricated).`),
    estimateStep("est_fires", "fires", "Fires Running Estimate", "FSO + maneuver CDR",
      "Facts, Assumptions, Available Fires Assets, Fires Considerations by Phase, Draft Trigger Logic (mark every grid [GRID TBD]), Airspace & Coordination Requirements",
      "Never fabricate TRPs, range fans, or grids.",
      (c) => `## Facts\n- Fires assets per ${c.hhq} Annex D: [TBD — not fabricated]\n\n## Assumptions\n- A1: DS battalion remains DS to ${c.unit}. RFI: confirm with ${c.hhq} FSCOORD. LTIOV: [TBD]\n\n## Available Fires Assets\n- [TBD — verify against Annex D]\n\n## Fires Considerations by Phase\n- Phase [TBD]: priority of fires [TBD]\n\n## Draft Trigger Logic\n- Shift from [GRID TBD] to [GRID TBD] when [condition TBD] — REQUIRES FSO + maneuver commander validation against TRPs and range fans before any rehearsal.\n\n## Airspace & Coordination Requirements\n- A2C2 deconfliction for [TBD]; FSCM review at COA decision.`),
    estimateStep("est_s6", "s6", "S6 Signal Estimate", "S6",
      "Facts, Assumptions, Network Architecture vs Maneuver Plan, Communication Gaps & Redundancy, PACE Plan by Phase, C2 Continuity Across Phase Transitions",
      "Validate the network against the maneuver plan; flag every gap.",
      (c) => `## Facts\n- Current network architecture: [TBD — verify against Annex H]\n\n## Assumptions\n- A1: Retrans assets available for [phase TBD]. RFI: confirm retrans task org with ${c.hhq} G6. LTIOV: [TBD]\n\n## Network Architecture vs Maneuver Plan\n- [TBD — overlay network coverage against scheme of maneuver once COA selected]\n\n## Communication Gaps & Redundancy\n- Anticipated gap: [terrain/area TBD] — recommend retrans or relay at [GRID TBD]\n\n## PACE Plan by Phase\n- Phase [TBD]: P: [TBD] A: [TBD] C: [TBD] E: [TBD]\n\n## C2 Continuity Across Phase Transitions\n- C2 transfer points [TBD]; validate CP displacement timing against the timeline.`),
    estimateStep("est_s8", "s8", "S8 Resource Management Estimate", "S8",
      "Facts, Assumptions, Funding Requirements by Phase ([TBD] until figures provided), Contracting Support, Fiscal Constraints & Authorities, Cost Capture Plan",
      "Never invent dollar figures.",
      (c) => `## Facts\n- No funding data provided to this session.\n\n## Assumptions\n- A1: Current operational funding authorities remain in effect. RFI: confirm authorities with ${c.hhq} G8. LTIOV: [TBD]\n\n## Funding Requirements by Phase\n- Phase [TBD]: [AMOUNT TBD — dollar figures not fabricated]\n\n## Contracting Support\n- Anticipated requirements: [TBD — LOGCAP/contracting officer coordination]\n\n## Fiscal Constraints & Authorities\n- [TBD — verify applicable authorities and thresholds]\n\n## Cost Capture Plan\n- Cost capture per SOP; reporting cadence [TBD].`),
    estimateStep("est_med", "med", "Medical / AHS Support Estimate", "Brigade Surgeon",
      "Facts, Assumptions, Medical Treatment Laydown (Role 1/2 — grids [GRID TBD]), MEDEVAC/CASEVAC Plan (air and ground, by phase), Class VIII Resupply, Casualty Estimate Status (planning-factor workup — figures [TBD] until surgeon-validated)",
      "Never fabricate casualty estimates.",
      (c) => `## Facts\n- Medical task organization: [TBD — verify Annex A / Annex F]\n\n## Assumptions\n- A1: Air MEDEVAC remains mission-capable and weather-available. RFI: confirm MEDEVAC posture with ${c.hhq} surgeon cell. LTIOV: [TBD]\n\n## Medical Treatment Laydown\n- Role 1: [GRID TBD] per battalion; Role 2: [GRID TBD] — position against scheme of maneuver once COA selected.\n\n## MEDEVAC/CASEVAC Plan\n- Air: [TBD — HLZ list pending]; Ground: ambulance exchange points [GRID TBD] by phase.\n\n## Class VIII Resupply\n- [TBD — tie to S4 distribution plan]\n\n## Casualty Estimate Status\n- [TBD — surgeon planning-factor workup required; AI does not fabricate casualty figures]. RFI: casualty estimate by phase. LTIOV: before wargame.`),
    {
      id: "redteam1", phase: 2, bot: "redteam", product: "Red Team Proof — Mission Analysis Products",
      validator: "XO", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: A numbered discrepancy list. Each item: [PRODUCT] — [SEVERITY: CRITICAL/MAJOR/MINOR] — finding — recommended correction. End with a one-line completeness verdict. Do not rewrite the products.

Red-team the following draft products for ${c.unit}: gaps, bad assumptions, DTG errors, inconsistencies between products, missing RFI/LTIOV pairings, fabricated-looking data (any specific grid, quantity, or unit designation not traceable to the knowledge bank), nesting failures against the CDR intent worksheet, and doctrinal noncompliance.

--- CDR'S INTENT WORKSHEET ---\n${c.intentText}\n--- WARNO #1 ---\n${c.products.warno1 || ""}\n--- TIMELINE ---\n${c.products.timeline || ""}\n--- S1 ---\n${trunc(c.products.est_s1)}\n--- S2 ---\n${trunc(c.products.est_s2)}\n--- S3 ---\n${trunc(c.products.est_s3)}\n--- S4 ---\n${trunc(c.products.est_s4)}\n--- FIRES ---\n${trunc(c.products.est_fires)}\n--- S6 ---\n${trunc(c.products.est_s6)}\n--- S8 ---\n${trunc(c.products.est_s8)}\n--- MEDICAL ---\n${trunc(c.products.est_med)}`,
      sim: () => `1. [WARNO #1] — MAJOR — Mission statement is [TBD]; WARNO cannot be released without an approved mission statement. Recommend commander approval before release.\n2. [ALL ESTIMATES] — MAJOR — Multiple assumptions lack LTIOV. Recommend S3 assign LTIOV to every RFI before the MA brief.\n3. [MEDICAL/S1] — MAJOR — Casualty estimate is [TBD] in both products; surgeon planning-factor workup must complete before the wargame or MEDEVAC triggers cannot be validated.\n4. [S6] — MINOR — PACE plan is placeholder; populate before COA analysis so C2 seams can be wargamed.\n5. [CROSS-PRODUCT] — MINOR — Verify phase naming is identical across all eight estimates and nested against the CDR end state before the MA brief.\n\nVERDICT: Products are structurally sound drafts; no fabricated data detected; not releasable until named validators sign.`
    },

    /* Phase 4 (Phase 3 is the human COA gate) */
    {
      id: "xoquestions", phase: 4, bot: "xocoach", product: "XO Coach — Wargame Questions",
      validator: "XO", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: Numbered questions grouped under H2 headings by staff node (S1 Personnel, S2 Intelligence, S3 Maneuver, S4 Sustainment, FIRES, S6 Signal, S8 Resources, MEDICAL). 1-3 questions each. Each question must name the staff section that owes the answer and reference a specific element of the COA, an estimate, or the CDR intent worksheet.

The commander's staff developed this course of action (HUMAN-authored — do not modify or judge its selection). Generate adversarial wargame questions that stress-test it against the commander's intent, including timing failures (e.g., what happens if the main effort is 30 minutes early/late) and passage-of-lines vulnerabilities.

--- CDR'S INTENT WORKSHEET ---\n${c.intentText}\n--- HUMAN COA ---\n${c.coa}\n--- ESTIMATES SUMMARY ---\nS2: ${trunc(c.products.est_s2)}\nS4: ${trunc(c.products.est_s4)}\nFIRES: ${trunc(c.products.est_fires)}\nS6: ${trunc(c.products.est_s6)}\nMED: ${trunc(c.products.est_med)}`,
      sim: (c) => `## S1 Personnel\n1. S1: If the casualty workup exceeds replacement flow in phase [TBD], which unit falls below combat-effective first?\n\n## S2 Intelligence\n2. S2: What indicator confirms the enemy reserve has committed, and is a collection asset tasked with an LTIOV that beats the decision point?\n\n## S3 Maneuver\n3. S3: If the main effort arrives 30 minutes early at [objective TBD], is the fires shift trigger condition-based or time-based — and who owns the call?\n4. S3: Where exactly does FPOL occur, and which control measures deconflict passing/stationary units?\n\n## S4 Sustainment\n5. S4: Which phase consumes CL V fastest, and does the trigger fire early enough given route risk?\n\n## FIRES\n6. FSO: Can the shift matrix survive a comms-degraded environment — what is the backup trigger?\n\n## S6 Signal\n7. S6: Where does C2 transfer between phases, and does the end state ("${trunc1(c.intent.endState) || "[TBD]"}") remain achievable if the PACE plan degrades at that seam?\n\n## S8 Resources\n8. S8: Does any phase require contracting or funding authority that is not yet confirmed?\n\n## MEDICAL\n9. Surgeon: Does MEDEVAC coverage survive the most exposed phase — where is the AXP when the main effort is at the decisive point?`
    },
    {
      id: "redteam2", phase: 4, bot: "redteam", product: "Red Team — COA Gap Analysis",
      validator: "XO", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: Numbered list. Each item: [SEVERITY: CRITICAL/MAJOR/MINOR] — gap or inconsistency between the COA, the CDR intent worksheet, and the staff estimates — recommended staff action. Do not evaluate whether the COA is a good plan; identify only gaps, unsourced data, nesting failures, and synchronization risks.

Analyze the HUMAN-authored COA against the commander's intent and all eight staff estimates for ${c.unit}.

--- CDR'S INTENT WORKSHEET ---\n${c.intentText}\n--- HUMAN COA ---\n${c.coa}\n--- ESTIMATES ---\nS1: ${trunc(c.products.est_s1)}\nS2: ${trunc(c.products.est_s2)}\nS3: ${trunc(c.products.est_s3)}\nS4: ${trunc(c.products.est_s4)}\nFIRES: ${trunc(c.products.est_fires)}\nS6: ${trunc(c.products.est_s6)}\nS8: ${trunc(c.products.est_s8)}\nMED: ${trunc(c.products.est_med)}`,
      sim: () => `1. [MAJOR] — COA phases are not yet mapped to the S4 sustainment forecast; consumption by phase is [TBD]. Recommend S4 align forecast to COA phasing before wargame.\n2. [MAJOR] — Fires trigger logic contains [GRID TBD] placeholders; wargame cannot validate shifts until FSO populates TRPs.\n3. [MAJOR] — Medical laydown not yet positioned against the COA's decisive point; surgeon to place Role 2 and AXPs before rehearsal.\n4. [MINOR] — Confirm every CDR key task from the intent worksheet maps to a task in the COA; flag any orphaned key task.\n5. [MINOR] — S6 PACE plan must be phase-aligned to the COA before the wargame.`
    },

    /* Phase 5 — Orders Production */
    {
      id: "opord", phase: 5, bot: "s3", product: "OPORD Draft (Para 1–5 Shell)",
      validator: "Section chiefs → CDR signs", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: OPORD paragraphs 1-5 IAW FM 5-0. Paragraph 3 Commander's Intent must reproduce the CDR intent worksheet VERBATIM under the label "Commander's Intent (CDR-provided, verbatim):" — you formalize command thought, you never author it; if the worksheet is empty, write [CDR PROVIDES — NON-DELEGABLE]. Paragraph 3 also includes: concept of operations by phase, scheme of maneuver, scheme of fires, one-line task statements to subordinate units (use [UNIT TBD] where task org unconfirmed), coordinating instructions with CCIR, and an execution timeline. Paragraph 4 (Sustainment) synthesizes the S4 logistics, S1 personnel, MEDICAL health service support, and S8 resourcing estimates. Paragraph 5 (Command and Signal) synthesizes the S6 estimate: CP locations [GRID TBD], succession of command [TBD], PACE by phase. Use [TBD]/[GRID TBD] for all unknowns. This is a DRAFT shell — the commander approves the mission statement and signs the order.

As the orchestrating S3 Bot, assemble the OPORD draft for ${c.unit} from the human COA, the intent worksheet, and all validated staff products.

--- CDR'S INTENT WORKSHEET (verbatim) ---\n${c.intentText}\n--- HUMAN COA ---\n${c.coa}\n--- WARNO #1 ---\n${trunc(c.products.warno1)}\n--- EXTRACTION ---\n${trunc(c.products.extract)}\n--- ESTIMATES ---\nS1: ${trunc(c.products.est_s1)}\nS2: ${trunc(c.products.est_s2)}\nS3: ${trunc(c.products.est_s3)}\nS4: ${trunc(c.products.est_s4)}\nFIRES: ${trunc(c.products.est_fires)}\nS6: ${trunc(c.products.est_s6)}\nS8: ${trunc(c.products.est_s8)}\nMED: ${trunc(c.products.est_med)}\n--- WARGAME OUTPUTS ---\n${trunc(c.products.xoquestions)}\n${trunc(c.products.redteam2)}`,
      sim: (c) => `OPORD [NUMBER TBD] — ${c.unit}\nReferences: ${c.kbTitles.join("; ") || "[TBD]"}; map sheets [TBD]. Time zone: [TBD].\n\n1. SITUATION.\n   a. Enemy: per S2 running estimate and ${c.hhq} Annex B [details TBD].\n   b. Friendly: ${c.hhq} mission and intent [incorporate verbatim — TBD].\n   c. Attachments/Detachments: [TBD — verify Annex A].\n\n2. MISSION. [Approved mission statement — CDR approval required.]\n\n3. EXECUTION.\n   Commander's Intent (CDR-provided, verbatim):\n${c.intentText ? indent(c.intentText) : "   [CDR PROVIDES — NON-DELEGABLE]"}\n   a. Concept of Operations: Derived from commander-selected COA — ${firstLine(c.coa)} [phases TBD].\n   b. Scheme of Maneuver: [Built from human COA — populate control measures; grids TBD].\n   c. Scheme of Fires: [FSO validates triggers against TRPs and range fans before rehearsal].\n   d. Tasks to Subordinate Units:\n      (1) [UNIT TBD]: [one-line task and purpose].\n      (2) [UNIT TBD]: [one-line task and purpose].\n   e. Coordinating Instructions: CCIR per approved list; every assumption carries an RFI + LTIOV; execution timeline aligned to phases.\n\n4. SUSTAINMENT.\n   a. Logistics: per S4 estimate — forecasts and triggers [TBD pending LOGSTAT].\n   b. Personnel: per S1 estimate — strength and replacement flow [TBD pending PERSTAT].\n   c. Health Service Support: per MEDICAL estimate — Role 1/2 laydown [GRID TBD]; MEDEVAC/AXP by phase [TBD].\n   d. Resource Management: per S8 estimate — funding authorities [TBD].\n\n5. COMMAND AND SIGNAL.\n   a. Command: CP locations [GRID TBD]; succession of command [TBD].\n   b. Signal: per S6 estimate — PACE by phase [TBD]; C2 transfer points validated against timeline.\n\nDRAFT SHELL — section chiefs validate; commander approves the mission statement and signs. AI incorporated the CDR's intent verbatim and did not select the decisive operation or accept risk.`
    },
    {
      id: "redteam3", phase: 5, bot: "redteam", product: "Final Consistency Check",
      validator: "XO", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: Numbered discrepancy list ([SEVERITY] — finding — correction), then an H2 "Release Checklist" with the named validator for each product class (mission statement/intent → Commander; fires → FSO + maneuver CDR; estimates → staff-section chiefs; all products → section-chief sign-off). Do not rewrite products.

Run the final consistency check across ALL products for ${c.unit} before publication: mismatched labels and phase names, inconsistent DTGs, tasks in the OPORD not supported by an estimate, any deviation between the OPORD's Commander's Intent text and the worksheet (it must be verbatim), paragraph 4/5 content unsupported by the S1/S4/S6/S8/MED estimates, [TBD]s that must be resolved before release vs. acceptable RFIs, and any unvalidated fabrication risk.

--- CDR'S INTENT WORKSHEET (verbatim source) ---\n${c.intentText}\n--- OPORD DRAFT ---\n${c.products.opord || ""}\n--- WARNO #1 ---\n${trunc(c.products.warno1)}\n--- TIMELINE ---\n${trunc(c.products.timeline)}\n--- COA ---\n${trunc(c.coa)}`,
      sim: (c) => `1. [CRITICAL] — Mission statement remains [TBD]: OPORD is not releasable until the commander approves the mission statement.\n2. [MAJOR] — Tasks to subordinate units contain [UNIT TBD]; resolve task organization against Annex A before publication.\n3. [MAJOR] — Paragraph 4 casualty/strength data remains [TBD]; S1 and surgeon must complete workups before the confirmation brief.\n4. [MINOR] — Verify the OPORD Commander's Intent matches the worksheet verbatim (${c.intentText ? "worksheet present — character-match before release" : "worksheet EMPTY — intent missing"}).\n5. [MINOR] — Ensure WARNO #1 timeline DTGs match the OPORD execution timeline after final computation.\n\n## Release Checklist\n- Mission statement & commander's intent → COMMANDER approval\n- Fires products → FSO + maneuver commander validation (before rehearsal)\n- Staff estimates → S1/S2/S3/S4/FSO/S6/S8/Surgeon sign for accuracy\n- Every fact → cross-referenced: units vs Annex A, grids vs ATAK, DTGs vs timeline, enemy vs Annex B\n- All products → section-chief sign-off, then CDR signs the order`
    }
  ];

  const PHASES = {
    1: { title: "Phase 1 — Receipt of Mission", note: "S3 Bot extracts the knowledge bank, drafts WARNO #1, and builds the timeline. Pauses for COS review." },
    2: { title: "Phase 2 — Mission Analysis", note: "All eight staff nodes (S1, S2, S3, S4, FIRES, S6, S8, MEDICAL) draft running estimates in parallel; Red Team proofs the batch. Pauses for COS review." },
    3: { title: "Phase 3 — COA Development", note: "DOCTRINAL BOUNDARY. Humans at the map. The pipeline holds until the COS enters the commander-selected COA." },
    4: { title: "Phase 4 — COA Analysis / Wargame", note: "XO Coach stress-tests the human COA across all staff nodes; Red Team runs gap analysis. Pauses for COS review." },
    5: { title: "Phase 5 — Orders Production", note: "S3 Bot assembles the OPORD paragraphs 1–5 (CDR intent verbatim; para 4/5 synthesized from S1/S4/S6/S8/MED); Red Team runs the final consistency check." },
    6: { title: "Phase 6 — Validation & Export", note: "Named validators sign each product class. Unsigned products export stamped DRAFT." }
  };

  function trunc(s) { return (s || "").slice(0, 2000); }
  function trunc1(s) { return (s || "").split("\n")[0].slice(0, 120); }
  function firstLine(s) { return (s || "").split("\n")[0].slice(0, 160); }
  function indent(s) { return s.split("\n").map((l) => "   " + l).join("\n"); }

  /* ---------- Live engine ---------- */
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

  function simulate(step, ctx, feedback) {
    return new Promise((resolve) => setTimeout(() => {
      if (feedback) {
        const prev = ctx.products[step.id] || step.sim(ctx);
        resolve("[REVISION — COS feedback incorporated: \"" + feedback.slice(0, 200) + "\"]\n[Affected sections updated; unaffected content preserved. Live mode performs a full redraft.]\n\n" + prev);
      } else {
        resolve(step.sim(ctx));
      }
    }, 450 + Math.random() * 650));
  }

  function buildPrompt(step, ctx, feedback) {
    let p = step.prompt(ctx);
    if (feedback) {
      p += `\n\n=== REVISION REQUEST FROM THE CHIEF OF STAFF ===\nThe COS reviewed your previous draft and directed changes. Incorporate this feedback precisely, preserve everything not affected, and keep the same output format.\n--- COS FEEDBACK ---\n${feedback}\n--- YOUR PREVIOUS DRAFT ---\n${ctx.products[step.id] || "[none]"}`;
    }
    return p;
  }

  async function runStep(step, ctx, cfg, onState, feedback) {
    onState(step.id, "running");
    try {
      const out = cfg.mode === "live"
        ? await callClaude(cfg, step.bot, buildPrompt(step, ctx, feedback))
        : await simulate(step, ctx, feedback);
      ctx.products[step.id] = out;
      onState(step.id, "complete", out);
    } catch (err) {
      onState(step.id, "error", String(err.message || err));
      throw err;
    }
  }

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

  async function reviseStep(stepId, ctx, cfg, onState, feedback) {
    const step = STEPS.find((s) => s.id === stepId);
    if (!step) throw new Error("Unknown step " + stepId);
    await runStep(step, ctx, cfg, onState, feedback);
  }

  return { BOTS, STEPS, PHASES, runPhases, reviseStep };
})();

/* ==========================================================================
   Workflow Engine UI — the user is the Chief of Staff
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const KEY = "mdmp.engine";
  const DOC_TYPES = ["HHQ OPORD", "HHQ WARNORD", "ANNEX / APPENDIX", "FRAGO", "SOP / TEMPLATE", "OTHER"];

  /* Stage machine: idle → review1 → review2 → coa → review4 → validate */
  const STAGE_FLOW = ["idle", "review1", "review2", "coa", "review4", "validate"];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* private mode */ }
  }

  let state = Object.assign({
    unit: "3MBDE, 101st ABN DIV (AASLT)", hhq: "101st ABN DIV",
    receiptDtg: "", publishDtg: "", logstat: "",
    kb: [], intent: { purpose: "", keyTasks: "", endState: "", risk: "" },
    coa: "", mode: "sim", model: "claude-opus-4-8", apiKey: "",
    products: {}, signed: {}, revs: {}, stage: "idle"
  }, load());

  // Migrations from earlier versions
  if (state.order && (!state.kb || !state.kb.length)) {
    state.kb = [{ id: "mig1", type: "HHQ OPORD", title: "Migrated higher order", text: state.order }];
    delete state.order;
  }
  if (!state.intent) state.intent = { purpose: "", keyTasks: "", endState: "", risk: "" };
  if (!state.kb) state.kb = [];
  if (!state.revs) state.revs = {};
  if (state.products && state.products.est_fso && !state.products.est_fires) {
    state.products.est_fires = state.products.est_fso; // fso -> fires rename
    delete state.products.est_fso;
  }
  if (!state.stage || STAGE_FLOW.indexOf(state.stage) === -1) {
    // derive stage from products for old saves
    const has = (id) => !!state.products[id];
    if (has("redteam3")) state.stage = "validate";
    else if (has("redteam1")) state.stage = "coa";
    else if (has("extract")) state.stage = "review1";
    else state.stage = "idle";
  }
  save(state);

  let running = false;

  /* ---------- Helpers ---------- */
  function missingInputs() {
    const miss = [];
    if (!state.kb.length) miss.push("Knowledge Bank: add at least one higher OPORD or WARNORD");
    if (!(state.intent.purpose || "").trim()) miss.push("CDR's Intent Worksheet: expanded purpose");
    if (!(state.intent.endState || "").trim()) miss.push("CDR's Intent Worksheet: end state");
    return miss;
  }
  function phaseDone(ph) {
    return ENGINE.STEPS.filter((s) => s.phase === ph).every((s) => state.products[s.id]);
  }

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
      "<h2>MDMP Workflow Engine — You Are the Chief of Staff</h2>" +
      '<p class="lede">Eight AI staff agents — <strong>S1, S2, S3, S4, FIRES, S6, S8, MEDICAL</strong> — conduct MDMP under the orchestration of the S3 Bot, with the Red Team agent and XO Coach as governance validators. <strong>You are the orchestrator:</strong> the pipeline pauses at the end of every MDMP step for your review; send any product back with feedback for revision (iteration is the designed workflow), approve to release the next phase, author the COA yourself, and sign the validation hierarchy before export.</p>' +

      renderRoster() +
      renderKnowledgeBank() +
      renderIntentWorksheet() +
      renderMissionMeta() +
      renderEngineMode() +
      '<div id="engBanner">' + renderStatusBanner() + "</div>" +
      '<div id="engBoard">' + renderBoard() + "</div>";

    wire();
  }

  /* Update only the banner region — never detaches input fields mid-edit */
  function updateBanner() {
    const b = $("#engBanner");
    if (!b) return;
    b.innerHTML = renderStatusBanner();
    wireBanner();
  }

  function renderRoster() {
    const staff = ["s1", "s2", "s3", "s4", "fires", "s6", "s8", "med"];
    return '<h3 class="section-label">Your Staff</h3>' +
      '<div class="roster">' +
      staff.map((id) => {
        const b = ENGINE.BOTS[id];
        return '<div class="roster-node"><span class="pill ai">' + esc(b.label) + '</span><span class="roster-role">' + esc(b.roleName) + "</span></div>";
      }).join("") +
      '<div class="roster-node gov"><span class="pill human">RED TEAM + XO COACH</span><span class="roster-role">Governance validators</span></div>' +
      '<div class="roster-node gov"><span class="pill human">YOU — CHIEF OF STAFF</span><span class="roster-role">Orchestrator: review, revise, approve, sign</span></div>' +
      "</div>";
  }

  function renderKnowledgeBank() {
    return '<h3 class="section-label">Step 1 · Knowledge Bank</h3>' +
      '<div class="callout">Upload the doctrine of this fight: higher OPORDs, WARNORDs, annexes/appendices, FRAGOs. The agents cite these documents and never fabricate what they don\'t contain. Use clear names per the brigade convention (e.g., <span class="mono">HHQ OPORD Division Level</span>).</div>' +
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
        '<tr><td class="mono">' + esc(d.type) + "</td><td><strong>" + esc(d.title) + '</strong></td><td class="mono">' + d.text.length.toLocaleString() + " chars</td>" +
        '<td><button class="btn danger" data-kbdel="' + esc(d.id) + '">✗ REMOVE</button></td></tr>'
      ).join("") + "</tbody></table></div>";
  }

  function renderIntentWorksheet() {
    const i = state.intent;
    return '<h3 class="section-label">Step 2 · CDR\'s Intent Worksheet</h3>' +
      '<div class="callout red"><strong>Human-authored — non-delegable.</strong> The commander (or you, capturing the commander\'s words) fills this worksheet. The agents incorporate it <em>verbatim</em>: they preserve and formalize command thought, they never write it.</div>' +
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

  /* --- Status banner + stage controls --- */
  function renderStatusBanner() {
    const miss = missingInputs();
    let cls = "", icon = "", title = "", body = "", buttons = "";

    if (running) {
      icon = "⚙"; title = "PIPELINE RUNNING";
      body = "The S3 Bot is orchestrating your staff. Products appear below as each agent completes.";
    } else {
      switch (state.stage) {
        case "idle":
          if (miss.length) {
            cls = "red"; icon = "■"; title = "NOT READY — INPUTS REQUIRED";
            body = "Submit both inputs to release the batch:<ul style='list-style:none; margin-top:6px'>" +
              miss.map((m) => "<li>▸ " + esc(m) + "</li>").join("") + "</ul>";
            buttons = '<button class="btn primary" id="engRunAll" disabled>▶ BEGIN MDMP — RUN RECEIPT OF MISSION</button>';
          } else {
            cls = "green"; icon = "▶"; title = "READY — KNOWLEDGE BANK & INTENT SUBMITTED";
            body = "Your staff is assembled. The S3 Bot will run Receipt of Mission, then pause for your review.";
            buttons = '<button class="btn primary" id="engRunAll">▶ BEGIN MDMP — RUN RECEIPT OF MISSION</button>';
          }
          break;
        case "review1":
          cls = "red"; icon = "✋"; title = "COS REVIEW GATE 1 — RECEIPT OF MISSION";
          body = "Review the Phase 1 products below. Send feedback to any agent for revision, or approve to release Mission Analysis to all eight staff nodes.";
          buttons = '<button class="btn primary" id="engApprove1">✓ APPROVE PHASE 1 — RUN MISSION ANALYSIS</button>';
          break;
        case "review2":
          cls = "red"; icon = "✋"; title = "COS REVIEW GATE 2 — MISSION ANALYSIS";
          body = "All eight staff estimates and the Red Team proof are in. Review and revise as needed, then approve to proceed to COA development — which is yours, not theirs.";
          buttons = '<button class="btn primary" id="engApprove2">✓ APPROVE PHASE 2 — PROCEED TO COA DEVELOPMENT</button>';
          break;
        case "coa":
          cls = "red"; icon = "✋"; title = "HUMANS AT THE MAP — COA DEVELOPMENT";
          body = "The doctrinal boundary. Enter the commander-selected COA in Phase 3 below; the agents are locked out until you do.";
          break;
        case "review4":
          cls = "red"; icon = "✋"; title = "COS REVIEW GATE 3 — WARGAME RESULTS";
          body = "The XO Coach's questions and the Red Team's gap analysis are in. Review and revise as needed, then approve to run orders production.";
          buttons = '<button class="btn primary" id="engApprove4">✓ APPROVE WARGAME — RUN ORDERS PRODUCTION</button>';
          break;
        case "validate":
          cls = "green"; icon = "✔"; title = "MDMP BATCH COMPLETE — VALIDATION REQUIRED";
          body = "All products are drafted and consistency-checked. Go to <strong>Phase 6</strong>: sign the validation hierarchy, then export the packet.";
          break;
      }
    }

    return '<h3 class="section-label">Pipeline Control — Chief of Staff</h3>' +
      '<div class="callout ' + cls + '"><strong>' + icon + " " + esc(title) + ":</strong> " + body + "</div>" +
      '<div style="display:flex; gap:10px; margin:0 0 16px; flex-wrap:wrap;">' +
      buttons +
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
    const rev = state.revs[st.id] || 0;
    return '<div class="agent-card" data-step="' + st.id + '">' +
      '<div class="agent-head">' +
      '<span class="pill ai">' + esc(bot.label) + "</span>" +
      "<h4>" + esc(st.product) + (rev ? ' <span class="pill" style="border-color:var(--amber); color:var(--amber)">REV ' + (rev + 1) + "</span>" : "") + "</h4>" +
      '<span class="agent-status ' + status + '" id="st_' + st.id + '">' + (out ? "COMPLETE — DRAFT" : "QUEUED") + "</span>" +
      "</div>" +
      '<div class="agent-out" id="out_' + st.id + '"' + (out ? "" : ' style="display:none"') + ">" +
      '<div class="prompt-text">' + esc(out || "") + "</div>" +
      '<div class="revise-row">' +
      '<button class="btn" data-copyout="' + st.id + '">COPY</button>' +
      '<span class="pill role">Validator: ' + esc(st.validator) + "</span>" +
      "</div>" +
      '<div class="revise-box">' +
      '<textarea data-fb="' + st.id + '" rows="2" placeholder="COS feedback for ' + esc(bot.label) + ' — direct the revision here…"></textarea>' +
      '<button class="btn" data-revise="' + st.id + '">↻ REQUEST REVISION</button>' +
      "</div></div></div>";
  }

  function renderHumanGate() {
    const atGate = state.stage === "coa" || state.stage === "review4" || state.stage === "validate";
    const past = state.stage === "review4" || state.stage === "validate";
    const ready = state.stage === "coa";
    return '<div class="agent-card human-gate">' +
      '<div class="agent-head"><span class="pill human">HUMAN ONLY</span><h4>Commander\'s Course of Action</h4>' +
      '<span class="agent-status ' + (state.coa && atGate ? "complete" : "gate") + '">' +
      (past ? "COA ENTERED — WARGAMED" : (ready ? (state.coa ? "COA ENTERED" : "AWAITING HUMANS AT THE MAP") : "LOCKED — COMPLETE PRIOR REVIEWS FIRST")) +
      "</span></div>" +
      '<p class="use-note" style="padding:0 16px">AI is locked out of this step. The plans officer, commander, and S3 build the concept manually — against terrain, enemy disposition, and the commander\'s intent worksheet above. Enter the selected COA (concept statement, phasing, main/supporting efforts, decisive point):</p>' +
      '<div style="padding:0 16px 14px">' +
      '<textarea id="eng_coa" rows="5" style="width:100%; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--text); font-family:var(--mono); font-size:0.8rem; padding:10px;"' + (ready ? "" : " disabled") + ">" + esc(state.coa || "") + "</textarea>" +
      '<div style="margin-top:10px"><button class="btn primary" id="engResume" ' + ((ready && state.coa.trim()) ? "" : "disabled") + ">▶ SUBMIT COA — RUN WARGAME (PHASE 4)</button>" +
      (past ? ' <span class="pill" style="border-color:var(--green); color:var(--green)">WARGAME COMPLETE</span>' : "") +
      "</div></div></div>";
  }

  function renderValidation() {
    const products = ENGINE.STEPS.filter((s) => state.products[s.id]);
    if (!products.length) {
      return '<div class="callout">No products yet — begin MDMP. Every AI output is a draft until a qualified human validator signs for it.</div>';
    }
    const signedCount = products.filter((s) => state.signed[s.id]).length;
    return '<div class="check-progress">' + signedCount + " / " + products.length + " products validated</div>" +
      '<div class="table-wrap"><table><thead><tr><th>Product</th><th>Named Validator</th><th>Status</th><th>Sign</th></tr></thead><tbody>' +
      products.map((s) =>
        "<tr><td><strong>" + esc(s.product) + '</strong></td><td class="mono">' + esc(s.validator) + "</td>" +
        "<td>" + (state.signed[s.id] ? '<span class="pill" style="border-color:var(--green); color:var(--green)">VALIDATED</span>' : '<span class="pill ai">DRAFT</span>') + "</td>" +
        '<td><input type="checkbox" data-sign="' + s.id + '"' + (state.signed[s.id] ? " checked" : "") + ' style="accent-color:var(--gold)"></td></tr>'
      ).join("") +
      "</tbody></table></div>" +
      '<div style="margin-top:12px"><button class="btn primary" id="engExport">⬇ EXPORT PLANNING PACKET (.md)</button> ' +
      '<span class="pill">Unsigned products export stamped DRAFT — UNVALIDATED</span></div>';
  }

  /* ---------- Run-state plumbing ---------- */
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

  async function runPhaseGroup(phases, nextStage, doneMsg) {
    if (running) { toast("PIPELINE ALREADY RUNNING"); return; }
    persistInputs();
    const c = cfg();
    if (c.mode === "live" && !c.apiKey) { toast("API KEY REQUIRED FOR LIVE MODE"); return; }
    running = true;
    render(); // show running banner
    try {
      await ENGINE.runPhases(phases, ctx(), c, onState);
      state.stage = nextStage;
      save(state);
      toast(doneMsg);
    } catch (err) {
      toast("PIPELINE HALTED: " + String(err.message || err).slice(0, 60));
    } finally {
      running = false;
      render();
      const banner = $("#view-engine .section-label");
      if (banner) window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function revise(stepId, feedback) {
    if (running) { toast("PIPELINE ALREADY RUNNING"); return; }
    if (!feedback.trim()) { toast("ENTER FEEDBACK FIRST"); return; }
    persistInputs();
    const c = cfg();
    if (c.mode === "live" && !c.apiKey) { toast("API KEY REQUIRED FOR LIVE MODE"); return; }
    running = true;
    try {
      await ENGINE.reviseStep(stepId, ctx(), c, onState, feedback.trim());
      state.revs[stepId] = (state.revs[stepId] || 0) + 1;
      save(state);
      toast("REVISION COMPLETE — REVIEW THE UPDATED DRAFT");
    } catch (err) {
      toast("REVISION FAILED: " + String(err.message || err).slice(0, 60));
    } finally {
      running = false;
      render();
      const card = $('[data-step="' + stepId + '"]');
      if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function exportPacket() {
    const lines = [
      "# MDMP Planning Packet — " + state.unit,
      "_Generated by the AI-Enabled MDMP Workflow Engine (S3 Bot orchestrating; human Chief of Staff verifying). Derived from 3MBDE TTP (6 JUN 2026)._",
      "",
      "Receipt of Mission: " + (state.receiptDtg || "[TBD]") + " · OPORD NLT: " + (state.publishDtg || "[TBD]"),
      "",
      "## Staff Roster (AI agents)",
      "S1, S2, S3 (orchestrator), S4, FIRES, S6, S8, MEDICAL — Red Team + XO Coach governance",
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
      const rev = state.revs[s.id] ? " · REV " + (state.revs[s.id] + 1) : "";
      const stamp = state.signed[s.id] ? "VALIDATED — " + s.validator : "DRAFT — UNVALIDATED (validator: " + s.validator + ")";
      lines.push("---", "", "## " + s.product + rev + "  `[" + stamp + "]`", "", state.products[s.id], "");
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
  function wireBanner() {
    const runAll = $("#engRunAll");
    if (runAll) runAll.addEventListener("click", () => {
      if (missingInputs().length) { toast("SUBMIT KNOWLEDGE BANK AND INTENT WORKSHEET FIRST"); return; }
      runPhaseGroup([1], "review1", "PHASE 1 COMPLETE — COS REVIEW REQUIRED");
    });
    const ap1 = $("#engApprove1");
    if (ap1) ap1.addEventListener("click", () => runPhaseGroup([2], "review2", "MISSION ANALYSIS COMPLETE — COS REVIEW REQUIRED"));
    const ap2 = $("#engApprove2");
    if (ap2) ap2.addEventListener("click", () => {
      persistInputs();
      state.stage = "coa";
      save(state);
      render();
      toast("HUMANS TO THE MAP — ENTER THE COA");
      const gate = $(".human-gate:last-of-type");
      if (gate) gate.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    const ap4 = $("#engApprove4");
    if (ap4) ap4.addEventListener("click", () => runPhaseGroup([5], "validate", "ORDERS DRAFTED — VALIDATE & EXPORT"));
    const resetBtn = $("#engReset");
    if (resetBtn) resetBtn.addEventListener("click", () => {
      persistInputs();
      state.products = {};
      state.signed = {};
      state.revs = {};
      state.stage = "idle";
      save(state);
      render();
      toast("PRODUCTS CLEARED");
    });
  }

  function wire() {
    $$("#view-engine input, #view-engine textarea, #view-engine select").forEach((el) => {
      el.addEventListener("change", persistInputs);
    });

    // Readiness re-check without a full re-render (a render here would
    // replace sibling fields mid-edit and drop their values)
    ["purpose", "keyTasks", "endState", "risk"].forEach((k) => {
      const el = $("#intent_" + k);
      if (el) el.addEventListener("input", () => {
        state.intent[k] = el.value;
        save(state);
        if (state.stage === "idle") updateBanner();
      });
    });

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

    $$("[data-kbdel]").forEach((b) => b.addEventListener("click", () => {
      persistInputs();
      state.kb = state.kb.filter((d) => d.id !== b.dataset.kbdel);
      save(state);
      render();
      toast("DOCUMENT REMOVED");
    }));

    const coaEl = $("#eng_coa");
    if (coaEl) coaEl.addEventListener("input", () => {
      state.coa = coaEl.value;
      save(state);
      const btn = $("#engResume");
      if (btn) btn.disabled = !(state.coa.trim() && state.stage === "coa");
    });

    /* Stage transitions (banner buttons live in #engBanner) */
    wireBanner();

    const resume = $("#engResume");
    if (resume) resume.addEventListener("click", () => runPhaseGroup([4], "review4", "WARGAME COMPLETE — COS REVIEW REQUIRED"));

    /* Per-product revision */
    $$("[data-revise]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.revise;
      const fb = $('[data-fb="' + id + '"]');
      revise(id, fb ? fb.value : "");
    }));

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
