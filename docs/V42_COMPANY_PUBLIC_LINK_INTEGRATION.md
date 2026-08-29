# v4.2 — Company Layer + Public Link Integration

## Decision
v4.1 is retained as the visual-system baseline. v4.2 adds the missing company/public-access layer rather than reopening Home, Explore, Lab or Evidence design.

## Added
1. **About Us** — a living-world-compatible company page with operating principles, public-work proof and six real GitHub Pages destinations.
2. **Contact Us** — direct email, GitHub, LinkedIn and location routes; no fake static form and no unverified response-time promise.
3. **Public link registry** — `data/public-links.json` records the canonical GitHub organization, project repositories, public Pages surfaces and direct contact metadata.
4. **Dual public-work links** — important projects expose both a working/public surface and the corresponding source repository.
5. **Nested-route integrity** — the shared Guide and internal navigation now resolve correctly from `/about/` and `/contact/`.
6. **Global source access** — the existing main-page footers expose the GitHub organization without adding another primary-navigation item.

## Visual principle
About and Contact use the established white field, semantic typography, selective glass and restrained orbital language. They do not introduce a new brand system. Company-only styles are split into `assets/company.css`, so the accepted core stylesheet remains within its prior static budget.

## Public links
The integration uses the existing public Annapurna namespace:
- GitHub organization: `github.com/annapurnaagenticsolutions`
- Annapurna Portal: Pages + repository
- AXON: portfolio Page + dedicated repository
- Open Enterprise AgentOps Mesh: Pages + repository + interactive path
- AI Solutions, WonderHub, Idea Hub, Website Studio and Software Lab: their GitHub Pages surfaces; source paths point into the portal repository where appropriate.

## Contact truth policy
The Contact page intentionally avoids a non-functional HTML form. Email links open the visitor's mail client, GitHub links route engineering conversations to public source, and LinkedIn remains a professional-network option. No SLA or “reply within N hours” claim is made.

## Frozen surfaces
Home, Explore, Journey, Interactive Lab, Evidence Field, typography tokens, selective-glass intensity and v4.1 Context Rail geometry are not redesigned in v4.2.
