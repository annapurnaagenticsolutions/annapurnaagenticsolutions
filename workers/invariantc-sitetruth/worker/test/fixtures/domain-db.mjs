export class MemoryDomainDb {
  constructor() {
    this.challenges = [];
    this.origins = [];
  }

  prepare(sql) {
    const db = this;
    return {
      bind(...values) {
        return {
          sql,
          values,
          run: () => db.run(sql, values),
          first: () => db.first(sql, values),
        };
      },
    };
  }

  async batch(statements) {
    const snapshot = structuredClone({ challenges: this.challenges, origins: this.origins });
    try {
      const results = [];
      for (const statement of statements) results.push(await this.run(statement.sql, statement.values));
      return results;
    } catch (error) {
      this.challenges = snapshot.challenges;
      this.origins = snapshot.origins;
      throw error;
    }
  }

  async run(sql, values) {
    if (sql.includes("INSERT INTO domain_challenges")) {
      const [challengeId, tenantId, hostname, tokenHash, issuedAt, expiresAt, countTenant, countCutoff, hostTenant, hostName, hostCutoff] = values;
      const recentTenant = this.challenges.filter((item) => item.tenant_id === countTenant && item.issued_at_ms > countCutoff).length;
      const recentHost = this.challenges.some((item) => item.tenant_id === hostTenant && item.hostname_ascii === hostName && item.issued_at_ms > hostCutoff);
      if (recentTenant >= 3 || recentHost) return { success: true, meta: { changes: 0 } };
      this.challenges.push({
        challenge_id: challengeId, tenant_id: tenantId, hostname_ascii: hostname,
        token_sha256: tokenHash, issued_at_ms: issuedAt, expires_at_ms: expiresAt,
        verification_attempts: 0, last_attempt_at_ms: null, consumed_at_ms: null,
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.includes("UPDATE domain_challenges") && sql.includes("verification_attempts = verification_attempts + 1")) {
      const [nowMs, tenantId, challengeId, expiresAfter, cooldownCutoff] = values;
      const row = this.challenges.find((item) => item.tenant_id === tenantId && item.challenge_id === challengeId);
      if (!row || row.consumed_at_ms !== null || row.expires_at_ms <= expiresAfter ||
          row.verification_attempts >= 5 || (row.last_attempt_at_ms !== null && row.last_attempt_at_ms > cooldownCutoff)) {
        return { success: true, meta: { changes: 0 } };
      }
      row.verification_attempts += 1;
      row.last_attempt_at_ms = nowMs;
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.includes("UPDATE domain_challenges SET consumed_at_ms")) {
      const [nowMs, tenantId, challengeId, expiresAfter, tokenHash] = values;
      const row = this.challenges.find((item) => item.tenant_id === tenantId && item.challenge_id === challengeId);
      if (!row || row.consumed_at_ms !== null || row.expires_at_ms <= expiresAfter || row.token_sha256 !== tokenHash) {
        return { success: true, meta: { changes: 0 } };
      }
      row.consumed_at_ms = nowMs;
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.includes("INSERT INTO verified_origins")) {
      const [originId, verifiedAt, expiresAt, tenantId, challengeId, consumedAt, expiresAfter] = values;
      const challenge = this.challenges.find((item) => item.tenant_id === tenantId && item.challenge_id === challengeId &&
        item.consumed_at_ms === consumedAt && item.expires_at_ms >= expiresAfter);
      if (!challenge || challenge.consumed_at_ms !== verifiedAt) {
        return { success: true, meta: { changes: 0 } };
      }
      const hostname = challenge.hostname_ascii;
      let origin = this.origins.find((item) => item.tenant_id === tenantId && item.hostname_ascii === hostname);
      if (origin) {
        if (this.origins.some((item) => item.tenant_id === tenantId && item.challenge_id === challengeId)) {
          throw new Error("UNIQUE tenant challenge");
        }
        Object.assign(origin, { challenge_id: challengeId, verified_at_ms: verifiedAt, expires_at_ms: expiresAt, revoked_at_ms: null });
      } else {
        origin = { origin_id: originId, tenant_id: tenantId, hostname_ascii: hostname, origin: `https://${hostname}`, challenge_id: challengeId, verified_at_ms: verifiedAt, expires_at_ms: expiresAt, revoked_at_ms: null };
        this.origins.push(origin);
      }
      return { success: true, meta: { changes: 1 } };
    }

    if (sql.includes("UPDATE verified_origins SET revoked_at_ms")) {
      const [nowMs, tenantId, originId] = values;
      const row = this.origins.find((item) => item.tenant_id === tenantId && item.origin_id === originId && item.revoked_at_ms === null);
      if (!row) return { success: true, meta: { changes: 0 } };
      row.revoked_at_ms = nowMs;
      return { success: true, meta: { changes: 1 } };
    }

    throw new Error(`Unsupported fake D1 statement: ${sql.trim().split(/\s+/).slice(0, 4).join(" ")}`);
  }

  async first(sql, values) {
    if (sql.includes("FROM domain_challenges")) {
      const [tenantId, challengeId] = values;
      const row = this.challenges.find((item) => item.tenant_id === tenantId && item.challenge_id === challengeId);
      if (!row) return null;
      if (sql.includes("SELECT hostname_ascii, token_sha256")) {
        const nowMs = values[2];
        if (row.consumed_at_ms !== null || row.expires_at_ms <= nowMs) return null;
        return { hostname_ascii: row.hostname_ascii, token_sha256: row.token_sha256 };
      }
      return {
        consumed_at_ms: row.consumed_at_ms,
        expires_at_ms: row.expires_at_ms,
        verification_attempts: row.verification_attempts,
        last_attempt_at_ms: row.last_attempt_at_ms,
      };
    }
    if (sql.includes("SELECT origin_id FROM verified_origins")) {
      const row = this.origins.find((item) => item.tenant_id === values[0] &&
        (item.hostname_ascii === values[1] || item.origin_id === values[1]));
      return row ? { origin_id: row.origin_id } : null;
    }
    throw new Error(`Unsupported fake D1 query: ${sql.trim().split(/\s+/).slice(0, 4).join(" ")}`);
  }
}
