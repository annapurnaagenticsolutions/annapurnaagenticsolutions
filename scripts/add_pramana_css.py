from pathlib import Path

ROOT = Path(r"D:\vision_agentic\annapurnaagenticsolutions\annapurnaagenticsolutions")

# Update assets/company.css to include all Pramana styling cleanly
company_css = Path(ROOT / "assets/company.css").read_text(encoding="utf-8")

pramana_styles = """
/* Pramana Landing & Showcase Hub */
.v42-pramana-hero{padding:54px 0 40px;background:radial-gradient(760px 430px at 78% 48%,rgba(37,99,235,.055),transparent 70%)}
.v42-hero-title{font-size:var(--type-page-h1)!important;line-height:1.08!important;letter-spacing:-.04em!important;color:#0f172a;max-width:880px;margin:12px 0 16px}
.v42-hero-lead{font-size:16px;line-height:1.7;color:#69768a;max-width:800px;margin-bottom:28px}
.v42-pillar-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:34px 0}
.v42-pillar-card{background:#fff;border:1px solid #dce4ef;border-radius:20px;padding:26px 24px;box-shadow:0 10px 30px rgba(15,23,42,.03),inset 0 1px 0 #fff}
.v42-pillar-card h3{font-size:18px;letter-spacing:-.02em;margin:10px 0 8px;color:#0f172a}
.v42-pillar-card p{font-size:13.5px;color:#69768a;line-height:1.65;margin:0}
.v42-scenario-box{background:#fff;border:1px solid #dce4ef;border-radius:20px;overflow-x:auto;box-shadow:0 10px 30px rgba(15,23,42,.03);margin:28px 0}
.v42-scenario-table{width:100%;border-collapse:collapse;text-align:left;font-size:13.5px}
.v42-scenario-table th{background:#f8fafc;padding:14px 18px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.v42-scenario-table td{padding:16px 18px;border-bottom:1px solid #f1f5f9;vertical-align:middle;color:#334155}
.v42-scenario-table tr:last-child td{border-bottom:none}
.v42-badge{display:inline-block;padding:4px 10px;border-radius:6px;font-size:11.5px;font-weight:700}
.v42-badge-approved{background:#dcfce7;color:#166534}
.v42-badge-blocked{background:#fee2e2;color:#991b1b}
.v42-badge-held{background:#fef3c7;color:#92400e}
.v42-badge-human{background:#e0f2fe;color:#075985}
.v42-badge-sealed{background:#f3e8ff;color:#6b21a8}
.v42-disclaimer-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:22px 26px;font-size:13px;color:#64748b;line-height:1.65;margin:36px 0 54px}
.v42-disclaimer-card strong{color:#0f172a;display:block;margin-bottom:4px;font-size:13.5px}

.v42-hub-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:36px 0}
.v42-hub-card{background:#fff;border:1px solid #dce4ef;border-radius:20px;padding:26px 24px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 10px 30px rgba(15,23,42,.03),inset 0 1px 0 #fff;transition:border-color .18s ease,transform .18s ease}
.v42-hub-card:hover{transform:translateY(-2px);border-color:#2563eb}
.v42-hub-card h3{font-size:19px;letter-spacing:-.02em;margin:10px 0 8px;color:#0f172a}
.v42-hub-card p{font-size:13.5px;color:#69768a;line-height:1.65;margin:0 0 20px;flex-grow:1}
.v42-hub-card-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:16px;border-top:1px solid #f1f5f9}
.v42-tag{display:inline-block;font-size:10px;font-weight:750;letter-spacing:.08em;text-transform:uppercase;padding:4px 8px;border-radius:6px}
.v42-tag-tool{background:#dcfce7;color:#166534}
.v42-tag-smb{background:#dbeafe;color:#1e40af}
.v42-tag-bank{background:#fef3c7;color:#92400e}
.v42-tag-tech{background:#e0f2fe;color:#075985}
.v42-tag-legal{background:#f3e8ff;color:#6b21a8}

@media(max-width:1080px){.v42-pillar-grid,.v42-hub-grid{grid-template-columns:1fr 1fr}}
@media(max-width:700px){.v42-pillar-grid,.v42-hub-grid{grid-template-columns:1fr}}
"""

if ".v42-pramana-hero" not in company_css:
    company_css += "\n" + pramana_styles
    (ROOT / "assets/company.css").write_text(company_css, encoding="utf-8")
    print("Updated assets/company.css with Pramana classes")
