# Skill X API Worker deployment record

The live API service is `smaraze-api`, bound to D1 database `avyaan` and the
custom hostname `api.smaraze.com`.

Use `worker-final.js` with `wrangler.final.jsonc` for future releases. It is
the syntax-verified entrypoint containing the Workers-compatible PBKDF2
parameters and Razorpay order/signature endpoints. The older `worker.js` and
`worker-runtime.js` files are retained as audit artifacts.

The static `smaraze` Worker currently proxies `/api/*` to
`https://api.smaraze.com` through its `API_ORIGIN` binding.
