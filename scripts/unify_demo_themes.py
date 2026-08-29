import re
from pathlib import Path

DEMO_DIR = Path(r"D:\vision_agentic\annapurnaagenticsolutions\annapurnaagenticsolutions\pramana\demos")

def make_annapurna_header(title, slug):
    return f"""<!-- Annapurna Unified Frosted Navigation Bar -->
<header class="annapurna-site-header" style="background:rgba(255,255,255,0.9);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid #e2e8f0;padding:12px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:99999;font-family:'Plus Jakarta Sans','Inter',-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 4px 20px -2px rgba(15,23,42,0.04);">
  <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
    <a href="../../../" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:#0f172a;font-weight:800;font-size:14px;">
      <span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:linear-gradient(135deg,#38bdf8,#6366f1);box-shadow:0 0 10px rgba(56,189,248,0.4);"></span>
      <span>Annapurna Agentic Solutions</span>
    </a>
    <span style="color:#cbd5e1;font-size:12px;">/</span>
    <a href="../../" style="color:#64748b;text-decoration:none;font-weight:600;font-size:13px;">Pramana (प्रमाण)</a>
    <span style="color:#cbd5e1;font-size:12px;">/</span>
    <span style="color:#2563eb;font-weight:700;font-size:13px;">{title}</span>
  </div>
  <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
    <button onclick="window.print()" style="background:#ffffff;border:1px solid #e2e8f0;color:#334155;padding:7px 14px;border-radius:8px;font-size:12.5px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:6px;transition:all 0.15s ease;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      <span>📥</span> Print / Save PDF
    </button>
    <a href="../../demos/" style="background:#ffffff;border:1px solid #e2e8f0;color:#334155;padding:7px 14px;border-radius:8px;font-size:12.5px;text-decoration:none;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
      All Showcases
    </a>
    <a href="../../../contact/" style="background:linear-gradient(135deg,#2563eb,#4f46e5);color:#ffffff;padding:7px 16px;border-radius:8px;font-size:12.5px;text-decoration:none;font-weight:700;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
      Request Demo →
    </a>
  </div>
</header>
"""

# Annapurna color & typography theme injection
annapurna_theme_vars = """
    :root {
      --bg:           #f8fafc;
      --surface:      #ffffff;
      --surface2:     #f8fafc;
      --surface3:     #f1f5f9;
      --border:       #e2e8f0;
      --border2:      #cbd5e1;
      --text:         #0f172a;
      --text-dim:     #334155;
      --text-muted:   #64748b;
      --gold:         #2563eb;
      --gold-mid:     #1d4ed8;
      --gold-dim:     #eff6ff;
      --gold-border:  #bfdbfe;
      --green:        #16a34a;
      --green-bright: #15803d;
      --green-dim:    #dcfce7;
      --green-border: #86efac;
      --red:          #dc2626;
      --red-bright:   #b91c1c;
      --red-dim:      #fee2e2;
      --red-border:   #fca5a5;
      --amber:        #d97706;
      --amber-dim:    #fef3c7;
      --blue:         #2563eb;
      --blue-dim:     #eff6ff;
      --blue-border:  #bfdbfe;
      --purple:       #6366f1;
      --purple-dim:   #eef2ff;
      --mono:         'JetBrains Mono', monospace;
      --sans:         'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --serif:        'Plus Jakarta Sans', 'Inter', sans-serif;
      --radius:       12px;
      --radius-lg:    18px;
      --radius-xl:    24px;
      --shadow-sm:    0 1px 3px rgba(0,0,0,0.04);
      --shadow:       0 4px 20px -2px rgba(15,23,42,0.06);
      --shadow-md:    0 8px 24px -4px rgba(15,23,42,0.08);
      --shadow-lg:    0 14px 34px -4px rgba(15,23,42,0.10);
    }
"""

for slug, title in [
    ("dpdp-check", "DPDP Readiness & Gap Assessment"),
    ("kiosk", "Bank Kiosks & ATM Compliance"),
    ("smb", "SMB Interactive Experience"),
    ("how-it-works", "Real-Time Ingress & Tokenizer"),
    ("office-simulation", "Virtual DPO Consultation"),
    ("dpo-guide", "DPDP Act Executive Guide")
]:
    fpath = DEMO_DIR / slug / "index.html"
    if not fpath.exists(): continue
    html = fpath.read_text(encoding="utf-8")
    
    # Replace old header with new Annapurna header
    html = re.sub(r'<!-- Annapurna Global Navigation Bar -->\s*<div class="annapurna-nav-bar".*?</div>\s*</div>', '', html, flags=re.DOTALL)
    html = re.sub(r'<!-- Annapurna Unified Frosted Navigation Bar -->\s*<header class="annapurna-site-header".*?</header>', '', html, flags=re.DOTALL)
    
    # Replace Google Fonts font imports with Plus Jakarta Sans & JetBrains Mono
    font_link = '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />'
    html = re.sub(r'<link\s+href="https://fonts\.googleapis\.com/css2\?[^"]*"\s+rel="stylesheet"\s*/>', font_link, html)
    
    # Replace :root definition with Annapurna unified palette
    html = re.sub(r':root\s*\{[^}]+\}', annapurna_theme_vars.strip(), html)
    
    # Inject new frosted header
    header = make_annapurna_header(title, slug)
    m = re.search(r'<body\b[^>]*>', html, re.I)
    if m:
        idx = m.end()
        html = html[:idx] + "\n" + header + "\n" + html[idx:]
    
    fpath.write_text(html, encoding="utf-8")
    print(f"Upgraded {slug} to Annapurna design language")

print("SUCCESS: All 6 demo showcases unified with Annapurna visual system")
