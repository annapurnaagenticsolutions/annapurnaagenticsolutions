import { describe, expect, it } from "vitest";
import { CHAPTER_BY_ID, CHAPTERS } from "./chapters";
import { applyChoice, beginJourney, createFreshState } from "./reducer";
import {
  createKeeperResources,
  getProsperityStage,
  meetsRequirements,
  resolveDialogue,
  resolveVariant,
  type Chapter,
  type NarrativeChoice,
} from "./types";

describe("Varsha Hollow narrative state", () => {
  it("applies stat, relationship, village, and slime consequences", () => {
    const chapter = CHAPTER_BY_ID.get(6)!;
    const state = createFreshState();
    const choice = chapter.choices.find((item) => item.id === "name-feeling")!;
    const next = applyChoice(state, chapter, choice);

    expect(next.stats.Empathy).toBe(2);
    expect(next.relationships.Meera).toBe(1);
    expect(next.villageProgress).toBe(13);
    expect(next.unlockedSlimes).toContain("Clay");
    expect(next.currentChapterId).toBe(7);
    expect(next.history).toHaveLength(1);
  });

  it("keeps the season sequence and prosperity stages deterministic", () => {
    const state = createFreshState();
    expect(getProsperityStage(state.villageProgress)).toBe("Survival");
    expect(getProsperityStage(20)).toBe("Recovery");
    expect(getProsperityStage(40)).toBe("Connection");
    expect(getProsperityStage(60)).toBe("Growth");
    expect(getProsperityStage(80)).toBe("Identity");
    expect(CHAPTER_BY_ID.get(1)?.arc).toBe("Dry Shrine");
    expect(CHAPTER_BY_ID.get(6)?.arc).toBe("Forty Roofs");
    expect(CHAPTER_BY_ID.get(11)?.arc).toBe("Hollow Market");
    expect(CHAPTER_BY_ID.get(16)?.arc).toBe("Moving Lights");
    expect(CHAPTER_BY_ID.get(21)?.arc).toBe("Great Storm");
  });

  it("preserves a new unlocked slime instead of duplicating it", () => {
    const chapter = CHAPTER_BY_ID.get(1)!;
    const state = createFreshState();
    const next = applyChoice(state, chapter, chapter.choices[0]!);
    expect(next.unlockedSlimes.filter((slime) => slime === "Dew")).toHaveLength(1);
  });
});

describe("Chapter graph integrity", () => {
  it("contains every chapter, arc, and at least three always-available choices", () => {
    expect(CHAPTERS).toHaveLength(38);
    expect(new Set(CHAPTERS.map((chapter) => chapter.arc))).toEqual(
      new Set(["Dry Shrine", "Forty Roofs", "Hollow Market", "Moving Lights", "Great Storm", "Forgotten Channels"]),
    );
    // Every chapter must have at least three choices. Additional choices are
    // allowed only when they carry a `requires` gate (state-reactive content).
    // Failure chapters (37, 38) have no choices because the journey is over.
    for (const chapter of CHAPTERS) {
      if (chapter.id === 37 || chapter.id === 38) {
        expect(chapter.choices, `Failure chapter ${chapter.id} should have no choices`).toHaveLength(0);
        continue;
      }
      const alwaysAvailable = chapter.choices.filter((c) => !c.requires).length;
      const gated = chapter.choices.filter((c) => c.requires).length;
      expect(alwaysAvailable, `Chapter ${chapter.id} must have at least 3 always-available choices`).toBeGreaterThanOrEqual(3);
      // Any choice beyond the first three must be gated.
      if (chapter.choices.length > 3) {
        expect(gated, `Chapter ${chapter.id} has extra choices that must all be gated`).toBe(chapter.choices.length - 3);
      }
    }
  });

  it("has exactly five ending chapters", () => {
    const endings = CHAPTERS.filter((chapter) => chapter.isEnding);
    expect(endings).toHaveLength(5);
    expect(endings.map((chapter) => chapter.id).sort((a, b) => a - b)).toEqual([25, 35, 36, 37, 38]);
  });

  it("routes every choice to a chapter that exists", () => {
    for (const chapter of CHAPTERS) {
      for (const choice of chapter.choices) {
        const targetId = choice.effect.nextChapterId ?? chapter.id + 1;
        expect(
          CHAPTER_BY_ID.has(targetId),
          `Chapter ${chapter.id} choice "${choice.id}" routes to missing chapter ${targetId}`,
        ).toBe(true);
      }
    }
  });
});

describe("Branching paths", () => {
  it("routes to the Forgotten Channels branch when reading the archives at chapter 5", () => {
    let state = beginJourney(createFreshState());
    // Play through chapters 1-4 picking the first (empathy) choice each time
    for (let id = 1; id <= 4; id++) {
      const chapter = CHAPTER_BY_ID.get(id)!;
      state = applyChoice(state, chapter, chapter.choices[0]!);
    }
    // At chapter 5, pick the wisdom choice (read-archives) to branch
    const ch5 = CHAPTER_BY_ID.get(5)!;
    const wisdomChoice = ch5.choices.find((c) => c.id === "read-archives")!;
    state = applyChoice(state, ch5, wisdomChoice);
    expect(state.currentChapterId).toBe(26);
  });

  it("routes to the Sanctuary branch when freeing jars at chapter 13", () => {
    let state = beginJourney(createFreshState());
    // Play through chapters 1-12 picking non-branching choices (first choice)
    for (let id = 1; id <= 12; id++) {
      const chapter = CHAPTER_BY_ID.get(id)!;
      state = applyChoice(state, chapter, chapter.choices[0]!);
    }
    // At chapter 13, pick the empathy choice (free-jars) to branch
    const ch13 = CHAPTER_BY_ID.get(13)!;
    const empathyChoice = ch13.choices.find((c) => c.id === "free-jars")!;
    state = applyChoice(state, ch13, empathyChoice);
    expect(state.currentChapterId).toBe(29);
  });

  it("routes to the Broken Seal branch when opening the door at chapter 18", () => {
    let state = beginJourney(createFreshState());
    // Play to chapter 18, avoiding branching choices
    let safety = 0;
    while (state.currentChapterId !== 18 && safety < 50) {
      const chapter = CHAPTER_BY_ID.get(state.currentChapterId)!;
      // At chapter 13, empathy (index 0) branches to 29, so pick wisdom (index 1)
      const choiceIndex = state.currentChapterId === 13 ? 1 : 0;
      state = applyChoice(state, chapter, chapter.choices[choiceIndex]!);
      safety++;
    }
    expect(state.currentChapterId).toBe(18);
    // At chapter 18, pick the practicality choice (open-door) to branch
    const ch18 = CHAPTER_BY_ID.get(18)!;
    const practicalityChoice = ch18.choices.find((c) => c.id === "open-door")!;
    state = applyChoice(state, ch18, practicalityChoice);
    expect(state.currentChapterId).toBe(31);
  });

  it("routes to different endings based on the chapter 24 choice", () => {
    const playToChapter24 = (pickIndex: number) => {
      let state = beginJourney(createFreshState());
      let safety = 0;
      while (state.currentChapterId !== 24 && safety < 50) {
        const chapter = CHAPTER_BY_ID.get(state.currentChapterId)!;
        state = applyChoice(state, chapter, chapter.choices[pickIndex]!);
        safety++;
      }
      return state;
    };

    // Empathy at chapter 24 -> ending 25
    let state = playToChapter24(0);
    const ch24 = CHAPTER_BY_ID.get(24)!;
    state = applyChoice(state, ch24, ch24.choices[0]!);
    expect(state.currentChapterId).toBe(25);

    // Wisdom at chapter 24 -> ending 35
    state = playToChapter24(1);
    state = applyChoice(state, ch24, ch24.choices[1]!);
    expect(state.currentChapterId).toBe(35);

    // Practicality at chapter 24 -> ending 36
    state = playToChapter24(2);
    state = applyChoice(state, ch24, ch24.choices[2]!);
    expect(state.currentChapterId).toBe(36);
  });

  it("can play the main path to an ending without losing state", () => {
    let state = beginJourney(createFreshState());
    let safety = 0;
    while (safety < 50) {
      const chapter = CHAPTER_BY_ID.get(state.currentChapterId)!;
      if (chapter.isEnding && state.history.some((h) => h.chapterId === chapter.id)) break;
      // Pick the first choice (empathy) which stays on the main path
      state = applyChoice(state, chapter, chapter.choices[0]!);
      safety++;
    }
    const finalChapter = CHAPTER_BY_ID.get(state.currentChapterId)!;
    expect(finalChapter.isEnding).toBe(true);
    expect(state.history.length).toBeGreaterThan(0);
  });

  it("can play the Forgotten Channels branch and converge back to the main path", () => {
    let state = beginJourney(createFreshState());
    // Play chapters 1-4
    for (let id = 1; id <= 4; id++) {
      const chapter = CHAPTER_BY_ID.get(id)!;
      state = applyChoice(state, chapter, chapter.choices[0]!);
    }
    // Branch at chapter 5 via wisdom
    const ch5 = CHAPTER_BY_ID.get(5)!;
    state = applyChoice(state, ch5, ch5.choices[1]!);
    expect(state.currentChapterId).toBe(26);
    // Play through the branch (26 -> 27 -> 28)
    for (let id = 26; id <= 28; id++) {
      const chapter = CHAPTER_BY_ID.get(id)!;
      state = applyChoice(state, chapter, chapter.choices[0]!);
    }
    // Should have converged back to chapter 10
    expect(state.currentChapterId).toBe(10);
    // Clay slime should be unlocked from the branch
    expect(state.unlockedSlimes).toContain("Clay");
  });
});

describe("State-reactive narrative system", () => {
  it("hides gated choices when requirements are not met", () => {
    const chapter = CHAPTER_BY_ID.get(3)!;
    const state = createFreshState();
    // Fresh state has Empathy 1, so the Empathy >= 3 gated choice is hidden.
    const visible = chapter.choices.filter((c) => meetsRequirements(c.requires, state));
    expect(visible.find((c) => c.id === "ask-fear")).toBeUndefined();
    expect(visible.length).toBe(3);
  });

  it("reveals gated choices when requirements are met", () => {
    const chapter = CHAPTER_BY_ID.get(3)!;
    const state = createFreshState();
    state.stats.Empathy = 3;
    const visible = chapter.choices.filter((c) => meetsRequirements(c.requires, state));
    const gated = visible.find((c) => c.id === "ask-fear");
    expect(gated).toBeDefined();
    expect(visible.length).toBe(4);
  });

  it("hides the Meera-locked choice at chapter 9 when relationship is too low", () => {
    const chapter = CHAPTER_BY_ID.get(9)!;
    const state = createFreshState();
    state.relationships.Meera = 2;
    const visible = chapter.choices.filter((c) => meetsRequirements(c.requires, state));
    expect(visible.find((c) => c.id === "let-meera-decide")).toBeUndefined();
    // 3 always-available + 1 resource-gated (reinforce-double, ignored on listener path)
    expect(visible.length).toBe(4);
  });

  it("reveals the Meera-locked choice at chapter 9 when relationship >= 5", () => {
    const chapter = CHAPTER_BY_ID.get(9)!;
    const state = createFreshState();
    state.relationships.Meera = 5;
    const visible = chapter.choices.filter((c) => meetsRequirements(c.requires, state));
    expect(visible.find((c) => c.id === "let-meera-decide")).toBeDefined();
    // 3 always-available + 1 Meera-gated + 1 resource-gated (ignored on listener path)
    expect(visible.length).toBe(5);
  });

  it("appends conditional body paragraphs only when conditions are met", () => {
    const chapter = CHAPTER_BY_ID.get(9)!;
    expect(chapter.conditionalBody).toBeDefined();
    expect(chapter.conditionalBody!.length).toBeGreaterThan(0);

    // Low prosperity: desperation paragraph appears, confidence does not.
    const lowState = createFreshState();
    lowState.villageProgress = 10;
    const lowParagraphs = chapter.conditionalBody!.filter((p) => p.condition(lowState)).map((p) => p.text);
    expect(lowParagraphs.some((t) => t.includes("desperation"))).toBe(true);
    expect(lowParagraphs.some((t) => t.includes("Confidence"))).toBe(false);

    // High prosperity: confidence paragraph appears, desperation does not.
    const highState = createFreshState();
    highState.villageProgress = 55;
    const highParagraphs = chapter.conditionalBody!.filter((p) => p.condition(highState)).map((p) => p.text);
    expect(highParagraphs.some((t) => t.includes("Confidence"))).toBe(true);
    expect(highParagraphs.some((t) => t.includes("desperation"))).toBe(false);
  });

  it("resolves state-reactive variants based on the highest stat at chapter 24", () => {
    const chapter = CHAPTER_BY_ID.get(24)!;
    expect(chapter.reactiveBody).toBeDefined();
    const statVariant = chapter.reactiveBody!.find((v) => v.base.includes("shrine held its breath"));
    expect(statVariant).toBeDefined();

    const empathyState = createFreshState();
    empathyState.stats = { Empathy: 8, Wisdom: 2, Practicality: 2 };
    const empathyText = statVariant!.variants.find((v) => v.condition(empathyState))?.text;
    expect(empathyText).toBeDefined();
    expect(empathyText!).toContain("empathy");

    const wisdomState = createFreshState();
    wisdomState.stats = { Empathy: 2, Wisdom: 8, Practicality: 2 };
    const wisdomText = statVariant!.variants.find((v) => v.condition(wisdomState))?.text;
    expect(wisdomText).toBeDefined();
    expect(wisdomText!).toContain("wisdom");

    const practicalityState = createFreshState();
    practicalityState.stats = { Empathy: 2, Wisdom: 2, Practicality: 8 };
    const practicalityText = statVariant!.variants.find((v) => v.condition(practicalityState))?.text;
    expect(practicalityText).toBeDefined();
    expect(practicalityText!).toContain("practicality");
  });

  it("rejects a gated choice the player does not qualify for", () => {
    const chapter = CHAPTER_BY_ID.get(3)!;
    const state = createFreshState();
    // Empathy is 1, below the gate of 3.
    const gatedChoice = chapter.choices.find((c) => c.id === "ask-fear")!;
    expect(gatedChoice.requires).toBeDefined();
    const next = applyChoice(state, chapter, gatedChoice);
    // State is returned unchanged: the choice was rejected.
    expect(next).toBe(state);
    expect(next.currentChapterId).toBe(state.currentChapterId);
    expect(next.history).toBe(state.history);
  });

  it("accepts a gated choice the player qualifies for", () => {
    const chapter = CHAPTER_BY_ID.get(3)!;
    const state = createFreshState();
    state.stats.Empathy = 3;
    const gatedChoice = chapter.choices.find((c) => c.id === "ask-fear")!;
    const next = applyChoice(state, chapter, gatedChoice);
    expect(next).not.toBe(state);
    expect(next.history).toHaveLength(1);
    expect(next.stats.Empathy).toBe(4);
  });

  it("renders companion epilogue paragraphs at chapter 25 based on relationship levels", () => {
    const chapter = CHAPTER_BY_ID.get(25)!;
    expect(chapter.conditionalBody).toBeDefined();
    const meeraParagraph = chapter.conditionalBody!.find((p) => p.text.includes("Meera found Neel"));
    expect(meeraParagraph).toBeDefined();

    const lowState = createFreshState();
    lowState.relationships.Meera = 2;
    expect(meeraParagraph!.condition(lowState)).toBe(false);

    const highState = createFreshState();
    highState.relationships.Meera = 5;
    expect(meeraParagraph!.condition(highState)).toBe(true);
  });

  it("appends chapter 2 conditional body for high Empathy after choosing the empathy path", () => {
    const chapter = CHAPTER_BY_ID.get(2)!;
    expect(chapter.conditionalBody).toBeDefined();
    const empathyParagraph = chapter.conditionalBody!.find((p) => p.text.includes("chord"));
    expect(empathyParagraph).toBeDefined();

    // Empathy 1 (fresh state) does not trigger the deeper perception.
    const lowState = createFreshState();
    expect(empathyParagraph!.condition(lowState)).toBe(false);

    // Empathy 2 (after choosing empathy at chapter 1) triggers it.
    const highState = createFreshState();
    highState.stats.Empathy = 2;
    expect(empathyParagraph!.condition(highState)).toBe(true);
  });

  it("appends chapter 5 conditional body for Wisdom >= 3 recognizing the archive system", () => {
    const chapter = CHAPTER_BY_ID.get(5)!;
    expect(chapter.conditionalBody).toBeDefined();
    const wisdomParagraph = chapter.conditionalBody!.find((p) => p.text.includes("organized by water season"));
    expect(wisdomParagraph).toBeDefined();

    const lowState = createFreshState();
    expect(wisdomParagraph!.condition(lowState)).toBe(false);

    const highState = createFreshState();
    highState.stats.Wisdom = 3;
    expect(wisdomParagraph!.condition(highState)).toBe(true);
  });

  it("resolves chapter 10 reactiveBody variants based on villageProgress", () => {
    const chapter = CHAPTER_BY_ID.get(10)!;
    expect(chapter.reactiveBody).toBeDefined();
    const moodVariant = chapter.reactiveBody!.find((v) => v.base.includes("waited to learn whether"));
    expect(moodVariant).toBeDefined();

    // Low prosperity: desperation mood.
    const lowState = createFreshState();
    lowState.villageProgress = 15;
    const lowText = resolveVariant(moodVariant!, lowState);
    expect(lowText).toContain("barely held");

    // Mid prosperity: quiet confidence.
    const midState = createFreshState();
    midState.villageProgress = 35;
    const midText = resolveVariant(moodVariant!, midState);
    expect(midText).toContain("promise kept");

    // High prosperity: full confidence.
    const highState = createFreshState();
    highState.villageProgress = 55;
    const highText = resolveVariant(moodVariant!, highState);
    expect(highText).toContain("did not flinch");
  });

  it("appends chapter 15 conditional body for high companion relationships at the arc transition", () => {
    const chapter = CHAPTER_BY_ID.get(15)!;
    expect(chapter.conditionalBody).toBeDefined();

    const meeraParagraph = chapter.conditionalBody!.find((p) => p.text.includes("Meera stood at the edge"));
    expect(meeraParagraph).toBeDefined();

    const kabirParagraph = chapter.conditionalBody!.find((p) => p.text.includes("Kabir hung the training code"));
    expect(kabirParagraph).toBeDefined();

    // Low relationships: neither paragraph appears.
    const lowState = createFreshState();
    expect(meeraParagraph!.condition(lowState)).toBe(false);
    expect(kabirParagraph!.condition(lowState)).toBe(false);

    // High Meera but low Kabir: only Meera's paragraph appears.
    const meeraState = createFreshState();
    meeraState.relationships.Meera = 5;
    expect(meeraParagraph!.condition(meeraState)).toBe(true);
    expect(kabirParagraph!.condition(meeraState)).toBe(false);

    // High Kabir: Kabir's paragraph appears.
    const kabirState = createFreshState();
    kabirState.relationships.Kabir = 5;
    expect(kabirParagraph!.condition(kabirState)).toBe(true);
  });

  it("appends chapter 23 conditional body when the Echo slime is unlocked", () => {
    const chapter = CHAPTER_BY_ID.get(23)!;
    expect(chapter.conditionalBody).toBeDefined();
    const echoParagraph = chapter.conditionalBody!.find((p) => p.text.includes("Echo slime pressed against Neel's ankle"));
    expect(echoParagraph).toBeDefined();

    // Without Echo slime: paragraph does not appear.
    const noEchoState = createFreshState();
    expect(echoParagraph!.condition(noEchoState)).toBe(false);

    // With Echo slime unlocked: paragraph appears.
    const echoState = createFreshState();
    echoState.unlockedSlimes = ["Dew", "Clay", "Echo"];
    expect(echoParagraph!.condition(echoState)).toBe(true);
  });

  it("reveals the Meera-locked choice at chapter 23 when relationship >= 5", () => {
    const chapter = CHAPTER_BY_ID.get(23)!;
    const lowState = createFreshState();
    lowState.relationships.Meera = 3;
    const lowVisible = chapter.choices.filter((c) => meetsRequirements(c.requires, lowState));
    expect(lowVisible.find((c) => c.id === "shape-the-arch")).toBeUndefined();
    expect(lowVisible.length).toBe(3);

    const highState = createFreshState();
    highState.relationships.Meera = 5;
    const highVisible = chapter.choices.filter((c) => meetsRequirements(c.requires, highState));
    const gated = highVisible.find((c) => c.id === "shape-the-arch");
    expect(gated).toBeDefined();
    expect(highVisible.length).toBe(4);
  });

  it("resolves chapter 1 companion dialogue for Meera based on relationship level", () => {
    const chapter = CHAPTER_BY_ID.get(1)!;
    expect(chapter.companionDialogue).toBeDefined();
    const meeraDialogue = chapter.companionDialogue!.find((d) => d.companion === "Meera");
    expect(meeraDialogue).toBeDefined();

    // Low relationship: base line about measuring him like timber.
    const lowState = createFreshState();
    const lowLine = resolveDialogue(meeraDialogue!, lowState);
    expect(lowLine).toContain("measured him");

    // High relationship: warmer variant.
    const highState = createFreshState();
    highState.relationships.Meera = 3;
    const highLine = resolveDialogue(meeraDialogue!, highState);
    expect(highLine).toContain("almost smiled");
  });

  it("resolves chapter 35 ending reactiveBody based on the player's highest stat", () => {
    const chapter = CHAPTER_BY_ID.get(35)!;
    expect(chapter.reactiveBody).toBeDefined();
    const statVariant = chapter.reactiveBody!.find((v) => v.base.includes("larger than any single skill"));
    expect(statVariant).toBeDefined();

    const empathyState = createFreshState();
    empathyState.stats = { Empathy: 8, Wisdom: 2, Practicality: 2 };
    const empathyText = statVariant!.variants.find((v) => v.condition(empathyState))?.text;
    expect(empathyText).toBeDefined();
    expect(empathyText!).toContain("empathy");

    const wisdomState = createFreshState();
    wisdomState.stats = { Empathy: 2, Wisdom: 8, Practicality: 2 };
    const wisdomText = statVariant!.variants.find((v) => v.condition(wisdomState))?.text;
    expect(wisdomText).toBeDefined();
    expect(wisdomText!).toContain("wisdom");

    const practicalityState = createFreshState();
    practicalityState.stats = { Empathy: 2, Wisdom: 2, Practicality: 8 };
    const practicalityText = statVariant!.variants.find((v) => v.condition(practicalityState))?.text;
    expect(practicalityText).toBeDefined();
    expect(practicalityText!).toContain("practicality");
  });

  it("resolves chapter 36 ending reactiveBody based on the player's highest stat", () => {
    const chapter = CHAPTER_BY_ID.get(36)!;
    expect(chapter.reactiveBody).toBeDefined();
    const statVariant = chapter.reactiveBody!.find((v) => v.base.includes("different for everyone"));
    expect(statVariant).toBeDefined();

    const empathyState = createFreshState();
    empathyState.stats = { Empathy: 8, Wisdom: 2, Practicality: 2 };
    const empathyText = statVariant!.variants.find((v) => v.condition(empathyState))?.text;
    expect(empathyText).toBeDefined();
    expect(empathyText!).toContain("empathy");

    const wisdomState = createFreshState();
    wisdomState.stats = { Empathy: 2, Wisdom: 8, Practicality: 2 };
    const wisdomText = statVariant!.variants.find((v) => v.condition(wisdomState))?.text;
    expect(wisdomText).toBeDefined();
    expect(wisdomText!).toContain("wisdom");

    const practicalityState = createFreshState();
    practicalityState.stats = { Empathy: 2, Wisdom: 2, Practicality: 8 };
    const practicalityText = statVariant!.variants.find((v) => v.condition(practicalityState))?.text;
    expect(practicalityText).toBeDefined();
    expect(practicalityText!).toContain("practicality");
  });
});

/**
 * Helper: build a minimal in-memory chapter so resource effects can be tested
 * without depending on authored chapter content (which lives in chapters.ts
 * and must not be modified here).
 */
function makeChapter(id: number): Chapter {
  return {
    id,
    arc: "Test",
    title: `Test Chapter ${id}`,
    chapterNumber: `${id}`,
    location: "Test",
    weather: "clear",
    opening: "",
    body: [],
    choices: [],
  };
}

function makeChoice(effect: Partial<NarrativeChoice["effect"]> & { consequence: string }): NarrativeChoice {
  return {
    id: "test-choice",
    label: "Test choice",
    tone: "empathy",
    effect: { consequence: effect.consequence, ...effect },
  };
}

describe("Dual-path system", () => {
  it("beginJourney with keeper path sets resources", () => {
    const state = beginJourney(createFreshState(), "keeper");
    expect(state.path).toBe("keeper");
    expect(state.started).toBe(true);
    expect(state.resources).toEqual(createKeeperResources());
    expect(state.failed).toBe(false);
    expect(state.failureReason).toBeNull();
  });

  it("beginJourney with listener path leaves resources null", () => {
    const state = beginJourney(createFreshState(), "listener");
    expect(state.path).toBe("listener");
    expect(state.resources).toBeNull();
    expect(state.failed).toBe(false);
    expect(state.failureReason).toBeNull();
  });

  it("beginJourney defaults to listener path when no path is given", () => {
    const state = beginJourney(createFreshState());
    expect(state.path).toBe("listener");
    expect(state.resources).toBeNull();
  });

  it("applyChoice on Keeper's Path applies resource costs", () => {
    const state = beginJourney(createFreshState(), "keeper");
    const chapter = makeChapter(1);
    const choice = makeChoice({
      consequence: "Spent timber and grain.",
      resourceCost: { timber: 3, grain: 2 },
    });
    const next = applyChoice(state, chapter, choice);
    expect(next.resources).not.toBeNull();
    expect(next.resources!.timber).toBe(8 - 3);
    expect(next.resources!.grain).toBe(12 - 2);
    expect(next.resources!.clay).toBe(6);
    expect(next.failed).toBe(false);
  });

  it("applyChoice on Keeper's Path applies resource gains", () => {
    const state = beginJourney(createFreshState(), "keeper");
    const chapter = makeChapter(1);
    const choice = makeChoice({
      consequence: "Gathered herbs.",
      resourceGain: { herbs: 3 },
    });
    const next = applyChoice(state, chapter, choice);
    expect(next.resources!.herbs).toBe(4 + 3);
  });

  it("applyChoice on Keeper's Path applies dayCost", () => {
    const state = beginJourney(createFreshState(), "keeper");
    const chapter = makeChapter(1);
    const choice = makeChoice({
      consequence: "A day passes.",
      dayCost: 5,
    });
    const next = applyChoice(state, chapter, choice);
    expect(next.resources!.days).toBe(30 - 5);
  });

  it("applyChoice on Keeper's Path rejects choices the player can't afford", () => {
    const state = beginJourney(createFreshState(), "keeper");
    const chapter = makeChapter(1);
    // Fresh keeper resources have timber 8; demand 20.
    const choice = makeChoice({
      consequence: "Should be rejected.",
      resourceCost: { timber: 20 },
    });
    const next = applyChoice(state, chapter, choice);
    // State returned unchanged.
    expect(next).toBe(state);
    expect(next.resources!.timber).toBe(8);
    expect(next.history).toHaveLength(0);
  });

  it("applyChoice on Keeper's Path triggers failure when days run out", () => {
    const state = beginJourney(createFreshState(), "keeper");
    // Burn the remaining days in one choice.
    const chapter = makeChapter(1);
    const choice = makeChoice({
      consequence: "The monsoon comes.",
      dayCost: 30,
    });
    const next = applyChoice(state, chapter, choice);
    expect(next.resources!.days).toBe(0);
    expect(next.failed).toBe(true);
    expect(next.failureReason).toContain("monsoon");
  });

  it("applyChoice on Keeper's Path triggers failure when grain runs out", () => {
    const state = beginJourney(createFreshState(), "keeper");
    const chapter = makeChapter(1);
    const choice = makeChoice({
      consequence: "The granary is empty.",
      resourceCost: { grain: 12 },
    });
    const next = applyChoice(state, chapter, choice);
    expect(next.resources!.grain).toBe(0);
    expect(next.failed).toBe(true);
    expect(next.failureReason).toContain("food");
  });

  it("applyChoice on Keeper's Path triggers failure when timber and clay are both exhausted", () => {
    const state = beginJourney(createFreshState(), "keeper");
    // First drain timber.
    const chapter = makeChapter(1);
    const drainTimber = makeChoice({
      consequence: "Last timber used.",
      resourceCost: { timber: 8 },
    });
    let next = applyChoice(state, chapter, drainTimber);
    expect(next.failed).toBe(false);
    // Then drain clay.
    const drainClay = makeChoice({
      consequence: "Last clay used.",
      resourceCost: { clay: 6 },
    });
    next = applyChoice(next, chapter, drainClay);
    expect(next.resources!.timber).toBe(0);
    expect(next.resources!.clay).toBe(0);
    expect(next.failed).toBe(true);
    expect(next.failureReason).toContain("materials");
  });

  it("applyChoice on Keeper's Path does not fail when only timber OR clay is exhausted", () => {
    const state = beginJourney(createFreshState(), "keeper");
    const chapter = makeChapter(1);
    const drainTimber = makeChoice({
      consequence: "Last timber used.",
      resourceCost: { timber: 8 },
    });
    const next = applyChoice(state, chapter, drainTimber);
    expect(next.resources!.timber).toBe(0);
    expect(next.resources!.clay).toBe(6);
    expect(next.failed).toBe(false);
  });

  it("applyChoice on Listener's Path ignores resource effects", () => {
    const state = beginJourney(createFreshState(), "listener");
    const chapter = makeChapter(1);
    // Even if a choice carries resource fields, they are ignored on listener.
    const choice = makeChoice({
      consequence: "A contemplative moment.",
      resourceCost: { timber: 100 },
      resourceGain: { grain: 50 },
      dayCost: 99,
    });
    const next = applyChoice(state, chapter, choice);
    expect(next.resources).toBeNull();
    expect(next.failed).toBe(false);
    expect(next.failureReason).toBeNull();
    // The choice still applies (narrative effects proceed).
    expect(next.history).toHaveLength(1);
  });

  it("applyChoice still works for existing choices without resource fields on Keeper's Path", () => {
    const state = beginJourney(createFreshState(), "keeper");
    const chapter = makeChapter(1);
    const choice = makeChoice({
      consequence: "A normal narrative choice.",
      stats: { Empathy: 1 },
    });
    const next = applyChoice(state, chapter, choice);
    expect(next.stats.Empathy).toBe(2);
    expect(next.resources).toEqual(createKeeperResources());
    expect(next.failed).toBe(false);
  });

  it("meetsRequirements checks resourceMinimum on Keeper's Path", () => {
    const state = beginJourney(createFreshState(), "keeper");
    // Fresh keeper resources: timber 8. Require timber >= 10 -> fails.
    const requires = { resourceMinimum: { timber: 10 } };
    expect(meetsRequirements(requires, state)).toBe(false);
    // Require timber >= 5 -> passes.
    const requiresOk = { resourceMinimum: { timber: 5 } };
    expect(meetsRequirements(requiresOk, state)).toBe(true);
  });

  it("meetsRequirements ignores resourceMinimum on Listener's Path", () => {
    const state = beginJourney(createFreshState(), "listener");
    // Even an impossible resource minimum is ignored on listener path.
    const requires = { resourceMinimum: { timber: 9999 } };
    expect(meetsRequirements(requires, state)).toBe(true);
  });

  it("meetsRequirements ignores resourceMinimum on keeper path when resources is null", () => {
    // Defensive: a keeper-path state with null resources (shouldn't normally
    // happen, but backward-compatible saves could produce it) ignores the gate.
    const state = beginJourney(createFreshState(), "keeper");
    state.resources = null;
    const requires = { resourceMinimum: { timber: 9999 } };
    expect(meetsRequirements(requires, state)).toBe(true);
  });

  it("createFreshState defaults to listener path with null resources", () => {
    const state = createFreshState();
    expect(state.path).toBe("listener");
    expect(state.resources).toBeNull();
    expect(state.failed).toBe(false);
    expect(state.failureReason).toBeNull();
  });
});

describe("Keeper's Path resource economy (authored chapters)", () => {
  it("deducts resourceCost from a Keeper's Path choice in authored chapters", () => {
    const state = beginJourney(createFreshState(), "keeper");
    const chapter = CHAPTER_BY_ID.get(3)!;
    const choice = chapter.choices.find((c) => c.id === "build-trough")!;
    expect(choice.effect.resourceCost).toBeDefined();
    const next = applyChoice(state, chapter, choice);
    // build-trough costs 1 timber and 1 day
    expect(next.resources!.timber).toBe(8 - 1);
    expect(next.resources!.days).toBe(30 - 1);
  });

  it("adds resourceGain from a Keeper's Path choice in authored chapters", () => {
    const state = beginJourney(createFreshState(), "keeper");
    const chapter = CHAPTER_BY_ID.get(9)!;
    const choice = chapter.choices.find((c) => c.id === "paid-priority")!;
    expect(choice.effect.resourceGain).toBeDefined();
    const next = applyChoice(state, chapter, choice);
    // paid-priority gains 2 grain
    expect(next.resources!.grain).toBe(12 + 2);
  });

  it("deducts dayCost from a Keeper's Path choice in authored chapters", () => {
    const state = beginJourney(createFreshState(), "keeper");
    const chapter = CHAPTER_BY_ID.get(1)!;
    const choice = chapter.choices[0]!;
    expect(choice.effect.dayCost).toBe(1);
    const next = applyChoice(state, chapter, choice);
    expect(next.resources!.days).toBe(30 - 1);
  });

  it("hides a resource-gated choice when resources are insufficient", () => {
    const chapter = CHAPTER_BY_ID.get(9)!;
    const state = beginJourney(createFreshState(), "keeper");
    // Fresh keeper resources: timber 8. The reinforce-double choice requires timber >= 5.
    // Drain timber to 3 so the gate fails.
    state.resources!.timber = 3;
    const visible = chapter.choices.filter((c) => meetsRequirements(c.requires, state));
    expect(visible.find((c) => c.id === "reinforce-double")).toBeUndefined();
  });

  it("reveals a resource-gated choice when resources are sufficient", () => {
    const chapter = CHAPTER_BY_ID.get(9)!;
    const state = beginJourney(createFreshState(), "keeper");
    // Fresh keeper resources: timber 8 >= 5, so the gate passes.
    const visible = chapter.choices.filter((c) => meetsRequirements(c.requires, state));
    const gated = visible.find((c) => c.id === "reinforce-double");
    expect(gated).toBeDefined();
  });

  it("shows a resource-scarcity conditional paragraph when timber < 4 on Keeper's Path", () => {
    const chapter = CHAPTER_BY_ID.get(6)!;
    expect(chapter.conditionalBody).toBeDefined();
    const scarcityParagraph = chapter.conditionalBody!.find((p) => p.text.includes("timber pile had shrunk"));
    expect(scarcityParagraph).toBeDefined();

    const keeperState = beginJourney(createFreshState(), "keeper");
    keeperState.resources!.timber = 3;
    expect(scarcityParagraph!.condition(keeperState)).toBe(true);

    // When timber is sufficient, the paragraph does not appear.
    const okState = beginJourney(createFreshState(), "keeper");
    okState.resources!.timber = 6;
    expect(scarcityParagraph!.condition(okState)).toBe(false);
  });

  it("does NOT show a resource-scarcity conditional paragraph on Listener's Path (resources is null)", () => {
    const chapter = CHAPTER_BY_ID.get(6)!;
    const scarcityParagraph = chapter.conditionalBody!.find((p) => p.text.includes("timber pile had shrunk"));
    expect(scarcityParagraph).toBeDefined();

    const listenerState = beginJourney(createFreshState(), "listener");
    expect(listenerState.resources).toBeNull();
    expect(scarcityParagraph!.condition(listenerState)).toBe(false);
  });

  it("failure chapters 37 and 38 exist in CHAPTER_BY_ID and have isEnding true", () => {
    const ch37 = CHAPTER_BY_ID.get(37);
    const ch38 = CHAPTER_BY_ID.get(38);
    expect(ch37).toBeDefined();
    expect(ch38).toBeDefined();
    expect(ch37!.isEnding).toBe(true);
    expect(ch38!.isEnding).toBe(true);
    expect(ch37!.choices).toHaveLength(0);
    expect(ch38!.choices).toHaveLength(0);
  });
});
