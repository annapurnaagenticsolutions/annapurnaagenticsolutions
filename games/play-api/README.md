# Annapurna Play API

This Worker is the shared backend boundary for the play platform. It is deliberately small and guest-first:

- `GET /health` exposes an operational check without user data.
- `GET /v1/catalog` returns the public five-title catalogue.
- `GET /v1/progress/:gameId/:playerKey` loads an opaque-device progress record.
- `PUT /v1/progress/:gameId/:playerKey` stores a bounded, versioned progress record.

The API stores a SHA-256 digest of the client-generated player key rather than the key itself. It does not collect names, emails, child profiles, chat, or raw identity data. Authentication, parent-mediated accounts and cross-device recovery are separate product decisions and must not be inferred from this anonymous sync boundary.

Apply `schema.sql` to the D1 database before the first production deployment. The frontend integrations for Vidya Yantra and Varsha Hollow should call this API only after the visible save/sync boundary is designed; local saves remain the recovery path.
