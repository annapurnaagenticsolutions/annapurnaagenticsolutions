# Public Surface Verification v4.3

**Verification date:** 2026-08-29

## Verified public source facts
- GitHub account/organization surface: `annapurnaagenticsolutions` — public.
- Repository `annapurna-portal` — public.
- Portal source paths visible publicly: `about/`, `contact/`, `ai-solutions/`, `axon/`, `idea-hub/`, `software-lab/`, `website-studio/`, `wonderhub-by-AnnapurnaAgenticSolutions/`.
- Repository `axon` — public.
- Repository `open-enterprise-agentops-mesh` — public.
- AgentOps Mesh documentation identifies `/site` as the recommended GitHub Pages source and `site/interactive_demo_path.html` as the interactive public demo path.

## Not inferred
Repository existence does **not** prove that a GitHub Pages URL is currently serving HTTP 200. For that reason `data/public-links.json` uses:
- `sourceStatus: verified_public`
- `pagesStatus: post_publish_http_gate_required`

## Deployment-time command
```bash
python scripts/verify_v43_public_runtime.py
```

Run the command only after the GitHub Pages deployment is complete. A failed runtime URL blocks production promotion but does not rewrite source-repository truth.
