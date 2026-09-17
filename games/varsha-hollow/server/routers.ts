import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getGameProgressByUserId, saveGameProgressForUser } from "./db";

const statsSchema = z.object({
  Empathy: z.number().int().min(0).max(12),
  Wisdom: z.number().int().min(0).max(12),
  Practicality: z.number().int().min(0).max(12),
});

const relationshipsSchema = z.object({
  Meera: z.number().int().min(0).max(12),
  Leela: z.number().int().min(0).max(12),
  Tara: z.number().int().min(0).max(12),
  Kabir: z.number().int().min(0).max(12),
  Dev: z.number().int().min(0).max(12),
});

const gameStateSchema = z.object({
  currentChapterId: z.number().int().min(1).max(36),
  villageProgress: z.number().int().min(0).max(100),
  stats: statsSchema,
  relationships: relationshipsSchema,
  unlockedSlimes: z.array(z.enum(["Dew", "Clay", "Lantern", "Herb", "Echo"])),
  history: z.array(z.object({
    chapterId: z.number().int(),
    chapterTitle: z.string(),
    choiceId: z.string(),
    choiceLabel: z.string(),
    consequence: z.string(),
  })),
  lastConsequence: z.string().nullable(),
  lastSummary: z.string().nullable(),
});

type SerializedProgress = z.infer<typeof gameStateSchema>;

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function deserializeProgress(row: Awaited<ReturnType<typeof getGameProgressByUserId>>): SerializedProgress | null {
  if (!row) return null;
  return {
    currentChapterId: row.currentChapterId,
    villageProgress: row.villageProgress,
    stats: parseJson(row.stats, { Empathy: 1, Wisdom: 1, Practicality: 1 }),
    relationships: parseJson(row.relationships, { Meera: 0, Leela: 0, Tara: 0, Kabir: 0, Dev: 0 }),
    unlockedSlimes: parseJson(row.unlockedSlimes, ["Dew"]),
    history: parseJson(row.history, []),
    lastConsequence: row.lastConsequence ?? null,
    lastSummary: row.lastSummary ?? null,
  };
}

const emptyState: SerializedProgress = {
  currentChapterId: 1,
  villageProgress: 10,
  stats: { Empathy: 1, Wisdom: 1, Practicality: 1 },
  relationships: { Meera: 0, Leela: 0, Tara: 0, Kabir: 0, Dev: 0 },
  unlockedSlimes: ["Dew"],
  history: [],
  lastConsequence: null,
  lastSummary: null,
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  game: router({
    load: protectedProcedure.query(async ({ ctx }) => {
      return deserializeProgress(await getGameProgressByUserId(ctx.user.id));
    }),
    start: protectedProcedure.mutation(async ({ ctx }) => {
      const current = await getGameProgressByUserId(ctx.user.id);
      if (current) return deserializeProgress(current);
      await saveGameProgressForUser(ctx.user.id, emptyState);
      return emptyState;
    }),
    save: protectedProcedure.input(gameStateSchema).mutation(async ({ ctx, input }) => {
      await saveGameProgressForUser(ctx.user.id, input);
      return input;
    }),
  }),
});

export type AppRouter = typeof appRouter;
