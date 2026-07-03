/* ==========================================================================
   MDMP Workflow Engine — multi-agent orchestration of the 3MBDE bot roster.

   Mirrors the document's ecosystem: AI Integrator, functional specialist
   bots (S2/S3/S4/FSO/ENG), Red Team agent, XO Coach — with the doctrinal
   boundary enforced in code: COA development is a hard HUMAN gate.

   Two engines:
     - Simulation: offline/DDIL-safe. Generates doctrinal skeleton products
       with [TBD] placeholders (zero fabrication tolerance).
     - Live: calls the Anthropic Messages API directly from the browser with
       the user's own API key.
   ========================================================================== */

const ENGINE = (function () {
  "use strict";

  /* ---------- Shared governance preamble (the Five Principles, as a system prompt) ---------- */
  const GOVERNANCE = `You are an AI staff-augmentation agent supporting a U.S. Army brigade staff during MDMP, operating under the brigade's Five Fundamental Principles of AI-Enabled Staff Work:
1. HUMAN-IN-THE-LOOP: You augment, never replace, professional military judgment. The human planner is the tactical author. You organize, format, synthesize, and challenge; you do not command, decide, or accept risk.
2. STAFF AUGMENTATION ONLY: You never author commander's intent, select the decisive operation, authorize fires, accept risk, or sign orders.
3. ZERO FABRICATION TOLERANCE: Never invent MGRS grids, DTGs, unit designations, task organization relationships, fires coordination data, casualty estimates, or supply quantities. If information is unavailable, write [TBD] and note the RFI. Every assumption must be paired with an RFI and LTIOV.
4. CITE SOURCES: Tag factual claims to the source document/paragraph provided. If you cannot cite a source, mark the claim as UNVERIFIED.
5. FORMAT BEFORE CONTENT: Follow the requested output format exactly. Do not overproduce — generate only the product requested.
Every output you produce is a DRAFT until a named human validator signs it.`;

  /* ---------- Bot roster (from the document's role-specific bot specs) ---------- */
  const BOTS = {
    integrator: {
      id: "integrator", label: "AI INTEGRATOR", roleName: "AS3 / AI Integrator",
      persona: "You are the AI Integrator (AS3 cell). You manage timelines, templates, and doctrine; synthesize commander guidance into structured inputs; enforce OPORD/WARNO structure; and flag inconsistencies across successive products."
    },
    s2: {
      id: "s2", label: "S2 BOT", roleName: "S2 Intelligence",
      persona: "You are the S2 Bot, specialized in IPOE, running estimates, PIR/CCIR development, and enemy course-of-action development. You preserve analyst judgment — you draft, the S2 validates."
    },
    s3: {
      id: "s3", label: "S3 BOT", roleName: "S3 Operations",
      persona: "You are the S3 Bot, focused on maneuver and air planning, OPORD production, and timeline management, including 1/3–2/3 planning-time discipline."
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
  /* Each step: id, phase, bot, product title, validator, prompt(ctx), sim(ctx), deps implied by order/group */
  const STEPS = [
    {
      id: "extract", phase: 1, bot: "integrator", product: "Higher Order Extraction",
      validator: "S3", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: Markdown with exactly these H2 sections: Specified Tasks, Implied Tasks, Essential Tasks (Recommended), Constraints & Restraints, Command Relationships, Control Measures, Critical Deadlines, RFIs. Bullet lists only. Cite the source paragraph for each item where possible; mark unknowns [TBD].

Analyze the higher headquarters order below for ${c.unit}. Extract the mission-analysis factors into the format above. Do not generate a WARNO or any other product.

HIGHER HQ: ${c.hhq}
RECEIPT OF MISSION: ${c.receiptDtg}
--- HIGHER ORDER TEXT ---
${c.order}`,
      sim: (c) => `## Specified Tasks\n- [Extract from higher order paragraph 3 — TBD pending staff read] (source: [TBD])\n- ${c.unit} conducts operations per higher intent (source: HHQ order, para [TBD])\n\n## Implied Tasks\n- Establish planning timeline IAW 1/3–2/3 rule from receipt ${c.receiptDtg}\n- Conduct knowledge bank validation of uploaded doctrine and ${c.hhq} order\n\n## Essential Tasks (Recommended)\n- [TBD — requires S3 validation against higher mission statement]\n\n## Constraints & Restraints\n- [TBD — extract from higher order coordinating instructions]\n\n## Command Relationships\n- ${c.unit} under ${c.hhq} [relationship TBD — verify against Annex A]\n\n## Control Measures\n- [GRID TBD] — AO boundaries pending overlay\n\n## Critical Deadlines\n- OPORD publish NLT ${c.publishDtg} (1/3 point)\n\n## RFIs\n1. Confirm task organization effective DTG (LTIOV: [TBD])\n2. Confirm AO boundary grids against ATAK overlay (LTIOV: [TBD])`
    },
    {
      id: "warno1", phase: 1, bot: "integrator", product: "WARNO #1 (Draft)",
      validator: "S3", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: Doctrinally formatted WARNO IAW FM 5-0: heading (unit, DTG, WARNO number), Situation (1), Mission (2 — higher mission and intent incorporated verbatim where provided), Execution (3 — initial timeline and instructions), Sustainment (4), Command and Signal (5). Use [TBD] for all unknown grids, task org, and times. Keep under 400 words.

Using the extraction below and the higher order, draft WARNO #1 for ${c.unit}, nested under ${c.hhq}. Receipt of mission ${c.receiptDtg}; brigade OPORD publish NLT ${c.publishDtg}. Do not invent data.

--- EXTRACTION ---
${c.products.extract || "[none]"}
--- COMMANDER'S INITIAL GUIDANCE ---
${c.guidance || "[none provided]"}`,
      sim: (c) => `WARNING ORDER #1 — ${c.unit}\nDTG: ${c.receiptDtg}\nReferences: ${c.hhq} OPORD [number TBD]\n\n1. SITUATION. See ${c.hhq} OPORD paragraph 1. Enemy and friendly situation [TBD pending S2 refinement].\n\n2. MISSION. ${c.unit} [mission statement TBD — nested verbatim under higher mission and intent upon commander approval].\n\n3. EXECUTION.\n   a. Planning timeline: Receipt of mission ${c.receiptDtg}. Brigade OPORD publish NLT ${c.publishDtg} (1/3 point). Mission analysis brief [TBD]. COA DEV/analysis [TBD].\n   b. Movement/reconnaissance instructions: [TBD].\n   c. CCIR: Initial CCIR pending commander's guidance.\n\n4. SUSTAINMENT. Current sustainment posture per LOGSTAT. No change until OPORD.\n\n5. COMMAND AND SIGNAL. No change. Acknowledge receipt.\n\nDRAFT — NOT VALID UNTIL S3 SIGN-OFF.`
    },
    {
      id: "timeline", phase: 1, bot: "s3", product: "Planning Timeline (1/3–2/3)",
      validator: "S3", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: A markdown table with columns DTG | Event | Owner | Notes, followed by a one-line statement of the brigade 1/3 window. All computed DTGs must derive arithmetically from receipt ${c.receiptDtg} and publish NLT ${c.publishDtg}; if either input is not a parseable DTG, mark computed rows [TBD] rather than guessing.

Generate the brigade planning timeline for ${c.unit}: WARNO #1 within one hour of receipt, mission analysis brief, WARNO #2, COA development (HUMAN-LED — no AI authorship), COA analysis/wargame, COA decision + WARNO #3, orders production with voice-to-doctrine support, OPORD publish, and confirmation brief windows preserving the subordinate 2/3.`,
      sim: (c) => `| DTG | Event | Owner | Notes |\n|---|---|---|---|\n| ${c.receiptDtg} | Receipt of Mission | S3 | Group chat stood up; knowledge bank verified |\n| ${c.receiptDtg} +1HR | WARNO #1 released | S3 | AI-drafted, S3-validated |\n| [TBD] | Mission Analysis Brief | XO | Staff enters with working products |\n| [TBD] | WARNO #2 | S3 | Includes approved mission statement, CCIR |\n| [TBD] | COA Development | CDR/S3/Plans | HUMAN-LED — AI takes a back seat |\n| [TBD] | COA Analysis / Wargame | XO | XO Coach questions walked into sync meeting |\n| [TBD] | COA Decision + WARNO #3 | CDR | Commander decides |\n| [TBD] | Orders Production | Staff | Voice-to-doctrine first draft ~30 min |\n| ${c.publishDtg} | OPORD PUBLISH (NLT) | S3 | 1/3 point — battalion 2/3 protected |\n\nBrigade 1/3 window: ${c.receiptDtg} → ${c.publishDtg}. Compute exact interior DTGs with the Timeline Calculator tab.`
    },
    /* ---------- Phase 2: parallel running estimates ---------- */
    {
      id: "est_s2", phase: 2, bot: "s2", product: "S2 Running Estimate + CCIR",
      validator: "S2 section chief", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: H2 sections: Facts, Assumptions (each with paired RFI and LTIOV), Enemy Situation & Capabilities, Terrain & Weather Effects, Recommended PIR, Recommended CCIR Linkage (tie each PIR to a commander decision or phase transition). Mark all unknowns [TBD]. Do NOT develop friendly COAs.

Draft the S2 running estimate for ${c.unit} from the higher order and extraction below.

--- HIGHER ORDER ---\n${c.order}\n--- EXTRACTION ---\n${c.products.extract || ""}\n--- COMMANDER'S GUIDANCE ---\n${c.guidance || "[none]"}`,
      sim: (c) => `## Facts\n- Higher order received ${c.receiptDtg} from ${c.hhq} (source: order header)\n\n## Assumptions\n- A1: Enemy disposition per ${c.hhq} Annex B remains current. RFI: request updated INTSUM. LTIOV: [TBD]\n\n## Enemy Situation & Capabilities\n- [TBD — extract from Annex B; no enemy data fabricated]\n\n## Terrain & Weather Effects\n- [TBD — pending MCOO and light/weather data]\n\n## Recommended PIR\n1. Will enemy commit reserve before [PHASE TBD]? \n2. [TBD]\n\n## Recommended CCIR Linkage\n- PIR 1 → CDR decision: commit of brigade reserve. Phase transition: [TBD].`
    },
    {
      id: "est_s3", phase: 2, bot: "s3", product: "S3 Running Estimate",
      validator: "S3", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: H2 sections: Facts, Assumptions (paired RFI + LTIOV), Friendly Forces & Task Organization, Maneuver Considerations, Recommended FFIR. Mark unknowns [TBD]. Do NOT propose courses of action — COA development is human-led.

Draft the S3 running estimate for ${c.unit}.\n--- HIGHER ORDER ---\n${c.order}\n--- EXTRACTION ---\n${c.products.extract || ""}`,
      sim: (c) => `## Facts\n- ${c.unit} planning window: ${c.receiptDtg} to ${c.publishDtg}\n\n## Assumptions\n- A1: Task organization per current MTOE remains effective. RFI: confirm attachments/detachments with ${c.hhq} G3. LTIOV: [TBD]\n\n## Friendly Forces & Task Organization\n- [TBD — verify against Annex A; no unit designations fabricated]\n\n## Maneuver Considerations\n- COA development reserved for commander, plans officer, and S3 at the map.\n\n## Recommended FFIR\n1. Loss of [key platform/capability TBD] below [threshold TBD]\n2. [TBD]`
    },
    {
      id: "est_s4", phase: 2, bot: "s4", product: "S4 Sustainment Estimate",
      validator: "S4 / SPO", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: H2 sections: Facts, Assumptions (paired RFI + LTIOV), Sustainment Forecast by Phase, Supply Triggers, Route Risk Assessment, Shortfalls & Recommendations. Never invent supply quantities — use [TBD] where LOGSTAT data is not provided.

Draft the S4 sustainment estimate for ${c.unit}.\n--- HIGHER ORDER ---\n${c.order}\n--- LOGSTAT / SUSTAINMENT DATA PROVIDED ---\n${c.logstat || "[none provided — use doctrinal planning factors and mark quantities TBD]"}`,
      sim: (c) => `## Facts\n- No LOGSTAT export provided to this session.\n\n## Assumptions\n- A1: CSR remains at currently published rates. RFI: confirm CSR with ${c.hhq} G4. LTIOV: [TBD]\n\n## Sustainment Forecast by Phase\n- Phase [TBD]: CL III/V consumption [TBD — requires LOGTAK/GCSS-A export]\n\n## Supply Triggers\n- Trigger: CL V below [TBD]% → emergency resupply request\n\n## Route Risk Assessment\n- MSR [TBD]: risk [TBD] — pending route status\n\n## Shortfalls & Recommendations\n- Ingest LOGSTAT export to generate evidence-backed forecasts (quantities not fabricated).`
    },
    {
      id: "est_fso", phase: 2, bot: "fso", product: "Fires Running Estimate",
      validator: "FSO + maneuver CDR", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: H2 sections: Facts, Assumptions (paired RFI + LTIOV), Available Fires Assets, Fires Considerations by Phase, Draft Trigger Logic (mark every grid [GRID TBD]), Coordination Requirements. Never fabricate TRPs, range fans, or grids.

Draft the fires running estimate for ${c.unit}.\n--- HIGHER ORDER ---\n${c.order}\n--- EXTRACTION ---\n${c.products.extract || ""}`,
      sim: (c) => `## Facts\n- Fires assets per ${c.hhq} Annex D: [TBD — not fabricated]\n\n## Assumptions\n- A1: DS battalion remains DS to ${c.unit}. RFI: confirm with ${c.hhq} FSCOORD. LTIOV: [TBD]\n\n## Available Fires Assets\n- [TBD — verify against Annex D]\n\n## Fires Considerations by Phase\n- Phase [TBD]: priority of fires [TBD]\n\n## Draft Trigger Logic\n- Shift from [GRID TBD] to [GRID TBD] when [condition TBD] — REQUIRES FSO + maneuver commander validation against TRPs and range fans before any rehearsal.\n\n## Coordination Requirements\n- A2C2 deconfliction for [TBD]; FSCM review at COA decision.`
    },
    {
      id: "est_eng", phase: 2, bot: "eng", product: "Engineer Running Estimate",
      validator: "Brigade Engineer", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: H2 sections: Facts, Assumptions (paired RFI + LTIOV), Mobility Corridors, Obstacle Intelligence, Recommended Obstacle Effects (disrupt/turn/fix/block) by area, Engineer Task Considerations. Mark all grids [GRID TBD].

Draft the engineer running estimate for ${c.unit}.\n--- HIGHER ORDER ---\n${c.order}\n--- EXTRACTION ---\n${c.products.extract || ""}`,
      sim: (c) => `## Facts\n- Engineer task organization: [TBD — verify Annex A]\n\n## Assumptions\n- A1: Route clearance assets available D-day. RFI: confirm with ${c.hhq} ENCOORD. LTIOV: [TBD]\n\n## Mobility Corridors\n- [TBD — pending MCOO]\n\n## Obstacle Intelligence\n- [TBD — no obstacle data fabricated]\n\n## Recommended Obstacle Effects\n- Area [TBD]: TURN enemy into EA [TBD]\n\n## Engineer Task Considerations\n- Breach/gap-crossing requirement [TBD] drives task organization timing.`
    },
    {
      id: "redteam1", phase: 2, bot: "redteam", product: "Red Team Proof — Mission Analysis Products",
      validator: "XO", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: A numbered discrepancy list. Each item: [PRODUCT] — [SEVERITY: CRITICAL/MAJOR/MINOR] — finding — recommended correction. End with a one-line completeness verdict. Do not rewrite the products.

Red-team the following draft products for ${c.unit}: gaps, bad assumptions, DTG errors, inconsistencies between products, missing RFI/LTIOV pairings, fabricated-looking data (any specific grid, quantity, or unit designation not traceable to the higher order), and doctrinal noncompliance.

--- WARNO #1 ---\n${c.products.warno1 || ""}\n--- TIMELINE ---\n${c.products.timeline || ""}\n--- S2 ESTIMATE ---\n${c.products.est_s2 || ""}\n--- S3 ESTIMATE ---\n${c.products.est_s3 || ""}\n--- S4 ESTIMATE ---\n${c.products.est_s4 || ""}\n--- FIRES ESTIMATE ---\n${c.products.est_fso || ""}\n--- ENGINEER ESTIMATE ---\n${c.products.est_eng || ""}`,
      sim: () => `1. [WARNO #1] — MAJOR — Mission statement is [TBD]; WARNO cannot be released without an approved mission statement. Recommend commander approval before release.\n2. [ALL ESTIMATES] — MAJOR — Multiple assumptions lack LTIOV. Recommend S3 assign LTIOV to every RFI before the MA brief.\n3. [TIMELINE] — MINOR — Interior milestone DTGs are [TBD]; compute with the Timeline Calculator and republish.\n4. [CROSS-PRODUCT] — MINOR — Verify phase naming is identical across S2/S4/FSO estimates before the MA brief.\n\nVERDICT: Products are structurally sound drafts; no fabricated data detected; not releasable until named validators sign.`
    },
    /* ---------- Phase 4 (Phase 3 is the human gate) ---------- */
    {
      id: "xoquestions", phase: 4, bot: "xocoach", product: "XO Coach — Wargame Questions",
      validator: "XO", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: Numbered questions grouped under H2 headings by warfighting function (Intelligence, Movement & Maneuver, Fires, Sustainment, Protection, C2). 2-4 questions each. Each question must name the staff section that owes the answer and reference a specific element of the COA or an estimate.

The commander's staff developed this course of action (HUMAN-authored — do not modify or judge its selection). Generate adversarial wargame questions that stress-test it, including timing failures (e.g., what happens if the main effort is 30 minutes early/late) and passage-of-lines vulnerabilities.

--- HUMAN COA ---\n${c.coa}\n--- RUNNING ESTIMATES SUMMARY ---\nS2: ${trunc(c.products.est_s2)}\nS4: ${trunc(c.products.est_s4)}\nFIRES: ${trunc(c.products.est_fso)}`,
      sim: (c) => `## Intelligence\n1. S2: What indicator confirms the enemy reserve has committed, and is a collection asset tasked against it with an LTIOV that beats the decision point?\n2. S2: If the COA's assumption about enemy disposition is wrong, which phase breaks first?\n\n## Movement & Maneuver\n3. S3: If the main effort arrives 30 minutes early at [objective TBD], is the fires shift trigger condition-based or time-based — and who owns the call?\n4. S3: Where exactly does FPOL occur, and which control measures deconflict passing/stationary units?\n\n## Fires\n5. FSO: Can the shift matrix survive a comms-degraded environment — what is the backup trigger?\n\n## Sustainment\n6. S4: Which phase consumes CL V fastest, and does the trigger fire early enough given route risk?\n\n## Protection\n7. ADA: What is the RED AIR response posture during the most exposed phase?\n\n## C2\n8. S6: Where does C2 transfer between phases and what is the PACE plan at that seam?`
    },
    {
      id: "redteam2", phase: 4, bot: "redteam", product: "Red Team — COA Gap Analysis",
      validator: "XO", parallel: true,
      prompt: (c) => `OUTPUT FORMAT: Numbered list. Each item: [SEVERITY: CRITICAL/MAJOR/MINOR] — gap or inconsistency between the COA and the running estimates — recommended staff action. Do not evaluate whether the COA is a good plan; identify only gaps, unsourced data, and synchronization risks.

Analyze the HUMAN-authored COA against the running estimates for ${c.unit}.

--- HUMAN COA ---\n${c.coa}\n--- ESTIMATES ---\nS2: ${trunc(c.products.est_s2)}\nS3: ${trunc(c.products.est_s3)}\nS4: ${trunc(c.products.est_s4)}\nFIRES: ${trunc(c.products.est_fso)}\nENG: ${trunc(c.products.est_eng)}`,
      sim: () => `1. [MAJOR] — COA phases are not yet mapped to the S4 sustainment forecast; consumption by phase is [TBD]. Recommend S4 align forecast to COA phasing before wargame.\n2. [MAJOR] — Fires trigger logic in the estimate contains [GRID TBD] placeholders; wargame cannot validate shifts until FSO populates TRPs.\n3. [MINOR] — Confirm COA terminology (objective/phase names) matches the control measures list from the higher-order extraction.\n4. [MINOR] — Engineer obstacle effects not yet tied to COA engagement areas.`
    },
    /* ---------- Phase 5 ---------- */
    {
      id: "opord", phase: 5, bot: "integrator", product: "OPORD Draft (Para 1–3 Shell)",
      validator: "Section chiefs → CDR signs", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: OPORD paragraphs 1 (Situation), 2 (Mission) and 3 (Execution) IAW FM 5-0. Paragraph 3 must include: commander's intent placeholder marked [CDR PROVIDES — NON-DELEGABLE], concept of operations by phase, scheme of maneuver, scheme of fires, one-line task statements to subordinate units (use [UNIT TBD] where task org unconfirmed), coordinating instructions with CCIR, and an execution timeline. Use [TBD]/[GRID TBD] for all unknowns. This is a DRAFT shell — do not author commander's intent or accept risk.

Assemble the OPORD draft for ${c.unit} from the human COA and validated staff products.

--- HUMAN COA ---\n${c.coa}\n--- WARNO #1 ---\n${trunc(c.products.warno1)}\n--- EXTRACTION ---\n${trunc(c.products.extract)}\n--- ESTIMATES ---\nS2: ${trunc(c.products.est_s2)}\nS3: ${trunc(c.products.est_s3)}\nS4: ${trunc(c.products.est_s4)}\nFIRES: ${trunc(c.products.est_fso)}\nENG: ${trunc(c.products.est_eng)}\n--- WARGAME OUTPUTS ---\n${trunc(c.products.xoquestions)}\n${trunc(c.products.redteam2)}`,
      sim: (c) => `OPORD [NUMBER TBD] — ${c.unit}\nReferences: ${c.hhq} OPORD [TBD]; map sheets [TBD]. Time zone: [TBD].\n\n1. SITUATION.\n   a. Enemy: per S2 running estimate and ${c.hhq} Annex B [details TBD].\n   b. Friendly: ${c.hhq} mission and intent [incorporate verbatim — TBD].\n   c. Attachments/Detachments: [TBD — verify Annex A].\n\n2. MISSION. [Approved mission statement — CDR approval required.]\n\n3. EXECUTION.\n   Commander's Intent: [CDR PROVIDES — NON-DELEGABLE].\n   a. Concept of Operations: Derived from commander-selected COA — ${firstLine(c.coa)} [phases TBD].\n   b. Scheme of Maneuver: [Built from human COA — populate control measures; grids TBD].\n   c. Scheme of Fires: [FSO validates triggers against TRPs and range fans before rehearsal].\n   d. Tasks to Subordinate Units:\n      (1) [UNIT TBD]: [one-line task and purpose].\n      (2) [UNIT TBD]: [one-line task and purpose].\n   e. Coordinating Instructions: CCIR per approved list; every assumption carries an RFI + LTIOV; execution timeline aligned to phases.\n\nDRAFT SHELL — section chiefs validate; commander signs. AI did not author intent, select the decisive operation, or accept risk.`
    },
    {
      id: "redteam3", phase: 5, bot: "redteam", product: "Final Consistency Check",
      validator: "XO", parallel: false,
      prompt: (c) => `OUTPUT FORMAT: Numbered discrepancy list ([SEVERITY] — finding — correction), then an H2 "Release Checklist" with the named validator for each product class (mission statement/intent → Commander; fires → FSO + maneuver CDR; estimates → WfF chiefs; all products → section-chief sign-off). Do not rewrite products.

Run the final consistency check across ALL products for ${c.unit} before publication: mismatched labels and phase names, inconsistent DTGs, tasks in the OPORD not supported by an estimate, [TBD]s that must be resolved before release vs. acceptable RFIs, and any unvalidated fabrication risk.

--- OPORD DRAFT ---\n${c.products.opord || ""}\n--- WARNO #1 ---\n${trunc(c.products.warno1)}\n--- TIMELINE ---\n${trunc(c.products.timeline)}\n--- COA ---\n${trunc(c.coa)}`,
      sim: () => `1. [CRITICAL] — Mission statement and commander's intent remain [TBD]: OPORD is not releasable until the commander provides intent and approves the mission statement.\n2. [MAJOR] — Tasks to subordinate units contain [UNIT TBD]; resolve task organization against Annex A before publication.\n3. [MINOR] — Ensure WARNO #1 timeline DTGs match the OPORD execution timeline after final computation.\n\n## Release Checklist\n- Mission statement & commander's intent → COMMANDER approval\n- Fires products → FSO + maneuver commander validation (before rehearsal)\n- Running estimates → warfighting-function chiefs sign for accuracy\n- Every fact → cross-referenced: units vs Annex A, grids vs ATAK, DTGs vs timeline, enemy vs Annex B\n- All products → section-chief sign-off, then CDR signs the order`
    }
  ];

  const PHASES = {
    1: { title: "Phase 1 — Receipt of Mission", note: "Integrator extracts the higher order, drafts WARNO #1, and builds the timeline." },
    2: { title: "Phase 2 — Mission Analysis", note: "Functional specialist bots draft running estimates in parallel; Red Team proofs the batch." },
    3: { title: "Phase 3 — COA Development", note: "DOCTRINAL BOUNDARY. Humans at the map. The engine will not proceed without a human-authored COA." },
    4: { title: "Phase 4 — COA Analysis / Wargame", note: "XO Coach stress-tests the human COA; Red Team runs gap analysis." },
    5: { title: "Phase 5 — Orders Production", note: "Integrator assembles the OPORD shell; Red Team runs the final consistency check." },
    6: { title: "Phase 6 — Validation & Export", note: "Named validators sign each product class. Unsigned products export stamped DRAFT." }
  };

  function trunc(s) { return (s || "").slice(0, 2500); }
  function firstLine(s) { return (s || "").split("\n")[0].slice(0, 160); }

  /* ---------- Live engine: Anthropic Messages API from the browser ---------- */
  async function callClaude(cfg, bot, userPrompt) {
    const body = {
      model: cfg.model,
      max_tokens: 8192,
      system: GOVERNANCE + "\n\n" + BOTS[bot].persona,
      messages: [{ role: "user", content: userPrompt }]
    };
    // Opus/Sonnet 4.6+ support adaptive thinking; enable it for better staff reasoning.
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

  /* ---------- Simulation engine ---------- */
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
      const serial = steps.filter((s) => !s.parallel);
      // serial steps that come before the parallel group keep document order
      for (const s of steps) {
        if (s.parallel) continue;
        // run any parallel group positioned before this serial step
        const idx = steps.indexOf(s);
        const pendingParallel = parallel.filter((p) => steps.indexOf(p) < idx && !ctx.products[p.id] && !ctx._ran[p.id]);
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
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* private mode */ }
  }

  let state = Object.assign({
    unit: "3MBDE, 101st ABN DIV (AASLT)", hhq: "101st ABN DIV",
    receiptDtg: "", publishDtg: "", order: "", guidance: "", logstat: "",
    coa: "", mode: "sim", model: "claude-opus-4-8", apiKey: "",
    products: {}, signed: {}
  }, load());

  let running = false;

  function persistInputs() {
    ["unit", "hhq", "receiptDtg", "publishDtg", "order", "guidance", "logstat", "coa"].forEach((k) => {
      const el = $("#eng_" + k);
      if (el) state[k] = el.value;
    });
    state.mode = $("#engMode").value;
    state.model = $("#engModel").value;
    state.apiKey = $("#engKey").value;
    save(state);
  }

  function ctx() {
    return {
      unit: state.unit || "[UNIT TBD]", hhq: state.hhq || "[HHQ TBD]",
      receiptDtg: state.receiptDtg || "[DTG TBD]", publishDtg: state.publishDtg || "[DTG TBD]",
      order: state.order || "[No higher order text provided]",
      guidance: state.guidance, logstat: state.logstat, coa: state.coa,
      products: state.products, _ran: {}
    };
  }

  function cfg() {
    return { mode: state.mode, model: state.model, apiKey: state.apiKey.trim() };
  }

  /* ---------- Render ---------- */
  function render() {
    const el = $("#view-engine");
    if (!el) return;
    el.innerHTML =
      "<h2>MDMP Workflow Engine — Multi-Agent Orchestration</h2>" +
      '<p class="lede">The document\'s bot roster running as a pipeline: the AI Integrator, functional specialists (S2/S3/S4/FSO/ENG), Red Team agent, and XO Coach draft the products of MDMP in sequence and in parallel — with the doctrinal boundary enforced in code: <strong>COA development is a hard human gate</strong>, and every product requires a named validator\'s signature.</p>' +

      renderConfig() +
      '<div style="display:flex; gap:10px; margin:16px 0; flex-wrap:wrap;">' +
      '<button class="btn primary" id="engRun">▶ RUN PIPELINE (PHASES 1–2)</button>' +
      '<button class="btn danger" id="engReset">RESET ALL PRODUCTS</button>' +
      "</div>" +
      '<div id="engBoard">' + renderBoard() + "</div>";

    wire();
  }

  function renderConfig() {
    const s = state;
    return '<h3 class="section-label">Mission Inputs (the Knowledge Bank)</h3>' +
      '<div class="callout">Per the Five Rules: provide context. Paste the higher order — the engine never fabricates what you don\'t supply; unknowns come back as <span class="mono">[TBD]</span> with RFIs.</div>' +
      '<div class="calc-inputs">' +
      field("unit", "Unit", s.unit) +
      field("hhq", "Higher HQ", s.hhq) +
      field("receiptDtg", "Receipt of Mission (DTG)", s.receiptDtg, "e.g., 030600Z JUL 26") +
      field("publishDtg", "OPORD Publish NLT (DTG)", s.publishDtg, "e.g., 040600Z JUL 26") +
      "</div>" +
      area("order", "Higher HQ Order (paste text or key extracts)", s.order, 6) +
      area("guidance", "Commander's Initial Guidance (optional — voice-to-doctrine notes welcome)", s.guidance, 3) +
      area("logstat", "LOGSTAT / Sustainment Data (optional)", s.logstat, 2) +

      '<h3 class="section-label">Engine Mode</h3>' +
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
      '<div class="callout red"><strong>OPSEC:</strong> Live mode sends your inputs to a commercial API endpoint — the document\'s Challenge 6 applies. Do not paste classified or CUI material into live mode; prefer accredited-environment models for sensitive work. The key is stored only in this browser\'s localStorage. Rehearse in Simulation mode for degraded operations.</div>';
  }

  function field(k, label, val, ph) {
    return '<div class="field"><label>' + esc(label) + '</label><input id="eng_' + k + '" value="' + esc(val || "") + '" placeholder="' + esc(ph || "") + '"></div>';
  }
  function area(k, label, val, rows) {
    return '<div class="field"><label>' + esc(label) + '</label><textarea id="eng_' + k + '" rows="' + rows + '">' + esc(val || "") + "</textarea></div>";
  }
  function opt(v, label, cur) {
    return '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + esc(label) + "</option>";
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
    const done = ENGINE.STEPS.filter((s) => s.phase <= 2).every((s) => state.products[s.id]);
    return '<div class="agent-card human-gate">' +
      '<div class="agent-head"><span class="pill human">HUMAN ONLY</span><h4>Commander\'s Course of Action</h4>' +
      '<span class="agent-status ' + (state.coa ? "complete" : "gate") + '">' + (state.coa ? "COA ENTERED" : "AWAITING HUMANS AT THE MAP") + "</span></div>" +
      '<p class="use-note" style="padding:0 16px">AI is locked out of this step. The plans officer, commander, and S3 build the concept manually — against terrain, enemy disposition, and the commander\'s intent. Enter the selected COA (concept statement, phasing, main/supporting efforts, decisive point):</p>' +
      '<div style="padding:0 16px 14px">' +
      '<textarea id="eng_coa" rows="5" style="width:100%; background:var(--bg); border:1px solid var(--line); border-radius:6px; color:var(--text); font-family:var(--mono); font-size:0.8rem; padding:10px;">' + esc(state.coa || "") + "</textarea>" +
      '<div style="margin-top:10px"><button class="btn primary" id="engRunPhase4" ' + ((done && state.coa) ? "" : "disabled") + ">▶ CONTINUE — RUN WARGAME &amp; ORDERS (PHASES 4–5)</button>" +
      (done ? "" : ' <span class="pill">Run Phases 1–2 first</span>') +
      "</div></div></div>";
  }

  function renderValidation() {
    const products = ENGINE.STEPS.filter((s) => state.products[s.id]);
    if (!products.length) {
      return '<div class="callout">No products yet — run the pipeline. Every AI output is a draft until a qualified human validator signs for it.</div>';
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
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  async function run(phases) {
    if (running) { toast("PIPELINE ALREADY RUNNING"); return; }
    persistInputs();
    const c = cfg();
    if (c.mode === "live" && !c.apiKey) { toast("API KEY REQUIRED FOR LIVE MODE"); return; }
    if (phases[0] === 1 && !state.order.trim()) { toast("PASTE THE HIGHER ORDER FIRST"); return; }
    running = true;
    try {
      await ENGINE.runPhases(phases, ctx(), c, onState);
      toast(phases.includes(5) ? "PIPELINE COMPLETE — VALIDATE & EXPORT" : "PHASES 1–2 COMPLETE — HUMANS TO THE MAP");
    } catch (err) {
      toast("PIPELINE HALTED: " + String(err.message || err).slice(0, 60));
    } finally {
      running = false;
      render();
    }
  }

  function exportPacket() {
    const lines = [
      "# MDMP Planning Packet — " + state.unit,
      "_Generated by the AI-Enabled MDMP Workflow Engine. Derived from 3MBDE TTP (6 JUN 2026)._",
      "",
      "Receipt of Mission: " + (state.receiptDtg || "[TBD]") + " · OPORD NLT: " + (state.publishDtg || "[TBD]"),
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
  function wire() {
    $$("#view-engine input, #view-engine textarea, #view-engine select").forEach((el) => {
      el.addEventListener("change", persistInputs);
    });
    const coaEl = $("#eng_coa");
    if (coaEl) coaEl.addEventListener("input", () => {
      state.coa = coaEl.value;
      save(state);
      const btn = $("#engRunPhase4");
      const phase12Done = ENGINE.STEPS.filter((s) => s.phase <= 2).every((s) => state.products[s.id]);
      if (btn) btn.disabled = !(state.coa.trim() && phase12Done);
    });

    const runBtn = $("#engRun");
    if (runBtn) runBtn.addEventListener("click", () => run([1, 2]));
    const p4Btn = $("#engRunPhase4");
    if (p4Btn) p4Btn.addEventListener("click", () => run([4, 5]));
    const resetBtn = $("#engReset");
    if (resetBtn) resetBtn.addEventListener("click", () => {
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
      state.signed[c.dataset.sign] = c.checked;
      save(state);
      render();
    }));
    const exp = $("#engExport");
    if (exp) exp.addEventListener("click", exportPacket);
  }

  render();
})();
