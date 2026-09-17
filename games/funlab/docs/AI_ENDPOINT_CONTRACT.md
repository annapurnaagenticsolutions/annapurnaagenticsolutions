# FunLab Intelligence Endpoint Contract v0.2

Browser request:

```json
{"task":"versus | persuade | jugaad | combine | court","payload":{}}
```

The reference server:
1. accepts only known tasks;
2. validates required fields, string lengths and numeric ranges from `schemas/intelligence.schemas.json`;
3. applies a small per-IP request-rate limit;
4. runs deterministic server-local logic when no upstream is configured;
5. otherwise forwards to `FUNLAB_UPSTREAM_ENDPOINT` and normalizes its returned fields;
6. returns `_mode` and `_provider` so the caller can represent provenance truthfully.

Production integration should additionally use the chosen provider's authentication, moderation/abuse controls, observability and cost budgets. Never expose provider API keys in browser JavaScript.
