# SiteTruth scan-intake control plane

**Status:** local implementation only. The staging profile has every scan gate disabled and has no Queue, R2, Cron Trigger, encryption key, queue consumer, or browser runner. This document describes the code contract; it is not an authorization to activate URL scanning.

## API contract

`POST /v1/scans` requires the tenant bearer key and an `Idempotency-Key` header of 16–128 ASCII letters, digits, underscore, dot, or hyphen. Its JSON body contains `origin_id`, `capture`, `contract`, and `page_limit`. The tenant and origin are derived from authenticated D1 records, never from a caller-supplied tenant ID.

The capture must pair with the typed contract, target the exact verified HTTPS origin, use a URL without credentials, query, or fragment, and contain no browser actions. The page limit cannot exceed the tenant policy; the run budget comes from policy. The request body is capped at 256 KiB and the canonical encrypted contract/capture plaintext at 48 KiB. Reuse of an idempotency key with the same canonical request returns the existing job; a different request returns `409`.

`GET /v1/scans/{scan_id}` returns status for the authenticated tenant only. There is no report retrieval endpoint, scan queue consumer, browser runtime, or execution result path in this implementation. A `202` response means a durable queued job exists; `dispatch_status: dispatched` means only that the Queue accepted the small identifier message.

## Data lifecycle and queue behavior

Migration `0008` stores the request hash on the job and the capture/contract as AES-GCM ciphertext in `scan_job_dispatch_outbox`. Associated data binds the key ID, tenant ID, scan ID, origin ID, and payload hash. The D1 outbox row retains a random nonce and ciphertext for at most 24 hours and no later than the job retention deadline. Queue messages contain only `{version, scan_id, tenant_id}`. Terminal job transitions delete ciphertext and create compact deletion evidence; the configured scan-job audit window later expires that evidence.

The intake writes the job and outbox in one D1 batch, then attempts an immediate queue send. Send failures stay pending for bounded scheduled retries. Cloudflare Queues can redeliver, so a future consumer must be idempotent: use `claimScanJobForExecution` and recheck the tenant, origin proof, canonical origin, and run budget immediately before navigation. A send acknowledgment is not a scan start or scan completion.

`runScheduledMaintenance` includes a bounded outbox dispatcher, but the staging Worker has no Cron Trigger. The API has no queue `consumer` handler. Until an approved runner and maintenance schedule exist, `SCAN_RUNNER_READY` and `SCAN_MAINTENANCE_READY` must remain false.

## Encryption key ring

The future Worker configuration expects:

- Secret `SCAN_PAYLOAD_ENCRYPTION_KEYS`: a JSON object mapping one to four key IDs to 32-byte lowercase hex AES keys.
- Variable `SCAN_PAYLOAD_ACTIVE_KEY_ID`: the key ID used for new payloads.

The key ID is stored with each outbox row and authenticated as AES-GCM associated data. Keep key material in Cloudflare secrets only; never add it to `wrangler.toml`, source, logs, tickets, or chat. The current staging configuration contains neither value and needs neither while scan gates are false. After an approved staging release plan, provision the keyring interactively with `wrangler secret put SCAN_PAYLOAD_ENCRYPTION_KEYS --config worker/wrangler.toml`; put only the non-secret active key ID in the selected environment's `[vars]` section. Do not run that command as part of local validation or production preparation without the corresponding release approval.

For rotation, deploy a key ring containing both the old and new key, then change the active ID. Keep the old key until there are no outbox rows for that ID, and only then remove it from the key ring. The current application has no administrative route to cancel unreadable pending jobs, so loss of an old key before its outbox rows are terminally deleted can make those jobs undecryptable. Test this lifecycle with the actual queue consumer before enabling hosted intake.

## Readiness and external gates

Creating scans requires all of the following: `DOMAIN_VERIFICATION_ENABLED`, `SCAN_JOB_RETENTION_ENABLED`, `SCAN_JOB_RECOVERY_ENABLED`, `SCAN_INTAKE_ENABLED`, `SCAN_OUTBOX_DISPATCH_ENABLED`, `SCAN_EXECUTION_ENABLED`, `SCAN_QUEUE_CONSUMER_READY`, `SCAN_RUNNER_READY`, and `SCAN_MAINTENANCE_READY` set to `true`; D1 and the tenant quota Durable Object; a Queue producer; a valid key ring and active key ID; and operator-approved `SCAN_PAYLOAD_TTL_MS`, `SCAN_QUEUED_MAX_AGE_MS`, `SCAN_RUNNING_GRACE_MS`, and `SCAN_JOB_AUDIT_RETENTION_MS` values. Consumer readiness and browser-runner readiness are separate gates. The payload TTL must cover queue age plus the tenant policy's maximum run time and grace, and cannot exceed 24 hours. These booleans are operator attestations; they do not prove that D1 transactions, the queue consumer, the browser sandbox, or network egress are healthy.

Before setting any scan flag, the release plan still requires live DNS proof, application-level Cloudflare D1/Queue behavior, scheduled retention/recovery tests, a security-reviewed browser runtime, independently enforced checked-address egress, browser and fuzz CI results, capacity/cost limits, authorized human-reviewed defect data, the consenting-owner pilot, and legal/privacy/operations review. Migrations `0001`–`0008` are recorded in APAC staging; the D1 API batch rollback smoke does not exercise intake/quota/cleanup behavior. Production deployment requires separate explicit approval.
