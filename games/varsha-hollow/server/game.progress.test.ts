import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

vi.mock("./db", () => ({
  getGameProgressByUserId: vi.fn(),
  saveGameProgressForUser: vi.fn(),
}));

const mockedGet = vi.mocked(db.getGameProgressByUserId);
const mockedSave = vi.mocked(db.saveGameProgressForUser);

function createContext(user: TrpcContext["user"] = {
  id: 7,
  openId: "reader-7",
  email: "reader@example.com",
  name: "Reader",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
}): TrpcContext {
  return {
    user,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("game progress procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSave.mockResolvedValue(undefined as never);
  });

  it("starts a new run with the Season 1 defaults", async () => {
    mockedGet.mockResolvedValue(undefined);
    const result = await appRouter.createCaller(createContext()).game.start();

    expect(result).toMatchObject({
      currentChapterId: 1,
      villageProgress: 10,
      stats: { Empathy: 1, Wisdom: 1, Practicality: 1 },
      unlockedSlimes: ["Dew"],
    });
    expect(mockedSave).toHaveBeenCalledOnce();
  });

  it("deserializes a saved run and accepts a validated save payload", async () => {
    mockedGet.mockResolvedValue({
      id: 2,
      userId: 7,
      currentChapterId: 11,
      villageProgress: 42,
      stats: JSON.stringify({ Empathy: 4, Wisdom: 5, Practicality: 3 }),
      relationships: JSON.stringify({ Meera: 4, Leela: 2, Tara: 1, Kabir: 0, Dev: 3 }),
      unlockedSlimes: JSON.stringify(["Dew", "Clay", "Herb"]),
      history: JSON.stringify([]),
      lastConsequence: "The market opens.",
      lastSummary: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(createContext());
    const loaded = await caller.game.load();
    expect(loaded?.currentChapterId).toBe(11);
    expect(loaded?.unlockedSlimes).toEqual(["Dew", "Clay", "Herb"]);

    const saved = await caller.game.save({
      currentChapterId: 12,
      villageProgress: 45,
      stats: { Empathy: 4, Wisdom: 5, Practicality: 4 },
      relationships: { Meera: 4, Leela: 3, Tara: 1, Kabir: 0, Dev: 3 },
      unlockedSlimes: ["Dew", "Clay", "Herb"],
      history: [],
      lastConsequence: "A fair bargain is written.",
      lastSummary: null,
    });
    expect(saved.currentChapterId).toBe(12);
    expect(mockedSave).toHaveBeenCalledOnce();
  });

  it("requires authentication for cloud progress", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.game.load()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
