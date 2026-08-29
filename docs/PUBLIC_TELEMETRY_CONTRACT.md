# Public Telemetry Contract

## Scope

v0.7 continues to track only public, non-sensitive GitHub repository evidence for selected Annapurna projects.

Tracked seed repositories:

| ID | Repository | World | Seed snapshot 2026-08-25 |
|---|---|---|---|
| portal | annapurnaagenticsolutions/annapurna-portal | Website Studio / public surface | 19 commits · 0 issues · 0 stars · 0 forks |
| axon | annapurnaagenticsolutions/axon | AXON | 18 commits · 9 issues · 0 stars · 2 forks |
| mesh | annapurnaagenticsolutions/open-enterprise-agentops-mesh | AI Solutions | 8 commits · 0 issues · 0 stars · 0 forks |

## What these signals mean

They are public engineering evidence: repository existence, history size and currently visible public counts.

## What they do not mean

They do **not** establish:

- production readiness;
- enterprise adoption;
- active customers;
- revenue;
- quality;
- security;
- reliability;
- market traction;
- product maturity.

Those require separate evidence classes.

## Collection model

CI may use GitHub REST API with `GITHUB_TOKEN` to generate static JSON during deployment. The browser does not call GitHub APIs and receives no GitHub token.

## Failure model

If refresh fails, the committed verified seed remains usable. Failure to refresh is preferable to silently substituting fabricated counters.
