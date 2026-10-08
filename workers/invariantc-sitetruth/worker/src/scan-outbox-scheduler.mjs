import { dispatchPendingScanJobs } from "./scan-outbox.mjs";

const MAX_SCAN_OUTBOX_DISPATCHES_PER_RUN = 25;

export async function runScanOutboxDispatchIfEnabled(env, { nowMs = Date.now() } = {}) {
  if (env?.SCAN_OUTBOX_DISPATCH_ENABLED !== "true") return { status: "disabled" };
  if (!env?.DB || !env?.SCAN_QUEUE || typeof env.SCAN_QUEUE.send !== "function") {
    throw new Error("Scan outbox dispatch requires D1 and the approved Queue producer binding");
  }
  const result = await dispatchPendingScanJobs(env.DB, env.SCAN_QUEUE, {
    nowMs,
    limit: MAX_SCAN_OUTBOX_DISPATCHES_PER_RUN,
  });
  return { status: "completed", ...result };
}
