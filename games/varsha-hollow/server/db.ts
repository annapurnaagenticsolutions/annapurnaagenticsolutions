import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { gameProgress, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  for (const field of textFields) {
    const value = user[field];
    if (value !== undefined) {
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export type PersistedGameState = {
  currentChapterId: number;
  villageProgress: number;
  stats: unknown;
  relationships: unknown;
  unlockedSlimes: unknown;
  history: unknown;
  lastConsequence: string | null;
  lastSummary: string | null;
};

export async function getGameProgressByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gameProgress).where(eq(gameProgress.userId, userId)).limit(1);
  return result[0];
}

export async function saveGameProgressForUser(userId: number, state: PersistedGameState) {
  const db = await getDb();
  if (!db) return undefined;

  const payload = {
    currentChapterId: state.currentChapterId,
    villageProgress: state.villageProgress,
    stats: JSON.stringify(state.stats),
    relationships: JSON.stringify(state.relationships),
    unlockedSlimes: JSON.stringify(state.unlockedSlimes),
    history: JSON.stringify(state.history),
    lastConsequence: state.lastConsequence,
    lastSummary: state.lastSummary,
    updatedAt: new Date(),
  };

  const existing = await getGameProgressByUserId(userId);
  if (existing) {
    await db.update(gameProgress).set(payload).where(eq(gameProgress.userId, userId));
  } else {
    await db.insert(gameProgress).values({ userId, ...payload });
  }

  return getGameProgressByUserId(userId);
}
