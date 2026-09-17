# Challenge and Friend-Room Contract v1

## Challenge
A challenge is encoded as URL-safe versioned JSON and routed to one game. The game must:
- bound every challenge-derived string before use;
- escape it before inserting into HTML;
- ignore unsupported fields;
- keep deterministic state authoritative;
- allow the recipient to play without account creation.

## Friend room
A v0.2 room contains:
- `id`, `gameId`, `prompt`, `createdAt`;
- up to 8 bounded `{name, answer}` entries.

There is no remote room database in v0.2. Adding a response produces an updated URL. This is intentionally a prototype for asynchronous comparison, not simulated realtime collaboration.
