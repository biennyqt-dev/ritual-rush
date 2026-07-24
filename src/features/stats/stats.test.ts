import { beforeEach, describe, expect, it } from "vitest";
import {
  emptyLifetimeStats,
  readLifetimeStats,
  recordCompletedRun,
} from "@/features/stats/stats";

describe("lifetime stats", () => {
  beforeEach(() => localStorage.clear());

  it("accumulates run totals and preserves personal records", () => {
    const first = recordCompletedRun(
      emptyLifetimeStats(),
      {
        score: 1200,
        distance: 340,
        bestScore: 1200,
        isNewBest: true,
        shieldsCollected: 2,
        shieldUsed: true,
        closeCall: true,
        elapsedSeconds: 45,
        speedLevel: 4,
        laneMoves: 8,
        nearMisses: 2,
        stationaryPasses: 3,
      },
      new Date("2026-07-23T12:00:00Z"),
    );
    const second = recordCompletedRun(
      first,
      {
        score: 800,
        distance: 200,
        bestScore: 1200,
        isNewBest: false,
        shieldsCollected: 1,
        shieldUsed: false,
        closeCall: false,
        elapsedSeconds: 30,
        speedLevel: 3,
        laneMoves: 4,
        nearMisses: 0,
        stationaryPasses: 1,
      },
      new Date("2026-07-24T12:00:00Z"),
    );

    expect(second.totalGames).toBe(2);
    expect(second.highestScore).toBe(1200);
    expect(second.totalShieldsCollected).toBe(3);
    expect(second.totalDistance).toBe(540);
    expect(second.bestSpeedLevel).toBe(4);
    expect(second.firstPlayedDay).toBe("2026-07-23");
    expect(second.lastPlayedDay).toBe("2026-07-24");
    expect(readLifetimeStats()).toEqual(second);
  });
});
