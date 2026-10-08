export async function reserveTenantQuota(env, tenant, leaseId) {
  if (!env?.TENANT_QUOTA) throw new Error("Tenant quota coordinator is not configured");
  const coordinator = env.TENANT_QUOTA.getByName(tenant.tenantId);
  return coordinator.reserve({
    leaseId,
    nowMs: Date.now(),
    policy: {
      requestsPerMinute: tenant.requestsPerMinute,
      requestsPerDay: tenant.requestsPerDay,
      maxConcurrent: tenant.maxConcurrent,
    },
  });
}

export async function releaseTenantQuota(env, tenant, leaseId) {
  if (!env?.TENANT_QUOTA) throw new Error("Tenant quota coordinator is not configured");
  await env.TENANT_QUOTA.getByName(tenant.tenantId).release({ leaseId });
}
