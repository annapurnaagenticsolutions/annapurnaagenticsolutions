// This import is emitted by wasm-pack (Cargo feature "wasm").
import { check_json } from "../pkg/invariantc.js";
import { createHandler } from "./handler.mjs";
import { isPublicSuffixHostname } from "./public-suffix.mjs";
import { runScheduledMaintenance } from "./scheduled.mjs";

export { TenantQuota } from "./tenant-quota-do.mjs";
const fetchHandler = createHandler(check_json, { publicSuffixCheck: isPublicSuffixHostname });

export default {
  fetch: fetchHandler,
  scheduled(controller, env) {
    return runScheduledMaintenance(controller, env);
  },
};
