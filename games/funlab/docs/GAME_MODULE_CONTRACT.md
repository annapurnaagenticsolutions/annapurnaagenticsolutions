# Game Module Contract

A game exports:
- `meta = { id, emoji, title, tagline, verb }`
- `mount(root, ctx, challenge?)`

`ctx` exposes:
- `dayKey`
- `dailySeed`
- `record(summary)`
- `shared(status)`
- `ping(type)`

A new game should have one dominant verb, first useful feedback in under ~60 seconds, no mandatory signup, mobile-safe controls, and at least one replay or share path.
