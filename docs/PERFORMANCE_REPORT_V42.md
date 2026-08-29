# Performance Report v4.2

v4.2 adds two static pages and a separate company stylesheet rather than inflating the accepted core CSS bundle.

Static gzip promotion budgets:
- `assets/site.css`: remains under 34,000 bytes.
- `assets/company.css`: dedicated company-page budget, 5,000 bytes.
- `assets/site.js`: under 30,500 bytes after nested-page routing support.
- `about/index.html`: under 6,000 bytes.
- `contact/index.html`: under 5,000 bytes.

No third-party runtime, font package, image payload, framework, analytics service, contact-form service or new network dependency is added. Existing Lighthouse minimums and browser LCP/INP promotion expectations remain applicable, with About and Contact added to CI Lighthouse coverage.
