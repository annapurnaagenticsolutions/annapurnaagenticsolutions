import os, re
from pathlib import Path

ROOT = Path(r"D:\vision_agentic\annapurnaagenticsolutions\annapurnaagenticsolutions")
DEMO_DIR = ROOT / "pramana" / "demos"
DEMO_DIR.mkdir(parents=True, exist_ok=True)

def make_header(title, demo_slug):
    return f"""<!-- Annapurna Global Navigation Bar -->
<div class="annapurna-nav-bar" style="background:#0b1329;color:#f8fafc;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif;font-size:13px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e293b;position:sticky;top:0;z-index:99999;box-shadow:0 4px 14px rgba(0,0,0,0.2);">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <a href="../../../" style="color:#ffffff;text-decoration:none;font-weight:700;display:flex;align-items:center;gap:8px;">
      <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:linear-gradient(135deg,#38bdf8,#818cf8);"></span>
      <span>Annapurna Agentic Solutions</span>
    </a>
    <span style="color:#475569;">/</span>
    <a href="../../" style="color:#94a3b8;text-decoration:none;font-weight:600;">Pramana</a>
    <span style="color:#475569;">/</span>
    <span style="color:#38bdf8;font-weight:600;">{title}</span>
  </div>
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
    <button onclick="window.print()" style="background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
      <span>📥</span> Print / Save Report
    </button>
    <a href="../../demos/" style="background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:6px 12px;border-radius:6px;font-size:12px;text-decoration:none;font-weight:600;">
      All Showcases
    </a>
    <a href="../../../contact/" style="background:linear-gradient(135deg,#2563eb,#4f46e5);color:#ffffff;padding:6px 14px;border-radius:6px;font-size:12px;text-decoration:none;font-weight:700;">
      Request Custom Demo →
    </a>
  </div>
</div>
"""

def inject_nav_bar(html, title, slug):
    bar = make_header(title, slug)
    m = re.search(r'<body\b[^>]*>', html, re.I)
    if m:
        idx = m.end()
        return html[:idx] + "\n" + bar + "\n" + html[idx:]
    return bar + "\n" + html

# 1. DPDP Gap Assessment
src1 = Path(r"D:\vision_agentic\gurudev\gguf_eval\ai_governance\docs\lawyer_showcase\dpdp_gap_assessment.html").read_text(encoding="utf-8")
h1 = inject_nav_bar(src1, "DPDP Readiness & Gap Assessment", "dpdp-check")
dst1 = DEMO_DIR / "dpdp-check" / "index.html"
dst1.parent.mkdir(parents=True, exist_ok=True)
dst1.write_text(h1, encoding="utf-8")
print("Written dpdp-check")

# 2. Kiosk Demo
src2 = Path(r"D:\vision_agentic\gurudev\gguf_eval\ai_governance\docs\lawyer_showcase\pramana_kiosk_demo_light.html").read_text(encoding="utf-8")
h2 = inject_nav_bar(src2, "Bank Kiosks & ATM Compliance", "kiosk")
dst2 = DEMO_DIR / "kiosk" / "index.html"
dst2.parent.mkdir(parents=True, exist_ok=True)
dst2.write_text(h2, encoding="utf-8")
print("Written kiosk")

# 3. SMB Demo (sanitize localhost / Ollama)
src3 = Path(r"D:\vision_agentic\gurudev\gguf_eval\ai_governance\docs\lawyer_showcase\pramana_smb_demo_light.html").read_text(encoding="utf-8")
src3 = src3.replace("No OpenAI API. No AWS. No Google Cloud. The AI engine (Ollama) runs locally on your hardware.", "No external cloud APIs. The AI governance engine runs 100% locally on your private on-premise infrastructure.")
src3 = src3.replace("Open http://localhost:8000 in any browser. That's it. No app to install on employee phones", "Access via your secure private local web interface. No client app installation required on staff devices.")
h3 = inject_nav_bar(src3, "SMB Interactive Showcase (5 Sectors)", "smb")
dst3 = DEMO_DIR / "smb" / "index.html"
dst3.parent.mkdir(parents=True, exist_ok=True)
dst3.write_text(h3, encoding="utf-8")
print("Written smb")

# 4. How It Works Interactive (sanitize codenames and title)
src4 = Path(r"D:\vision_agentic\agent_experiment\public\dpdp_showcase\pramana_how_it_works_interactive.html").read_text(encoding="utf-8")
src4 = src4.replace("Technical Architecture & Live Real-Time Scenario Sandbox", "Real-Time Ingress & Tokenization Simulator")
src4 = src4.replace("Scout-01", "PII Scanner")
src4 = src4.replace("Herald-04", "Consent Validator")
src4 = src4.replace("Forge-07", "Data Tokenizer")
src4 = src4.replace("Ledger-03", "Evidence Ledger")
src4 = src4.replace("Closer-02", "DPA Verifier")
src4 = src4.replace("dpdp_citadel_simulation.html", "../office-simulation/")
h4 = inject_nav_bar(src4, "Real-Time Ingress & Tokenization Sandbox", "how-it-works")
dst4 = DEMO_DIR / "how-it-works" / "index.html"
dst4.parent.mkdir(parents=True, exist_ok=True)
dst4.write_text(h4, encoding="utf-8")
print("Written how-it-works")

# 5. Office Consultation Simulation
src5 = Path(r"D:\vision_agentic\agent_experiment\public\dpdp_showcase\dpdp_office_consultation_simulation.html").read_text(encoding="utf-8")
src5 = src5.replace("pramana_how_it_works_interactive.html", "../how-it-works/")
h5 = inject_nav_bar(src5, "Virtual DPO Office Walk-in Consultation", "office-simulation")
dst5 = DEMO_DIR / "office-simulation" / "index.html"
dst5.parent.mkdir(parents=True, exist_ok=True)
dst5.write_text(h5, encoding="utf-8")
print("Written office-simulation")

# 6. DPO Guide (sanitize codenames)
src6 = Path(r"D:\vision_agentic\agent_experiment\public\dpdp_showcase\dpdp_understanding_dpo_consultation.html").read_text(encoding="utf-8")
src6 = src6.replace("Pramana Forge-07 orchestrates automated multi-shard database pruning, purges Redis keys, and generates an immutable Cryptographic Erasure Certificate.", "Pramana Tokenization & Purge Engine orchestrates automated multi-shard database pruning, purges session keys, and generates an immutable Cryptographic Erasure Certificate.")
src6 = src6.replace("Pramana Scout-01 regex interceptor catches unmasked Aadhaar numbers at ingress and Forge-07 tokenizes them into salted SHA-256 hashes.", "Pramana Ingress Scanner catches unmasked Aadhaar numbers at entry and the Tokenizer converts them into salted SHA-256 hashes.")
src6 = src6.replace("Pramana Closer-02 verifies that your cloud hosting provider has signed statutory Data Processing Agreements (DPA) incorporating DPDP standard contractual clauses.", "Pramana Contract Verification Engine verifies that your cloud hosting provider has signed statutory Data Processing Agreements (DPA) incorporating DPDP standard contractual clauses.")
src6 = src6.replace("dpdp_office_consultation_simulation.html", "../office-simulation/")
h6 = inject_nav_bar(src6, "DPDP Act Executive Guide & Legal Consultation", "dpo-guide")
dst6 = DEMO_DIR / "dpo-guide" / "index.html"
dst6.parent.mkdir(parents=True, exist_ok=True)
dst6.write_text(h6, encoding="utf-8")
print("Written dpo-guide")

print("SUCCESS: Generated all 6 demo sub-directories")
