import { beforeEach, describe, expect, it } from "vitest";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  emptyAchievementStore,
  evaluateRunAchievements,
  type RunAchievementInput,
} from "@/features/achievements/achievements";
import {
  emptyLifetimeStats,
  type LifetimeStats,
} from "@/features/stats/stats";

const baseRun: RunAchievementInput = {
  score: 0,
  shieldsCollected: 0,
  shieldUsed: false,
  closeCall: false,
  dailyRank: null,
  elapsedSeconds: 10,
  speedLevel: 1,
  laneMoves: 1,
  nearMisses: 0,
  stationaryPasses: 0,
  date: new Date("2026-07-24T12:00:00Z"),
};

function stats(overrides: Partial<LifetimeStats> = {}): LifetimeStats {
  return {
    ...emptyLifetimeStats(),
    totalGames: 1,
    firstPlayedDay: "2026-07-24",
    lastPlayedDay: "2026-07-24",
    ...overrides,
  };
}

describe("achievement engine", () => {
  beforeEach(() => localStorage.clear());

  it("defines 35 achievements across eight categories", () => {
    expect(ACHIEVEMENTS).toHaveLength(35);
    expect(ACHIEVEMENT_CATEGORIES).toHaveLength(8);
    expect(
      ACHIEVEMENTS.filter((item) => "hidden" in item && item.hidden),
    ).toHaveLength(5);
  });

  it("unlocks score thresholds independently of React", () => {
    const result = evaluateRunAchievements(
      emptyAchievementStore(),
      { ...baseRun, score: 5200 },
      stats({ highestScore: 5200 }),
    );
    expect(result.store.progress["first-steps"].unlockedAt).toBeTruthy();
    expect(result.store.progress["network-survivor"].unlockedAt).toBeTruthy();
    expect(result.store.progress["inference-runner"].unlockedAt).toBeTruthy();
    expect(result.store.progress["unstoppable-agent"].unlockedAt).toBeUndefined();
  });

  it("requires 5,000 without collecting a shield for Perfectionist", () => {
    const protectedRun = evaluateRunAchievements(
      emptyAchievementStore(),
      { ...baseRun, score: 6000, shieldsCollected: 1 },
      stats({ highestScore: 6000, totalShieldsCollected: 1 }),
    );
    expect(protectedRun.store.progress.perfectionist.unlockedAt).toBeUndefined();

    const cleanRun = evaluateRunAchievements(
      emptyAchievementStore(),
      { ...baseRun, score: 5000 },
      stats({ highestScore: 5000 }),
    );
    expect(cleanRun.store.progress.perfectionist.unlockedAt).toBeTruthy();
  });

  it("tracks three distinct UTC days", () => {
    let store = emptyAchievementStore();
    for (const day of [1, 2, 3]) {
      store = evaluateRunAchievements(
        store,
        {
          ...baseRun,
          score: 10,
          date: new Date(`2026-07-0${day}T10:00:00Z`),
        },
        stats({
          totalGames: day,
          firstPlayedDay: "2026-07-01",
          lastPlayedDay: `2026-07-0${day}`,
        }),
      ).store;
    }
    expect(store.progress["daily-challenger"].unlockedAt).toBeTruthy();
    expect(store.progress.persistent.unlockedAt).toBeTruthy();
  });
});
