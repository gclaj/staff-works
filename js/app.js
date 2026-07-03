/* ==========================================================================
   AI-Enabled MDMP Staff Toolkit — application logic
   Static, offline-capable (DDIL-friendly). State persists in localStorage.
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const STORE = {
    get(key, fallback) {
      try { const v = localStorage.getItem("mdmp." + key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem("mdmp." + key, JSON.stringify(val)); } catch { /* private mode */ }
    }
  };

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
  }

  function copyText(text) {
    const done = () => toast("COPIED TO CLIPBOARD");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch { toast("COPY FAILED — SELECT MANUALLY"); }
    document.body.removeChild(ta);
  }

  /* ---------- DTG helpers ---------- */
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  function toDTG(date) {
    const p = (n) => String(n).padStart(2, "0");
    return p(date.getUTCDate()) + p(date.getUTCHours()) + p(date.getUTCMinutes()) + "Z " +
      MONTHS[date.getUTCMonth()] + " " + String(date.getUTCFullYear()).slice(-2);
  }
  function tickClock() {
    $("#dtgClock").textContent = "DTG " + toDTG(new Date());
  }
  tickClock();
  setInterval(tickClock, 30000);

  /* ---------- Navigation ---------- */
  const sidebar = $("#sidebar");
  $("#navToggle").addEventListener("click", () => sidebar.classList.toggle("open"));
  $$(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      $$(".view").forEach((v) => v.classList.remove("active"));
      $("#view-" + btn.dataset.view).classList.add("active");
      sidebar.classList.remove("open");
      window.scrollTo({ top: 0 });
    });
  });

  /* ---------- Shared render helpers ---------- */
  function cards(items, mapFn) {
    return '<div class="card-grid">' + items.map(mapFn).join("") + "</div>";
  }

  function checklist(id, items) {
    const state = STORE.get("check." + id, {});
    const doneCount = items.reduce((n, _, i) => n + (state[i] ? 1 : 0), 0);
    return (
      '<div class="checklist" data-checklist="' + id + '">' +
      '<div class="check-progress">' + doneCount + " / " + items.length + ' complete · <button class="btn danger" data-reset="' + id + '">RESET</button></div>' +
      items.map((item, i) =>
        '<label class="check-item' + (state[i] ? " done" : "") + '">' +
        '<input type="checkbox" data-idx="' + i + '"' + (state[i] ? " checked" : "") + ">" +
        "<span>" + item + "</span></label>"
      ).join("") +
      "</div>"
    );
  }

  function wireChecklists(root) {
    $$(".checklist", root).forEach((list) => {
      const id = list.dataset.checklist;
      list.addEventListener("change", (e) => {
        if (e.target.type !== "checkbox") return;
        const state = STORE.get("check." + id, {});
        state[e.target.dataset.idx] = e.target.checked;
        STORE.set("check." + id, state);
        e.target.closest(".check-item").classList.toggle("done", e.target.checked);
        const items = $$(".check-item input", list);
        const done = items.filter((c) => c.checked).length;
        $(".check-progress", list).childNodes[0].textContent = done + " / " + items.length + " complete · ";
      });
      $("[data-reset]", list).addEventListener("click", (e) => {
        e.preventDefault();
        STORE.set("check." + id, {});
        $$(".check-item input", list).forEach((c) => { c.checked = false; c.closest(".check-item").classList.remove("done"); });
        $(".check-progress", list).childNodes[0].textContent = "0 / " + $$(".check-item input", list).length + " complete · ";
      });
    });
  }

  /* ================= 01 OVERVIEW ================= */
  function renderOverview() {
    const el = $("#view-overview");
    el.innerHTML =
      "<h2>Overview — Artificial Staff, Human Command</h2>" +
      '<p class="lede">Between September 2025 and April 2026, 3D Mobile Brigade, 101st Airborne Division (AASLT) employed multi-agent AI within a collaborative LLM ecosystem across three consecutive events — a Staff Exercise, the JRTC Leader Training Program, and force-on-force JRTC Rotation 26-06 — maturing AI from a doctrinal drafting aid into a governed, role-based staff augmentation capability.</p>' +
      '<div class="callout"><strong>Bottom line:</strong> ' + esc(DATA.bottomLine) + "</div>" +

      '<h3 class="section-label">Key Findings</h3>' +
      cards(DATA.keyFindings, (f, i) =>
        '<div class="card"><span class="kicker">Finding ' + (i + 1) + "</span><h4>" + esc(f.title) + "</h4><p>" + esc(f.text) + "</p></div>") +

      '<h3 class="section-label">The Cognitive Time Problem</h3>' +
      '<div class="callout">The scarce commodity in headquarters operations is not software, hardware, or access to information. It is <strong>cognitive time</strong>. Under training-center and combat conditions, brigade staffs habitually break the 1/3–2/3 rule — spending disproportionate planning time on their own products and starving subordinates of the time they need to plan their own. AI compression of this clerical conveyor belt is the principal mechanism by which the brigade preserves cognitive time for the conceptual work that determines success in battle.</div>' +

      '<h3 class="section-label">The LLM Ecosystem Model</h3>' +
      cards(DATA.ecosystem, (e) =>
        '<div class="card"><h4>' + esc(e.role) + "</h4><p>" + esc(e.text) + "</p></div>") +

      '<h3 class="section-label">Five Fundamental Principles of AI-Enabled Staff Work</h3>' +
      '<p class="lede">Binding regardless of staff section, classification level, or duty position.</p>' +
      DATA.principles.map((p, i) =>
        '<div class="callout"><strong>' + (i + 1) + ". " + esc(p.title) + ":</strong> " + esc(p.text) + "</div>").join("") +

      '<h3 class="section-label">Maturation Arc — TiC 1.0 → TiC 2.0</h3>' +
      '<div class="table-wrap"><table><thead><tr><th>Dimension</th>' +
      DATA.evolution.events.map((e) => "<th>" + esc(e) + "</th>").join("") +
      "</tr></thead><tbody>" +
      DATA.evolution.dims.map((d, i) =>
        "<tr><td><strong>" + esc(d) + "</strong></td>" + DATA.evolution.rows[i].map((c) => '<td class="dim">' + esc(c) + "</td>").join("") + "</tr>").join("") +
      "</tbody></table></div>" +

      '<h3 class="section-label">Case Studies</h3>' +
      DATA.caseStudies.map((c) =>
        '<div class="card" style="margin-bottom:12px"><h4>' + esc(c.name) + "</h4><p>" + esc(c.text) + "</p></div>").join("");
  }

  /* ================= 02 MDMP WORKFLOW ================= */
  function renderWorkflow() {
    const el = $("#view-workflow");
    el.innerHTML =
      "<h2>MDMP Workflow — AI Integration Points by Step</h2>" +
      '<p class="lede">Focus AI heavily on Steps 1–2 (Receipt of Mission and Mission Analysis) — that is where AI provides the greatest time savings and decision impact, front-loading parallel COA development downstream. Click a step to expand.</p>' +
      '<div class="callout red"><strong>Doctrinal boundary:</strong> AI is excluded from COA development, determination of commander\'s intent, and approval-authority decisions — selecting the decisive operation, authorizing fires, accepting risk, signing orders. These functions are non-delegable to machines.</div>' +
      DATA.mdmpSteps.map((s, i) =>
        '<div class="step" data-step="' + i + '">' +
        '<div class="step-head">' +
        '<div class="step-num' + (s.humanOnly ? " human-only" : "") + '">' + esc(s.num) + "</div>" +
        '<div class="step-title"><h4>' + esc(s.title) + "</h4><p>" + esc(s.tagline) + "</p></div>" +
        (s.humanOnly ? '<span class="pill human">HUMAN ONLY</span>' : '<span class="pill ai">AI-Enabled</span>') +
        '<span class="step-caret">▶</span></div>' +
        '<div class="step-body">' +
        "<h5>" + (s.humanOnly ? "AI Posture" : "AI Applications") + "</h5><ul>" + s.aiUses.map((u) => "<li>" + esc(u) + "</li>").join("") + "</ul>" +
        "<h5>Human Responsibilities</h5><ul>" + s.humanUses.map((u) => "<li>" + esc(u) + "</li>").join("") + "</ul>" +
        "<h5>Group Chat Roster</h5><ul><li>" + esc(s.chat) + "</li></ul>" +
        "</div></div>").join("") +

      '<h3 class="section-label">Synchronization Across Warfighting Functions</h3>' +
      cards(DATA.wffSync, (w) => '<div class="card"><h4>' + esc(w.wff) + "</h4><p>" + esc(w.text) + "</p></div>");

    $$(".step-head", el).forEach((h) => h.addEventListener("click", () => h.parentElement.classList.toggle("open")));
  }

  /* ================= 03 PROMPT LIBRARY ================= */
  function highlightPlaceholders(text) {
    return esc(text).replace(/\[([A-Z0-9 /#&'’\-]+)\]/g, '<span class="ph">[$1]</span>');
  }

  function renderPrompts() {
    const el = $("#view-prompts");
    el.innerHTML =
      "<h2>Prompt Library</h2>" +
      '<p class="lede">Pre-tested, role-specific prompts codified from three operational events. Amber <span class="ph mono">[PLACEHOLDERS]</span> must be replaced with real data before use — never let the model fill them in for you.</p>' +
      '<div class="prompt-filters">' +
      DATA.promptCategories.map((c, i) => '<button class="filter-btn' + (i === 0 ? " active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>").join("") +
      "</div>" +
      '<div id="promptList"></div>' +
      '<h3 class="section-label">The Five Rules of Military AI Prompting</h3>' +
      '<p class="lede">These rules govern every AI interaction by staff officers and NCOs in the brigade.</p>' +
      DATA.promptingRules.map((r, i) =>
        '<div class="callout"><strong>' + (i + 1) + ". " + esc(r.title) + ":</strong> " + esc(r.text) + "</div>").join("");

    function draw(cat) {
      const list = DATA.prompts.filter((p) => cat === "All" || p.cat === cat);
      $("#promptList").innerHTML = list.map((p, i) =>
        '<div class="prompt-card">' +
        '<div class="prompt-meta"><span class="pill role">' + esc(p.role) + '</span><span class="pill">' + esc(p.cat) + "</span><h4>" + esc(p.title) + "</h4></div>" +
        '<p class="use-note">' + esc(p.note) + "</p>" +
        '<div class="prompt-text">' + highlightPlaceholders(p.text) + "</div>" +
        '<button class="btn primary" data-copy="' + i + '">COPY PROMPT</button>' +
        "</div>").join("");
      $$("[data-copy]", $("#promptList")).forEach((b) =>
        b.addEventListener("click", () => copyText(list[+b.dataset.copy].text)));
    }
    draw("All");

    $$(".filter-btn", el).forEach((b) => b.addEventListener("click", () => {
      $$(".filter-btn", el).forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      draw(b.dataset.cat);
    }));
  }

  /* ================= 04 PROMPT BUILDER ================= */
  function renderBuilder() {
    const el = $("#view-builder");
    const saved = STORE.get("builder", {});
    el.innerHTML =
      "<h2>Scaffolded Prompt Builder</h2>" +
      '<p class="lede">Builds a prompt using the 101st Airborne Division "scaffolding" structure for the complicated domain — role, purpose, reality, sources, analysis, format, quality gates, and a confirmation request. Fill what applies; empty sections are omitted.</p>' +
      '<div class="builder-grid"><div>' +
      DATA.builderFields.map((f) =>
        '<div class="field"><label>' + esc(f.label) + '</label><div class="hint">' + esc(f.hint) + "</div>" +
        '<textarea data-bkey="' + f.key + '" rows="' + f.rows + '" placeholder="' + esc(f.placeholder) + '">' + esc(saved[f.key] || "") + "</textarea></div>").join("") +
      '<button class="btn danger" id="builderClear">CLEAR ALL</button>' +
      "</div>" +
      '<div class="preview-panel"><div class="field"><label>Assembled Prompt</label></div>' +
      '<div class="preview-box" id="builderPreview"></div>' +
      '<div style="margin-top:10px; display:flex; gap:8px;">' +
      '<button class="btn primary" id="builderCopy">COPY ASSEMBLED PROMPT</button>' +
      "</div></div></div>";

    function assemble() {
      const parts = [];
      DATA.builderFields.forEach((f) => {
        const v = ($('[data-bkey="' + f.key + '"]', el).value || "").trim();
        if (v) parts.push(f.label + "\n" + v);
      });
      return parts.join("\n\n");
    }
    function refresh() {
      const text = assemble();
      $("#builderPreview").textContent = text || "— Fill in fields on the left to assemble a scaffolded prompt —";
      const state = {};
      DATA.builderFields.forEach((f) => { state[f.key] = $('[data-bkey="' + f.key + '"]', el).value; });
      STORE.set("builder", state);
    }
    $$("textarea[data-bkey]", el).forEach((t) => t.addEventListener("input", refresh));
    $("#builderCopy").addEventListener("click", () => {
      const text = assemble();
      if (!text) { toast("NOTHING TO COPY"); return; }
      copyText(text);
    });
    $("#builderClear").addEventListener("click", () => {
      $$("textarea[data-bkey]", el).forEach((t) => { t.value = ""; });
      refresh();
      toast("BUILDER CLEARED");
    });
    refresh();
  }

  /* ================= 05 TIMELINE CALCULATOR ================= */
  function renderTimeline() {
    const el = $("#view-timeline");
    const saved = STORE.get("timeline", {});
    el.innerHTML =
      "<h2>1/3–2/3 Planning Timeline Calculator</h2>" +
      '<p class="lede">Enter receipt of mission and the execution time (H-hour or defend-not-later-than). The brigade owns the first third of available time; subordinate battalions get the remaining two-thirds. Milestones mirror the 3MBDE battle rhythm — WARNO #1 within one hour of receipt.</p>' +
      '<div class="calc-inputs">' +
      '<div class="field"><label>Receipt of Mission</label><input type="datetime-local" id="tlReceipt" value="' + esc(saved.receipt || "") + '"></div>' +
      '<div class="field"><label>Execution / H-Hour</label><input type="datetime-local" id="tlExec" value="' + esc(saved.exec || "") + '"></div>' +
      '<div class="field"><label>&nbsp;</label><button class="btn primary" id="tlCalc" style="width:100%">COMPUTE TIMELINE</button></div>' +
      "</div>" +
      '<div id="tlResult"></div>';

    function fmt(d) { return toDTG(d) + " (" + d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) + " local)"; }

    function compute() {
      const rv = $("#tlReceipt").value, ev = $("#tlExec").value;
      const out = $("#tlResult");
      if (!rv || !ev) { out.innerHTML = '<div class="callout red"><strong>Missing input:</strong> set both receipt of mission and execution time.</div>'; return; }
      const r = new Date(rv), e = new Date(ev);
      const totalMs = e - r;
      if (totalMs <= 0) { out.innerHTML = '<div class="callout red"><strong>Invalid window:</strong> execution must be after receipt of mission.</div>'; return; }
      STORE.set("timeline", { receipt: rv, exec: ev });

      const publish = new Date(r.getTime() + totalMs / 3);
      const totalHrs = totalMs / 3600000;
      const bdeHrs = totalHrs / 3;
      const at = (frac) => new Date(r.getTime() + (totalMs / 3) * frac);

      const milestones = [
        { t: r, name: "Receipt of Mission", note: "Feed the higher order set to AI: surface specified/implied tasks, constraints, command relationships, critical deadlines. Stand up the Receipt of Mission group chat (CDR, S3, AS3/AI Integrator)." },
        { t: new Date(Math.min(r.getTime() + 3600000, publish.getTime())), name: "WARNO #1 Published", note: "Target: within one hour of receipt. AI-drafted, human-validated, nested under higher order with mission and intent verbatim." },
        { t: at(0.30), name: "Mission Analysis Brief", note: "Enter with a working product, not marked-up notes. CCIR linked to decisions; every assumption paired with an RFI and LTIOV. WARNO #2 follows." },
        { t: at(0.35), name: "COA Development (HUMAN)", note: "AI takes a back seat. Plans officer, commander, and S3 at the map — against terrain, enemy disposition, and commander's intent." },
        { t: at(0.55), name: "COA Analysis / Wargame", note: "XO Coach prompt stress-tests the plan across warfighting functions. Red Team agent proofs drafts for gaps, bad assumptions, DTG/MGRS errors." },
        { t: at(0.70), name: "COA Decision & WARNO #3", note: "Commander decides. AI never selects the decisive operation or accepts risk." },
        { t: at(0.75), name: "Orders Production Begins", note: "AI drafts OPORD paragraphs, task statements, execution timeline; voice-to-doctrine converts planner dialogue to a first draft in ~30 minutes. Consistency check across all derived products." },
        { t: publish, name: "OPORD PUBLISHED — 1/3 Point", note: "Brigade window closes. Section chiefs have signed every product. Subordinate battalions now own the remaining two-thirds." },
        { t: e, name: "Execution / H-Hour", note: "End of the 2/3 subordinate planning window." }
      ];

      const bdePct = 33.33;
      out.innerHTML =
        '<div class="callout"><strong>Available time:</strong> <span class="mono">' + totalHrs.toFixed(1) + ' hrs</span> total — brigade owns <span class="mono">' + bdeHrs.toFixed(1) + ' hrs</span>; battalions get <span class="mono">' + (totalHrs - bdeHrs).toFixed(1) + " hrs</span>. OPORD must publish NLT <strong>" + toDTG(publish) + "</strong>.</div>" +
        '<div class="split-bar"><div class="split-bde" style="width:' + bdePct + '%">BDE 1/3 · ' + bdeHrs.toFixed(1) + 'h</div><div class="split-bn" style="width:' + (100 - bdePct) + '%">BN 2/3 · ' + (totalHrs - bdeHrs).toFixed(1) + "h</div></div>" +
        '<ul class="timeline-list">' +
        milestones.map((m) =>
          '<li class="timeline-item"><span class="timeline-dtg">' + esc(fmt(m.t).split(" (")[0]) + '</span><div class="timeline-what"><strong>' + esc(m.name) + "</strong><span>" + esc(m.note) + "</span></div></li>").join("") +
        "</ul>" +
        '<div class="callout red"><strong>Habitual failure:</strong> under pressure, brigade staffs break the 1/3–2/3 rule and starve subordinates of planning time. AI compression of Steps 1–2 exists to protect the battalion two-thirds — hold the publish line.</div>';
    }

    $("#tlCalc").addEventListener("click", compute);
    if (saved.receipt && saved.exec) compute();
  }

  /* ================= 06 GOVERNANCE ================= */
  function renderGovernance() {
    const el = $("#view-governance");
    el.innerHTML =
      "<h2>Governance &amp; Validation</h2>" +
      '<p class="lede">Speed without governance produces faster confusion, not better plans. Build the governance first — field the tools second. A unit without product governance will not improve its situation by adopting tools that multiply output.</p>' +

      '<h3 class="section-label">Validation Hierarchy by Product Class</h3>' +
      '<div class="table-wrap"><table><thead><tr><th>Product Class</th><th>Named Validator</th><th>Standard</th></tr></thead><tbody>' +
      DATA.validationHierarchy.map((v) =>
        "<tr><td><strong>" + esc(v.product) + '</strong></td><td class="mono">' + esc(v.validator) + '</td><td class="dim">' + esc(v.note) + "</td></tr>").join("") +
      "</tbody></table></div>" +

      '<h3 class="section-label">Four Governance Failure Modes</h3>' +
      cards(DATA.governanceFailures, (g) =>
        '<div class="card"><span class="kicker">Failure Mode</span><h4>' + esc(g.mode) + "</h4><p>" + esc(g.text) + '</p><p style="margin-top:8px"><strong style="color:var(--green)">Mitigation:</strong> ' + esc(g.fix) + "</p></div>") +

      '<h3 class="section-label">Hidden-Confidence / Hallucination Check (run before publishing)</h3>' +
      '<div class="callout red"><strong>Hidden confidence is the most operationally dangerous failure mode in an AI-enabled headquarters.</strong> An incorrect unit designation, an inverted phase line, a fabricated control-measure name, a time-distance calculation off by forty minutes — polish becomes a hazard.</div>' +
      checklist("hallucination", DATA.hallucinationChecklist.map(esc)) +

      '<h3 class="section-label">Knowledge Bank Preparation Checklist (run pre-exercise)</h3>' +
      checklist("kb", DATA.knowledgeBankChecklist.map(esc)) +
      '<div class="card"><span class="kicker">Naming Convention Examples</span><ul style="list-style:none">' +
      DATA.namingExamples.map((n) => '<li class="mono" style="font-size:0.8rem; padding:3px 0">' + esc(n) + "</li>").join("") +
      "</ul></div>";
    wireChecklists(el);
  }

  /* ================= 07 CP OPS ================= */
  function renderCpOps() {
    const el = $("#view-cpops");
    el.innerHTML =
      "<h2>AI in Command Post Operations</h2>" +
      '<p class="lede">The same governance principles that apply during MDMP apply with greater intensity in current operations, where tempo is faster and the cost of unvalidated output is higher. <strong>AI organizes; the battle captain decides; the commander commands.</strong></p>' +

      '<h3 class="section-label">Five Primary Use Cases</h3>' +
      cards(DATA.cpUseCases, (u) => '<div class="card"><h4>' + esc(u.name) + "</h4><p>" + esc(u.text) + "</p></div>") +

      '<h3 class="section-label">CP Initialization — Context Load (before ANY traffic)</h3>' +
      checklist("ctxload", DATA.contextLoad.map(esc)) +

      '<h3 class="section-label">Auto-Flag URGENT</h3>' +
      '<p class="lede">AI auto-flags the following as URGENT the moment they appear in traffic:</p>' +
      '<div class="card-grid">' + DATA.urgentFlags.map((u) =>
        '<div class="card" style="border-left:4px solid var(--red)"><p style="color:var(--text)">' + esc(u) + "</p></div>").join("") + "</div>" +

      '<h3 class="section-label">AI Will NOT Infer</h3>' +
      '<div class="callout red"><strong>When inference is required, AI requests confirmation rather than guessing.</strong></div>' +
      "<ul class=\"timeline-list\">" + DATA.willNotInfer.map((w) =>
        '<li class="timeline-item"><span class="timeline-dtg mono" style="color:var(--red)">NO INFERENCE</span><div class="timeline-what"><strong>' + esc(w) + "</strong></div></li>").join("") + "</ul>" +

      '<h3 class="section-label">CP Battle Rhythm — AI Task Schedule</h3>' +
      '<div class="table-wrap"><table><thead><tr><th>Trigger / Time</th><th>AI Product</th></tr></thead><tbody>' +
      DATA.battleRhythm.map((b) => '<tr><td class="mono">' + esc(b.when) + "</td><td>" + esc(b.what) + "</td></tr>").join("") +
      "</tbody></table></div>" +

      '<h3 class="section-label">Operating Rules</h3>' +
      DATA.cpRules.map((r) => '<div class="callout">' + esc(r) + "</div>").join("");
    wireChecklists(el);
  }

  /* ================= 08 CHALLENGES & PLAYBOOK ================= */
  function renderPlaybook() {
    const el = $("#view-playbook");
    el.innerHTML =
      "<h2>Challenges, Best Practices &amp; What Not to Do</h2>" +
      '<p class="lede">Seven challenges observed across three events, each with fielded solutions — plus the codified best practices and prohibitions. Click a challenge to expand.</p>' +

      '<h3 class="section-label">Challenges &amp; Solutions</h3>' +
      DATA.challenges.map((c, i) =>
        '<div class="acc"><div class="acc-head"><span class="pill">CH ' + (i + 1) + "</span><h4>" + esc(c.title) + '</h4><span class="acc-caret">▶</span></div>' +
        '<div class="acc-body"><p class="problem">' + esc(c.problem) + "</p><ul>" +
        c.solutions.map((s) => "<li>" + s + "</li>").join("") + "</ul></div></div>").join("") +

      '<h3 class="section-label">Best Practices</h3>' +
      cards(DATA.bestPractices, (b, i) =>
        '<div class="card"><span class="kicker">Practice ' + (i + 1) + "</span><h4>" + esc(b.title) + "</h4><p>" + esc(b.text) + "</p></div>") +

      '<h3 class="section-label">What Right vs. Wrong Looks Like</h3>' +
      '<div class="rw-grid">' +
      '<div class="rw-col right"><header>What Right Looks Like</header><ul>' + DATA.rightLooksLike.map((r) => "<li>" + esc(r) + "</li>").join("") + "</ul></div>" +
      '<div class="rw-col wrong"><header>What Wrong Looks Like</header><ul>' + DATA.wrongLooksLike.map((w) => "<li>" + esc(w) + "</li>").join("") + "</ul></div>" +
      "</div>" +

      '<h3 class="section-label">What Not to Do</h3>' +
      DATA.doNots.map((d) => '<div class="callout red"><strong>' + esc(d.title) + ":</strong> " + esc(d.text) + "</div>").join("");

    $$(".acc-head", el).forEach((h) => h.addEventListener("click", () => h.parentElement.classList.toggle("open")));
  }

  /* ================= 09 METRICS ================= */
  function renderMetrics() {
    const el = $("#view-metrics");
    el.innerHTML =
      "<h2>Metrics Tracker</h2>" +
      '<p class="lede">Track the impact of AI-enabled MDMP across events: time to WARNO #1, doctrinal and format errors, staff-ready outputs, planning cycle compression, and staff confidence. These metrics demonstrate value and identify areas for improvement. Benchmarks: 3MBDE published WARNO #1 in 10 minutes at LTP and a full OPORD in 23 hours at JRTC 26-06. Data is stored locally in this browser.</p>' +
      '<h3 class="section-label">Log an Event</h3>' +
      '<div class="metric-form">' +
      '<div class="field"><label>Event Name</label><input id="mName" placeholder="e.g., OCT WFX 27-01"></div>' +
      '<div class="field"><label>Date</label><input id="mDate" type="date"></div>' +
      '<div class="field"><label>Time to WARNO #1 (min)</label><input id="mWarno" type="number" min="0" placeholder="10"></div>' +
      '<div class="field"><label>Doctrinal/Format Errors</label><input id="mErrors" type="number" min="0" placeholder="0"></div>' +
      '<div class="field"><label>Staff-Ready Outputs (%)</label><input id="mReady" type="number" min="0" max="100" placeholder="85"></div>' +
      '<div class="field"><label>Planning Cycle (hrs, ROM→OPORD)</label><input id="mCycle" type="number" min="0" step="0.5" placeholder="23"></div>' +
      '<div class="field"><label>Staff Confidence (1–5)</label><input id="mConf" type="number" min="1" max="5" placeholder="4"></div>' +
      '<div class="field"><label>&nbsp;</label><button class="btn primary" id="mAdd" style="width:100%">LOG EVENT</button></div>' +
      "</div>" +
      '<h3 class="section-label">Event History</h3>' +
      '<div id="mTable"></div>';

    function rows() { return STORE.get("metrics", []); }

    function draw() {
      const data = rows();
      const wrap = $("#mTable");
      if (!data.length) {
        wrap.innerHTML = '<div class="callout"><strong>No events logged yet.</strong> Log your STAFFEX, LTP, or CTC rotation above to start the trend line.</div>';
        return;
      }
      const delta = (cur, prev, lowerBetter) => {
        if (prev == null || cur == null || prev === "" || cur === "") return "";
        const d = cur - prev;
        if (d === 0) return ' <span class="mono">±0</span>';
        const good = lowerBetter ? d < 0 : d > 0;
        return ' <span class="' + (good ? "delta-up" : "delta-down") + '">' + (d > 0 ? "+" : "") + d + "</span>";
      };
      wrap.innerHTML =
        '<div class="table-wrap"><table><thead><tr><th>Event</th><th>Date</th><th>WARNO #1 (min)</th><th>Errors</th><th>Staff-Ready %</th><th>Cycle (hrs)</th><th>Confidence</th><th></th></tr></thead><tbody>' +
        data.map((m, i) => {
          const p = i > 0 ? data[i - 1] : {};
          return "<tr><td><strong>" + esc(m.name) + '</strong></td><td class="mono">' + esc(m.date || "—") + "</td>" +
            '<td class="mono">' + esc(m.warno ?? "—") + delta(+m.warno, p.warno != null ? +p.warno : null, true) + "</td>" +
            '<td class="mono">' + esc(m.errors ?? "—") + delta(+m.errors, p.errors != null ? +p.errors : null, true) + "</td>" +
            '<td class="mono">' + esc(m.ready ?? "—") + delta(+m.ready, p.ready != null ? +p.ready : null, false) + "</td>" +
            '<td class="mono">' + esc(m.cycle ?? "—") + delta(+m.cycle, p.cycle != null ? +p.cycle : null, true) + "</td>" +
            '<td class="mono">' + esc(m.conf ?? "—") + "</td>" +
            '<td><button class="btn danger" data-del="' + i + '">✗</button></td></tr>';
        }).join("") +
        "</tbody></table></div>";
      $$("[data-del]", wrap).forEach((b) => b.addEventListener("click", () => {
        const d = rows();
        d.splice(+b.dataset.del, 1);
        STORE.set("metrics", d);
        draw();
        toast("EVENT REMOVED");
      }));
    }

    $("#mAdd").addEventListener("click", () => {
      const name = $("#mName").value.trim();
      if (!name) { toast("EVENT NAME REQUIRED"); return; }
      const d = rows();
      d.push({
        name,
        date: $("#mDate").value,
        warno: $("#mWarno").value,
        errors: $("#mErrors").value,
        ready: $("#mReady").value,
        cycle: $("#mCycle").value,
        conf: $("#mConf").value
      });
      STORE.set("metrics", d);
      ["mName", "mDate", "mWarno", "mErrors", "mReady", "mCycle", "mConf"].forEach((id) => { $("#" + id).value = ""; });
      draw();
      toast("EVENT LOGGED");
    });
    draw();
  }

  /* ---------- Boot ---------- */
  renderOverview();
  renderWorkflow();
  renderPrompts();
  renderBuilder();
  renderTimeline();
  renderGovernance();
  renderCpOps();
  renderPlaybook();
  renderMetrics();
})();
