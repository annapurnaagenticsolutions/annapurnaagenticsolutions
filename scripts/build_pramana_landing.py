from pathlib import Path

ROOT = Path(r"D:\vision_agentic\annapurnaagenticsolutions\annapurnaagenticsolutions")
PRAMANA_DIR = ROOT / "pramana"
PRAMANA_DIR.mkdir(parents=True, exist_ok=True)

# 1. pramana/demos/index.html (Showcase Hub)
demos_hub_html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width,initial-scale=1" name="viewport"/>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"/>
  <title>Pramana Showcases &amp; Demos — Annapurna Agentic Solutions</title>
  <meta name="description" content="Explore 6 interactive demonstrations for India's DPDP Act 2023: Gap Assessment, SMB Workflows, Bank Kiosks, DPO Consultation, and Ingress Tokenization."/>
  <link rel="canonical" href="https://annapurnaagenticsolutions.com/pramana/demos/"/>
  <link href="../../assets/site.css" rel="stylesheet"/>
  <link href="../../assets/company.css" rel="stylesheet"/>
  <meta name="robots" content="index,follow,max-image-preview:large"/>
  <meta name="theme-color" content="#0b1329"/>
  <meta name="color-scheme" content="light dark"/>
  <meta property="og:site_name" content="Annapurna Agentic Solutions"/>
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="Pramana Showcases &amp; Demos — Annapurna Agentic Solutions"/>
  <meta property="og:description" content="Explore 6 interactive demonstrations for India's DPDP Act 2023: Gap Assessment, SMB Workflows, Bank Kiosks, DPO Consultation, and Ingress Tokenization."/>
  <meta property="og:url" content="https://annapurnaagenticsolutions.com/pramana/demos/"/>
  <meta name="twitter:card" content="summary"/>
  <link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml"/>
  <link rel="manifest" href="../../site.webmanifest"/>
  <style>
    .hub-hero { padding: 48px 0 32px; background: linear-gradient(180deg, rgba(37,99,235,0.06) 0%, transparent 100%); border-bottom: 1px solid var(--border, #e2e8f0); }
    .hub-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; margin: 40px 0; }
    .hub-card { background: var(--surface, #ffffff); border: 1.5px solid var(--border, #e2e8f0); border-radius: 16px; padding: 28px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.05); }
    .hub-card:hover { transform: translateY(-3px); border-color: #2563eb; box-shadow: 0 12px 24px -4px rgba(37,99,235,0.12); }
    .hub-card-tag { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 6px; margin-bottom: 14px; }
    .tag-smb { background: #dbeafe; color: #1e40af; }
    .tag-bank { background: #fef3c7; color: #92400e; }
    .tag-legal { background: #f3e8ff; color: #6b21a8; }
    .tag-tool { background: #dcfce7; color: #166534; }
    .tag-tech { background: #e0f2fe; color: #075985; }
    .hub-card h3 { font-size: 20px; font-weight: 700; margin-bottom: 10px; color: var(--text, #0f172a); }
    .hub-card p { font-size: 14px; color: var(--text-dim, #475569); line-height: 1.6; margin-bottom: 20px; flex-grow: 1; }
    .hub-card-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border, #f1f5f9); }
    .btn-launch { display: inline-flex; align-items: center; gap: 6px; background: #0f172a; color: #ffffff !important; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; text-decoration: none; transition: background 0.15s ease; }
    .btn-launch:hover { background: #2563eb; }
    .btn-print-info { font-size: 12px; color: var(--text-muted, #64748b); display: flex; align-items: center; gap: 4px; }
  </style>
</head>
<body class="v42-about">
<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-header">
  <div class="wrap nav">
    <a class="brand" aria-label="Annapurna Agentic Solutions home" href="../../">
      <span aria-hidden="true" class="brand-mark"></span>
      <span>Annapurna Agentic Solutions</span>
    </a>
    <nav aria-label="Primary" class="nav-links">
      <a href="../">Pramana</a>
      <a href="./" class="active" style="font-weight:700;color:#2563eb;">Showcases</a>
      <a href="../../explore.html">Explore</a>
      <a href="../../lab.html">Interactive Lab</a>
      <a href="../../about/">About</a>
    </nav>
    <div class="nav-actions">
      <a class="btn btn-soft" href="../../contact/">Contact</a>
    </div>
  </div>
</header>

<main id="main-content" tabindex="-1">
  <section class="hub-hero">
    <div class="wrap">
      <div class="page-intro-meta">
        <p class="eyebrow">PRAMANA (प्रमाण) · INTERACTIVE SHOWCASES</p>
        <div class="v42-public-signal"><i></i><span>India-First DPDP 2023 Governance Demonstrations</span></div>
      </div>
      <h1>Explore Pramana through 6 Real-World Demonstrations.</h1>
      <p style="font-size:17px;color:var(--text-dim,#475569);max-width:760px;line-height:1.6;margin-top:12px;">
        Test India's DPDP Act 2023 compliance scenarios live in your browser. All simulations run 100% locally with client-side state, zero external tracking, and printable audit reports.
      </p>
    </div>
  </section>

  <section class="v42-section">
    <div class="wrap">
      <div class="hub-grid">

        <!-- Card 1: Free DPDP Gap Assessment -->
        <article class="hub-card">
          <div>
            <span class="hub-card-tag tag-tool">Self-Assessment Tool</span>
            <h3>Free DPDP Compliance Check</h3>
            <p>A 5-minute interactive questionnaire tailored for Indian businesses (Clinics, Schools, Fintech, HR, EdTech). Computes readiness score, risk flags, and an actionable statutory checklist.</p>
          </div>
          <div class="hub-card-actions">
            <a class="btn-launch" href="dpdp-check/">Launch Assessment →</a>
            <span class="btn-print-info">📥 Exportable PDF</span>
          </div>
        </article>

        <!-- Card 2: SMB Client Showcase -->
        <article class="hub-card">
          <div>
            <span class="hub-card-tag tag-smb">SMB &amp; Enterprise</span>
            <h3>SMB Interactive Experience</h3>
            <p>Presenter-mode walkthrough for 5 distinct Indian business sectors. Demonstrates Penalty risk calculation, Evidence capture, and Unbundled consent workflows with instant PDF export.</p>
          </div>
          <div class="hub-card-actions">
            <a class="btn-launch" href="smb/">Launch SMB Demo →</a>
            <span class="btn-print-info">⚡ 5 Sectors</span>
          </div>
        </article>

        <!-- Card 3: Bank Kiosks & ATMs -->
        <article class="hub-card">
          <div>
            <span class="hub-card-tag tag-bank">Banking &amp; Self-Service</span>
            <h3>Kiosk &amp; ATM Compliance</h3>
            <p>Interactive simulation of self-service terminals and bank CSP kiosks under DPDP Act 2023. Demonstrates biometric PII scrubbing, voice consent in Schedule VIII languages, and session auto-purge.</p>
          </div>
          <div class="hub-card-actions">
            <a class="btn-launch" href="kiosk/">Launch Kiosk Demo →</a>
            <span class="btn-print-info">🏧 ATM &amp; CSP</span>
          </div>
        </article>

        <!-- Card 4: Real-Time Ingress Simulator -->
        <article class="hub-card">
          <div>
            <span class="hub-card-tag tag-tech">Technical Architecture</span>
            <h3>Real-Time Ingress &amp; Tokenizer</h3>
            <p>Watch data packets flow through network inspection, multilingual consent verification, dynamic character-by-character tokenization, and cryptographic proof sealing in real time.</p>
          </div>
          <div class="hub-card-actions">
            <a class="btn-launch" href="how-it-works/">Launch Sandbox →</a>
            <span class="btn-print-info">🔍 Live Packet Flow</span>
          </div>
        </article>

        <!-- Card 5: Virtual DPO Office Consultation -->
        <article class="hub-card">
          <div>
            <span class="hub-card-tag tag-legal">Advisory &amp; DPO</span>
            <h3>DPO Office Walk-in Consultation</h3>
            <p>Step inside an AI Data Protection Officer consultation room. Four specialized advisor agents (Legal Counsel, Consent Officer, Technical Remediation, and Chief DPO) guide your compliance strategy.</p>
          </div>
          <div class="hub-card-actions">
            <a class="btn-launch" href="office-simulation/">Launch Consultation →</a>
            <span class="btn-print-info">⚖️ 4 Advisor Personas</span>
          </div>
        </article>

        <!-- Card 6: DPDP Act Executive Guide -->
        <article class="hub-card">
          <div>
            <span class="hub-card-tag tag-legal">Executive &amp; Legal</span>
            <h3>DPDP Executive Guide &amp; Legal Suite</h3>
            <p>Comprehensive interactive guide covering key sections, penalties up to ₹250 Cr, data fiduciary obligations, citizen rights, and tailored legal advice for company boards.</p>
          </div>
          <div class="hub-card-actions">
            <a class="btn-launch" href="dpo-guide/">Launch Executive Guide →</a>
            <span class="btn-print-info">📜 Statutory Synthesis</span>
          </div>
        </article>

      </div>
    </div>
  </section>

  <!-- Prototype disclaimer -->
  <section class="wrap" style="margin-bottom: 60px;">
    <div style="background:var(--surface2,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:12px;padding:20px 24px;font-size:13px;color:var(--text-muted,#64748b);line-height:1.6;">
      <strong style="color:var(--text,#0f172a);">Honest Positioning &amp; Disclaimer:</strong> Pramana is a governed AI workflow prototype developed by Annapurna Agentic Solutions for controlled demonstration. Simulations illustrate regulatory risk and governance workflows under India's Digital Personal Data Protection Act 2023. This is not legal advice, not independently audited, and does not certify statutory compliance.
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap footer-grid">
    <span>© 2026 Annapurna Agentic Solutions · Bengaluru, India</span>
    <div class="footer-links">
      <a href="../">Pramana</a>
      <a href="../../explore.html">Explore</a>
      <a href="../../lab.html">Interactive Lab</a>
      <a href="../../evidence.html">Evidence</a>
      <a href="../../about/">About</a>
      <a href="../../contact/">Contact</a>
      <a href="https://github.com/annapurnaagenticsolutions" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    </div>
  </div>
</footer>
</body>
</html>
"""

(PRAMANA_DIR / "demos" / "index.html").write_text(demos_hub_html, encoding="utf-8")
print("Written pramana/demos/index.html")

# 2. pramana/index.html (Flagship Product Landing Page)
pramana_landing_html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width,initial-scale=1" name="viewport"/>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"/>
  <title>Pramana (प्रमाण) — AI Governance for India's DPDP Act 2023 | Annapurna</title>
  <meta name="description" content="Source-grounded, locally-deployed DPDP compliance workflow with cryptographic evidence receipts, policy-as-code enforcement, and human-in-the-loop oversight."/>
  <link rel="canonical" href="https://annapurnaagenticsolutions.com/pramana/"/>
  <link href="../assets/site.css" rel="stylesheet"/>
  <link href="../assets/company.css" rel="stylesheet"/>
  <meta name="robots" content="index,follow,max-image-preview:large"/>
  <meta name="theme-color" content="#0b1329"/>
  <meta name="color-scheme" content="light dark"/>
  <meta property="og:site_name" content="Annapurna Agentic Solutions"/>
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="Pramana (प्रमाण) — AI Governance for India's DPDP Act 2023"/>
  <meta property="og:description" content="Source-grounded, locally-deployed DPDP compliance workflow with cryptographic evidence receipts, policy-as-code enforcement, and human-in-the-loop oversight."/>
  <meta property="og:url" content="https://annapurnaagenticsolutions.com/pramana/"/>
  <meta name="twitter:card" content="summary"/>
  <link rel="icon" href="../assets/favicon.svg" type="image/svg+xml"/>
  <link rel="manifest" href="../site.webmanifest"/>
  <style>
    .pramana-hero { padding: 56px 0 40px; background: radial-gradient(circle at top right, rgba(37,99,235,0.08) 0%, transparent 60%); border-bottom: 1px solid var(--border, #e2e8f0); }
    .hero-badge-row { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .hero-badge { display: inline-flex; align-items: center; gap: 6px; background: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; }
    .pillar-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin: 32px 0; }
    .pillar-card { background: var(--surface, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 14px; padding: 26px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
    .pillar-num { font-size: 12px; font-weight: 800; color: #2563eb; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; display: block; }
    .pillar-card h3 { font-size: 18px; font-weight: 700; margin-bottom: 10px; color: var(--text, #0f172a); }
    .pillar-card p { font-size: 14px; color: var(--text-dim, #475569); line-height: 1.6; }
    
    .scenario-table-wrap { overflow-x: auto; margin: 28px 0; background: var(--surface, #ffffff); border: 1px solid var(--border, #e2e8f0); border-radius: 14px; }
    .scenario-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 14px; }
    .scenario-table th { background: var(--surface2, #f8fafc); padding: 14px 18px; font-weight: 700; color: var(--text, #0f172a); border-bottom: 1px solid var(--border, #e2e8f0); font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
    .scenario-table td { padding: 16px 18px; border-bottom: 1px solid var(--border, #f1f5f9); vertical-align: top; color: var(--text-dim, #334155); }
    .scenario-table tr:last-child td { border-bottom: none; }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
    .badge-approved { background: #dcfce7; color: #166534; }
    .badge-blocked { background: #fee2e2; color: #991b1b; }
    .badge-held { background: #fef3c7; color: #92400e; }
    .badge-human { background: #e0f2fe; color: #075985; }
    .badge-sealed { background: #f3e8ff; color: #6b21a8; }
  </style>
</head>
<body class="v42-about">
<a class="skip-link" href="#main-content">Skip to main content</a>
<header class="site-header">
  <div class="wrap nav">
    <a class="brand" aria-label="Annapurna Agentic Solutions home" href="../">
      <span aria-hidden="true" class="brand-mark"></span>
      <span>Annapurna Agentic Solutions</span>
    </a>
    <nav aria-label="Primary" class="nav-links">
      <a href="./" class="active" style="font-weight:700;color:#2563eb;">Pramana</a>
      <a href="demos/">Showcases</a>
      <a href="../explore.html">Explore</a>
      <a href="../lab.html">Interactive Lab</a>
      <a href="../about/">About</a>
    </nav>
    <div class="nav-actions">
      <a class="btn btn-soft" href="../contact/">Contact</a>
    </div>
  </div>
</header>

<main id="main-content" tabindex="-1">
  <!-- Hero -->
  <section class="pramana-hero">
    <div class="wrap">
      <div class="hero-badge-row">
        <span class="hero-badge">🇮🇳 Built for India's DPDP Act 2023</span>
        <div class="v42-public-signal"><i></i><span>Source-Grounded · Cryptographic Evidence · Local Single-Tenant</span></div>
      </div>
      <h1 style="font-size: clamp(32px, 4.5vw, 52px); font-weight: 800; line-height: 1.15; color: var(--text, #0f172a); max-width: 900px;">
        Pramana (प्रमाण) — Governed AI for India's Data Protection Act.
      </h1>
      <p style="font-size: 18px; color: var(--text-dim, #475569); max-width: 820px; line-height: 1.6; margin: 20px 0 32px;">
        A source-grounded compliance and governance workflow engine. Pramana verifies statutory claims against the exact text of the DPDP Act 2023, enforces policy-as-code before agent execution, and seals every decision in a cryptographic evidence trail.
      </p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="demos/">Explore 6 Live Showcases →</a>
        <a class="btn btn-soft" href="../contact/">Request Controlled Demo</a>
      </div>
    </div>
  </section>

  <!-- 3 Core Pillars -->
  <section class="v42-section">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">CORE CAPABILITIES</p>
          <h2>Three Layers of Deterministic Governance.</h2>
        </div>
        <p>Moving from unchecked LLM responses to verified statutory evidence.</p>
      </div>

      <div class="pillar-grid">
        <article class="pillar-card">
          <span class="pillar-num">01 · STATUTORY BINDING</span>
          <h3>Grounded Knowledge Layer</h3>
          <p>Every response is bound to primary statutory nodes (DPDP Act 2023, Rules 2025). Strict claim-to-evidence validation catches phantom citations, numeric mismatches (72h vs 96h), and modal contradictions (may vs must).</p>
        </article>

        <article class="pillar-card">
          <span class="pillar-num">02 · POLICY-AS-CODE</span>
          <h3>Governed Execution Gates</h3>
          <p>Dual-layer enforcement (YAML rule engine + Cedar policy authorization) validates actions before execution. Prevents unbundled consent violations, unauthorized data sharing, and cross-border leakage.</p>
        </article>

        <article class="pillar-card">
          <span class="pillar-num">03 · EVIDENCE LEDGER</span>
          <h3>Cryptographic Audit Trail</h3>
          <p>Every governance decision — whether approved, blocked, or held for human review — generates a sealed evidence receipt with SHA-256 hash chaining and exportable audit packs for regulatory oversight.</p>
        </article>
      </div>
    </div>
  </section>

  <!-- 5 Scenarios Synthetic Benchmark -->
  <section class="v42-section" style="background: var(--surface2, #f8fafc);">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">BENCHMARK SCENARIOS</p>
          <h2>Governance Outcomes Across Regulated Scenarios.</h2>
        </div>
        <p>Simulated on Meridian Bank (Synthetic BFSI Benchmark) — showing black-box inputs, decisions, and evidence.</p>
      </div>

      <div class="scenario-table-wrap">
        <table class="scenario-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Scenario</th>
              <th>Governance Outcome</th>
              <th>Statutory &amp; Operational Impact</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>S1</strong></td>
              <td>Statutory lookup — DPDP Section 9 (Children's data &amp; parental consent)</td>
              <td><span class="status-badge badge-approved">✅ APPROVED</span></td>
              <td>Deterministic regulatory resolution against verified KG without LLM hallucination risk.</td>
            </tr>
            <tr>
              <td><strong>S2</strong></td>
              <td>Cross-department data sharing by customer service agent</td>
              <td><span class="status-badge badge-blocked">🚫 BLOCKED</span></td>
              <td>Enforces agent authority boundaries; blocks unauthorized PII movement before execution.</td>
            </tr>
            <tr>
              <td><strong>S3</strong></td>
              <td>Agent cites a phantom statutory section (Section 47)</td>
              <td><span class="status-badge badge-held">⏸ HELD FOR REVIEW</span></td>
              <td>Detects non-existent provisions; suspends output to protect institutional credibility.</td>
            </tr>
            <tr>
              <td><strong>S4</strong></td>
              <td>AI-assisted loan denial on retail customer</td>
              <td><span class="status-badge badge-human">👤 HUMAN APPROVAL</span></td>
              <td>Mandatory human sign-off for high-impact automated decisions affecting citizens.</td>
            </tr>
            <tr>
              <td><strong>S5</strong></td>
              <td>Evidence pack export for Data Protection Board audit</td>
              <td><span class="status-badge badge-sealed">🔏 SEALED PACK</span></td>
              <td>Multi-receipt hash-chained evidence bundle exportable for regulatory review.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <!-- Interactive Showcases Section -->
  <section class="v42-section">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="eyebrow">INTERACTIVE SUITE</p>
          <h2>Experience the Showcases in Your Browser.</h2>
        </div>
        <p>Explore our 6 client-facing simulators built for Indian businesses, banks, and legal advisors.</p>
      </div>

      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:24px;">
        <a class="btn btn-primary" href="demos/">Launch All 6 Interactive Showcases →</a>
        <a class="btn btn-soft" href="demos/dpdp-check/">Take Free DPDP Gap Assessment</a>
        <a class="btn btn-soft" href="demos/smb/">SMB Sector Showcase</a>
      </div>
    </div>
  </section>

  <!-- Honest Positioning & Disclaimer -->
  <section class="wrap" style="margin: 40px auto 60px;">
    <div style="background:var(--surface2,#f8fafc);border:1.5px solid var(--border,#e2e8f0);border-radius:14px;padding:24px 28px;font-size:13.5px;color:var(--text-muted,#64748b);line-height:1.7;">
      <strong style="color:var(--text,#0f172a);display:block;margin-bottom:6px;font-size:14px;">Honest Positioning &amp; Legal Disclaimer</strong>
      Pramana is an advanced governed AI workflow prototype developed by Annapurna Agentic Solutions for controlled demonstration. Deployment model is single-tenant and customer-hosted (on-premise or private cloud). Regulatory content is founder primary-source checked against official Gazette publications; it does <strong>not</strong> constitute legal advice, is not legally verified, and does not certify statutory DPDP compliance.
    </div>
  </section>

  <!-- CTA -->
  <section class="v42-about-cta">
    <div class="wrap">
      <div class="v42-cta-lens">
        <p class="eyebrow">NEXT STEP</p>
        <h2>Evaluate Pramana for Your Organization.</h2>
        <p>Schedule a private controlled demonstration or discuss on-premise governance requirements.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="../contact/">Contact us →</a>
          <a class="btn btn-soft" href="demos/">Explore Demos ↗</a>
        </div>
      </div>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap footer-grid">
    <span>© 2026 Annapurna Agentic Solutions · Bengaluru, India</span>
    <div class="footer-links">
      <a href="./">Pramana</a>
      <a href="demos/">Showcases</a>
      <a href="../explore.html">Explore</a>
      <a href="../lab.html">Interactive Lab</a>
      <a href="../evidence.html">Evidence</a>
      <a href="../about/">About</a>
      <a href="../contact/">Contact</a>
      <a href="https://github.com/annapurnaagenticsolutions" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
    </div>
  </div>
</footer>
</body>
</html>
"""

(PRAMANA_DIR / "index.html").write_text(pramana_landing_html, encoding="utf-8")
print("Written pramana/index.html")
