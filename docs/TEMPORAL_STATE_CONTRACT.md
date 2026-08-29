# Shared Temporal State Contract

`data/temporal-state.json` is a cached, server/deploy-generated presentation state.

## Authoritative clock
The current configuration uses `Asia/Kolkata` as the shared brand clock. This is a presentation configuration, not a claim about a visitor's location.

## Interval
`generationIntervalDays` is stored in the state file. `scripts/generate_temporal_state.py` checks `lastGeneratedAt` and regenerates only after the interval has elapsed, unless `--force` is used.

## Current signals
- authoritative date;
- weekday.

Weather is intentionally disabled until a deliberate brand home-base is configured. No browser geolocation is requested.

## Failure behavior
- generator not due -> keep current state;
- generator fails -> deployed workflow retains last valid state;
- state fetch fails in browser -> neutral built-in fallback;
- visitor-local time never overwrites shared temporal state.

## Truth/history firewall
Temporal state is presentation-only and is excluded from semantic company history.
