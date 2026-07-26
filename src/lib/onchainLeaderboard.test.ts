import { describe, expect, it } from "vitest";
import { rankOnchainScores } from "@/lib/onchainLeaderboard";

describe("onchain leaderboard", () => {
  it("ranks live records by score, then newest timestamp", () => {
    const ranked = rankOnchainScores([
      { player: "0xbbb", runId: "0x02", score: 500n, speedLevel: 2, runDuration: 8, timestamp: 20n },
      { player: "0xaaa", runId: "0x01", score: 800n, speedLevel: 3, runDuration: 9, timestamp: 10n },
      { player: "0xccc", runId: "0x03", score: 500n, speedLevel: 2, runDuration: 7, timestamp: 30n },
    ]);
    expect(ranked.map((entry) => entry.player)).toEqual(["0xaaa", "0xccc", "0xbbb"]);
  });

  it("limits the public board without mutating the source", () => {
    const source = [
      { player: "0xaaa", runId: "0x01", score: 1n, speedLevel: 1, runDuration: 1, timestamp: 1n },
      { player: "0xbbb", runId: "0x02", score: 2n, speedLevel: 1, runDuration: 1, timestamp: 2n },
    ];
    expect(rankOnchainScores(source, 1)).toHaveLength(1);
    expect(source[0]?.player).toBe("0xaaa");
  });
});
