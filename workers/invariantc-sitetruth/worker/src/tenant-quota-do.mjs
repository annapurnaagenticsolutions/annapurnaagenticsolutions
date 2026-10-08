import { DurableObject } from "cloudflare:workers";
import { initializeQuotaStorage, releaseQuota, reserveQuota } from "./tenant-quota-core.mjs";

export class TenantQuota extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(() => initializeQuotaStorage(ctx.storage.sql));
  }

  reserve(input) {
    return reserveQuota(this.ctx.storage.sql, input);
  }

  release(input) {
    return releaseQuota(this.ctx.storage.sql, input);
  }
}
