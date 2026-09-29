const useCases = {
  "Procurement Agent Accelerator": {
    score: 91,
    risk: "High",
    autonomy: "Level 3: Human-Approved Action Agent",
    value: "Document extraction, PO/invoice/challan matching, vendor validation, approval routing, audit summary",
    metrics: ["Extraction accuracy", "Cycle time reduction", "Exception detection", "Audit completeness"],
    recommendation: "Best first accelerator because it combines business value, documents, governance, human approval, and auditability."
  },
  "HR Policy Agent": {
    score: 86,
    risk: "High",
    autonomy: "Level 1-2: Guided Advisor / Drafting Agent",
    value: "Policy Q&A, eligibility explanation, location-specific retrieval, sensitive-case escalation",
    metrics: ["Citation accuracy", "Policy version correctness", "Escalation correctness", "Access-control compliance"],
    recommendation: "Strong governance demonstrator, especially for access control and sensitive-topic escalation."
  },
  "IT Support Agent": {
    score: 84,
    risk: "Moderate",
    autonomy: "Level 2-3: Drafting / Human-Approved Action Agent",
    value: "Ticket triage, known-resolution retrieval, clarification, escalation",
    metrics: ["Classification accuracy", "Resolution time", "Escalation precision", "User satisfaction"],
    recommendation: "Good operational use case, but should stay bounded until tool permissions mature."
  },
  "Documentation Intelligence Agent": {
    score: 83,
    risk: "Moderate",
    autonomy: "Level 1-2: Guided Advisor / Drafting Agent",
    value: "Summarization, conflict detection, decision extraction, document freshness review",
    metrics: ["Summary quality", "Source traceability", "Conflict detection", "Decision extraction accuracy"],
    recommendation: "Excellent data-readiness and knowledge-graph use case with broad enterprise relevance."
  },
  "Customer Support Agent": {
    score: 82,
    risk: "High",
    autonomy: "Level 2-3: Drafting / Human-Approved Action Agent",
    value: "Response drafting, case summarization, policy retrieval, escalation risk detection",
    metrics: ["Resolution rate", "Policy compliance", "Customer satisfaction", "Cost per case"],
    recommendation: "High visibility use case, but customer-impacting actions need strong approval and monitoring."
  }
};

let currentCase = "Procurement Agent Accelerator";
let step = 0;

const stages = [
  {
    title: "Use-case selection",
    pill: "Step 1 of 6",
    text: c => `Selected: ${currentCase}. The first question is not whether an agent can be built. The first question is whether this workflow is worth agentifying and whether the value is measurable.`,
    body: c => `
      <div class="grid cols-2">
        <div class="card compact"><h3>Strategic fit score</h3><div class="metric">${c.score}</div><div class="score"><span style="width:${c.score}%"></span></div><p>${c.recommendation}</p></div>
        <div class="card compact"><h3>Value hypothesis</h3><p>${c.value}</p><h3>Business metrics</h3><ul>${c.metrics.map(m => `<li>${m}</li>`).join("")}</ul></div>
      </div>`
  },
  {
    title: "Risk and autonomy classification",
    pill: "Step 2 of 6",
    text: c => `This step prevents uncontrolled autonomy. The agent receives a risk level and an autonomy level before architecture is designed.`,
    body: c => `
      <div class="grid cols-2">
        <div class="card compact"><h3>Risk level</h3><span class="status-pill ${c.risk === "High" ? "danger" : "warn"}">${c.risk}</span><p>Risk determines approval gates, monitoring, data controls, and escalation policy.</p></div>
        <div class="card compact"><h3>Recommended autonomy</h3><p><strong>${c.autonomy}</strong></p><p>Early enterprise agents should usually prepare, recommend, or draft before they execute.</p></div>
      </div>`
  },
  {
    title: "Data readiness gate",
    pill: "Step 3 of 6",
    text: c => `The agent should not proceed to production unless its data sources are owned, authorized, fresh, traceable, and high-quality.`,
    body: c => `
      <table class="table"><thead><tr><th>Check</th><th>Expected Evidence</th></tr></thead><tbody>
      <tr><td>Source inventory</td><td>Approved list of documents, databases, APIs, and systems</td></tr>
      <tr><td>Access control</td><td>Role-based retrieval and tool permissions</td></tr>
      <tr><td>Freshness</td><td>Version, owner, date, and deprecation status</td></tr>
      <tr><td>Traceability</td><td>Every answer or action links to source evidence</td></tr>
      <tr><td>Ontology / KG readiness</td><td>Key entities and relationships are modeled where needed</td></tr>
      </tbody></table>`
  },
  {
    title: "AgentOps architecture selection",
    pill: "Step 4 of 6",
    text: c => `Now the use case is mapped to a composable architecture: workflow, agent orchestration, governance, model gateway, data layer, tools, and observability.`,
    body: c => `
      <div class="pipeline">
        <div class="step"><div class="step-number">1</div><h3>Workflow</h3><p>Define owner, process, SLA, and outcome.</p></div>
        <div class="step"><div class="step-number">2</div><h3>Agents</h3><p>Intake, retrieval, reasoning, action, audit.</p></div>
        <div class="step"><div class="step-number">3</div><h3>Policy</h3><p>Autonomy, approval, access, escalation.</p></div>
        <div class="step"><div class="step-number">4</div><h3>Gateway</h3><p>Model and tool abstraction without lock-in.</p></div>
        <div class="step"><div class="step-number">5</div><h3>Observe</h3><p>Logs, evaluation, cost, latency, outcome.</p></div>
      </div>`
  },
  {
    title: "Evaluation and certification",
    pill: "Step 5 of 6",
    text: c => `The agent is not production-ready because it works once in a demo. It must pass repeatable tests across value, grounding, data, safety, governance, cost, and auditability.`,
    body: c => `
      <table class="table"><thead><tr><th>Dimension</th><th>Weight</th><th>Purpose</th></tr></thead><tbody>
      <tr><td>Business Value</td><td>15%</td><td>Confirms measurable workflow improvement</td></tr>
      <tr><td>Task Success</td><td>15%</td><td>Checks accurate completion of intended work</td></tr>
      <tr><td>Grounding + Data Readiness</td><td>24%</td><td>Checks evidence quality, freshness, authorization, and traceability</td></tr>
      <tr><td>Governance + Safety</td><td>22%</td><td>Checks policy, privacy, autonomy, and escalation</td></tr>
      <tr><td>Tool, Observability, Cost, UX</td><td>24%</td><td>Checks practical production behavior</td></tr>
      </tbody></table>`
  },
  {
    title: "Production recommendation",
    pill: "Step 6 of 6",
    text: c => `The final output is not a generic yes/no. It is a readiness recommendation with conditions, controls, and next actions.`,
    body: c => `
      <div class="grid cols-2">
        <div class="card compact"><h3>Recommendation</h3><span class="status-pill ok">Controlled Pilot</span><p>Proceed only with bounded scope, approved sources, human approval, audit logging, and evaluation dashboard.</p></div>
        <div class="card compact"><h3>Next actions</h3><ul><li>Create use-case canvas</li><li>Complete data-readiness assessment</li><li>Define tool permissions</li><li>Run evaluation scorecard</li><li>Launch limited pilot</li></ul></div>
      </div>
      <pre>Readiness Output:\n- Use case: ${currentCase}\n- Risk: ${c.risk}\n- Autonomy: ${c.autonomy}\n- Launch mode: Controlled pilot\n- Required controls: human approval, source citation, audit log, evaluation scorecard, access controls</pre>`
  }
];

function render() {
  const c = useCases[currentCase];
  const stage = stages[step];
  document.getElementById("stagePill").textContent = stage.pill;
  document.getElementById("stageTitle").textContent = stage.title;
  document.getElementById("stageText").textContent = stage.text(c);
  document.getElementById("stageBody").innerHTML = stage.body(c);
}

document.querySelectorAll(".option").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".option").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentCase = btn.dataset.case;
    step = 0;
    render();
  });
});

document.getElementById("nextBtn").addEventListener("click", () => {
  step = Math.min(stages.length - 1, step + 1);
  render();
});

document.getElementById("prevBtn").addEventListener("click", () => {
  step = Math.max(0, step - 1);
  render();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  step = 0;
  render();
});

render();
