# Production Domain Cutover

The v1.0 RC canonical is the current public GitHub Pages URL. Do not hand-edit five metadata surfaces when moving to a purchased domain.

## 1. Retarget the artifact

```bash
python scripts/set_canonical.py https://example.com/
python scripts/validate_json_schemas.py
python scripts/release_readiness_test.py
python scripts/static_audit.py
```

The cutover tool updates canonical link, OG URL, Organization JSON-LD URL, Release Profile, robots sitemap pointer and every sitemap URL. It also recomputes the CSP hash that authorizes the inline JSON-LD.

## 2. Configure GitHub Pages

- Verify domain ownership before relying on the domain.
- Configure the custom domain in repository Pages settings.
- Use GitHub's documented DNS records for apex or CNAME/subdomain configuration.
- Enable **Enforce HTTPS** after certificate provisioning.
- If switching to the prepared custom Actions deployment, change Pages Source to **GitHub Actions** deliberately before installing the opt-in workflow.
- With Actions-based Pages, GitHub documents that the CNAME file is not the control plane for the custom-domain setting; keep the setting in Pages configuration.

## 3. Deploy and verify

```bash
python scripts/verify_deployed_site.py https://example.com/
```

The verifier requires:
- root Living Lab markers;
- all 9 versioned contracts;
- release profile = 1.0;
- 8 critical portal routes;
- 2 critical public proof URLs;
- robots.txt and sitemap.xml.

Then require the CI Lighthouse thresholds and a manual browser/mobile accessibility smoke.

## 4. Rollback

Keep the previous production root commit/tag. If route, CSP, custom-domain, certificate or browser gates fail, restore the prior root before debugging the immersive layer.

## Authoritative GitHub references used for this checklist
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
