# Embedded Page Agent Contract

The v1.4 guide is an embedded page actor, not a generic chatbot.

## Tools
- `filterContent(intent)` — apply an intent model to current page structure.
- `navigateToSection(target)` — move to focused pages or sections.
- `highlightElement(target)` — visually identify the requested world/control.
- `explainCurrentView()` — disclose the active intent, source/reason and depth.
- `adjustDepth(level)` — switch concise / standard / deep presentation.
- `setWorld(world)` — reuse the living ecosystem/world inspector state.

## Safety rules
- rules-first/on-device; no LLM endpoint in v1.4;
- dismissible and non-modal;
- no content is gated behind the guide;
- normal static navigation remains available;
- no identity tracking or remote behavioral analytics;
- the guide cannot alter product maturity, evidence, repository signals or company history;
- “production-ready” requests are not silently mapped from a public `Live` label; the guide redirects to evidence instead.
