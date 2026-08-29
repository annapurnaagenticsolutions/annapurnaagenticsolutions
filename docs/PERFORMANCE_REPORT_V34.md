# Performance Report v3.4

v3.4 adds no framework, renderer, WebGL context, font, image, API call or third-party runtime. The runtime change is a DOM-parent guard in the existing adaptive ordering path plus negligible CSS ownership rules. Existing gzip budgets remain unchanged and are enforced by the release audit.
