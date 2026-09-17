export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
}

const GAME_IDS = new Set(["funlab", "oneiric", "kids-puzzle-world", "vidya-yantra", "varsha-hollow"]);
const MAX_PAYLOAD_BYTES = 96 * 1024;
const PLAYER_KEY_PATTERN = /^[A-Za-z0-9_-]{16,96}$/;

const catalog = [
  { id: "funlab", name: "FunLab", kind: "playground", status: "free-preview" },
  { id: "oneiric", name: "ONEIRIC", kind: "standalone", status: "free-preview" },
  { id: "kids-puzzle-world", name: "Kids Puzzle World", kind: "puzzle-world", status: "free-preview" },
  { id: "vidya-yantra", name: "Vidya Yantra", kind: "learning-world", status: "showcase" },
  { id: "varsha-hollow", name: "Varsha Hollow", kind: "narrative-world", status: "public-preview" },
] as const;

function allowedOrigin(request: Request, env: Env): string {
  const origin = request.headers.get("Origin") ?? "";
  const configured = (env.ALLOWED_ORIGINS ?? "https://play.annapurnaagenticsolutions.com,https://annapurnaagenticsolutions.com")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.includes(origin) ? origin : configured[0] ?? "https://play.annapurnaagenticsolutions.com";
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Origin": allowedOrigin(request, env),
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });
  return headers;
}

function json(request: Request, env: Env, body: unknown, status = 200, cache = "no-store"): Response {
  const headers = corsHeaders(request, env);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", cache);
  return new Response(JSON.stringify(body), { status, headers });
}

function routeParts(pathname: string): { gameId: string; playerKey: string } | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 4 || parts[0] !== "v1" || parts[1] !== "progress") return null;
  return { gameId: parts[2], playerKey: parts[3] };
}

async function digestPlayerKey(playerKey: string): Promise<string> {
  const bytes = new TextEncoder().encode(playerKey);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseProgressPayload(value: unknown): { schemaVersion: number; state: Record<string, unknown> } | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { schemaVersion?: unknown; state?: unknown };
  if (!Number.isInteger(candidate.schemaVersion) || Number(candidate.schemaVersion) < 1) return null;
  if (!candidate.state || typeof candidate.state !== "object" || Array.isArray(candidate.state)) return null;
  return { schemaVersion: Number(candidate.schemaVersion), state: candidate.state as Record<string, unknown> };
}

async function handleProgress(request: Request, env: Env, gameId: string, playerKey: string): Promise<Response> {
  if (!GAME_IDS.has(gameId) || !PLAYER_KEY_PATTERN.test(playerKey)) return json(request, env, { error: "invalid progress key" }, 400);
  const playerKeyHash = await digestPlayerKey(playerKey);

  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT schema_version, payload, updated_at FROM game_progress WHERE game_id = ?1 AND player_key_hash = ?2")
      .bind(gameId, playerKeyHash)
      .first<{ schema_version: number; payload: string; updated_at: string }>();
    if (!row) return json(request, env, { gameId, found: false });
    return json(request, env, { gameId, found: true, schemaVersion: row.schema_version, state: JSON.parse(row.payload), updatedAt: row.updated_at });
  }

  if (request.method !== "PUT") return json(request, env, { error: "method not allowed" }, 405);
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > MAX_PAYLOAD_BYTES) return json(request, env, { error: "progress payload too large" }, 413);
  let body: unknown;
  try { body = await request.json(); } catch { return json(request, env, { error: "invalid JSON" }, 400); }
  const parsed = parseProgressPayload(body);
  if (!parsed) return json(request, env, { error: "expected schemaVersion and object state" }, 400);
  const payload = JSON.stringify(parsed.state);
  if (new TextEncoder().encode(payload).byteLength > MAX_PAYLOAD_BYTES) return json(request, env, { error: "progress payload too large" }, 413);
  const updatedAt = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO game_progress (game_id, player_key_hash, schema_version, payload, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5)
    ON CONFLICT(game_id, player_key_hash) DO UPDATE SET schema_version = excluded.schema_version, payload = excluded.payload, updated_at = excluded.updated_at`)
    .bind(gameId, playerKeyHash, parsed.schemaVersion, payload, updatedAt)
    .run();
  return json(request, env, { ok: true, gameId, schemaVersion: parsed.schemaVersion, updatedAt });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    if (url.pathname === "/health") return json(request, env, { ok: true, service: "annapurna-play-api", mode: "guest-first" }, 200, "no-cache");
    if (url.pathname === "/v1/catalog" && request.method === "GET") return json(request, env, { titles: catalog }, 200, "public, max-age=300");
    const progress = routeParts(url.pathname);
    if (progress) return handleProgress(request, env, progress.gameId, progress.playerKey);
    return json(request, env, { error: "not found" }, 404);
  },
};
