import { beforeEach, describe, expect, it } from "vitest";
import {
  LocalLeaderboardService,
} from "@/features/leaderboard/leaderboard";

describe("local daily leaderboard", () => {
  beforeEach(() => localStorage.clear());

  it("keeps only the highest score for an identity", async () => {
    const service = new LocalLeaderboardService();
    await service.submitScore({
      id: "guest:one",
      nickname: "Runner",
      score: 1200,
      kind: "guest",
    });
    await service.submitScore({
      id: "guest:one",
      nickname: "Runner",
      score: 900,
      kind: "guest",
    });
    expect(await service.getPlayerDailyBest("guest:one")).toBe(1200);
  });

  it("discards entries from a previous UTC day", async () => {
    localStorage.setItem(
      "ritual-rush:leaderboard:v1",
      JSON.stringify({
        dateKey: "1999-01-01",
        entries: [
          {
            id: "old",
            nickname: "Old score",
            score: 999999,
            kind: "guest",
            dateKey: "1999-01-01",
          },
        ],
      }),
    );
    const service = new LocalLeaderboardService();
    expect(await service.getPlayerDailyBest("old")).toBe(0);
  });
});
