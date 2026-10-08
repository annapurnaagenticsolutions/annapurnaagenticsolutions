#!/usr/bin/env node
/** Create one pilot API token without printing or storing it inside the repository. */
import { createHash, randomBytes } from "node:crypto";
import { realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function argumentsMap(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value || values.has(key)) throw new Error("Use --tenant-id <opaque-id> --secret-file <absolute-path> [--expires-days <1-365]");
    values.set(key, value);
  }
  return values;
}

try {
  const args = argumentsMap(process.argv.slice(2));
  const tenantId = args.get("--tenant-id");
  const secretPathArgument = args.get("--secret-file");
  const expiresDays = Number(args.get("--expires-days") ?? 90);
  if (!tenantId || !/^[A-Za-z0-9_-]{1,80}$/.test(tenantId)) throw new Error("tenant-id must be an opaque 1-80 character ID");
  if (!secretPathArgument || !isAbsolute(secretPathArgument)) throw new Error("secret-file must be an absolute path outside the repository");
  if (!Number.isSafeInteger(expiresDays) || expiresDays < 1 || expiresDays > 365) throw new Error("expires-days must be an integer from 1 to 365");

  const repositoryRoot = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  const requestedPath = resolve(secretPathArgument);
  const secretParent = await realpath(dirname(requestedPath));
  const secretPath = resolve(secretParent, basename(requestedPath));
  const relativePath = relative(repositoryRoot, secretPath);
  const insideRepository = relativePath === "" || (!isAbsolute(relativePath) && relativePath !== ".." && !relativePath.startsWith(`..${sep}`));
  if (insideRepository) throw new Error("secret-file must be outside the repository");

  const keyId = randomBytes(16).toString("base64url");
  const secret = randomBytes(32).toString("base64url");
  const token = `stp_${keyId}_${secret}`;
  const tokenHash = createHash("sha256").update(secret, "utf8").digest("hex");
  const now = Date.now();
  const expiresAt = now + expiresDays * 86_400_000;
  await writeFile(secretPath, `${token}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });

  const sql = `INSERT INTO api_keys (key_id, tenant_id, token_sha256, status, created_at_ms, expires_at_ms) VALUES ('${keyId}', '${tenantId}', '${tokenHash}', 'active', ${now}, ${expiresAt});`;
  process.stdout.write(`${JSON.stringify({ secret_file: secretPath, tenant_id: tenantId, key_id: keyId, token_sha256: tokenHash, expires_at_ms: expiresAt, insert_sql: sql }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`Pilot key not created: ${error.message}\n`);
  process.exitCode = 2;
}
