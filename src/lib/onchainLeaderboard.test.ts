import { describe, expect, it } from "vitest";
import {
  chunkBlockRange,
  rankOnchainScores,
} from "@/lib/onchainLeaderboard";

describe("onchain leaderboard", () => {
  it("chunks Ritual log reads below the RPC block-range limit", () => {
    expect(chunkBlockRange(100n, 100n + 180_000n)).toEqual([
      { fromBlock: 100n, toBlock: 90_099n },
      { fromBlock: 90_100n, toBlock: 180_099n },
      { fromBlock: 180_100n, toBlock: 180_100n },
    ]);
    expect(chunkBlockRange(10n, 9n)).toEqual([]);
  });

  it("ranks live records by score, then newest timestamp", () => {
    const ranked = rankOnchainScores([
      { player: "0xbbb", nickname: "B", runId: "0x02", score: 500n, speedLevel: 2, runDuration: 8, timestamp: 20n },
      { player: "0xaaa", nickname: "A", runId: "0x01", score: 800n, speedLevel: 3, runDuration: 9, timestamp: 10n },
      { player: "0xccc", nickname: "C", runId: "0x03", score: 500n, speedLevel: 2, runDuration: 7, timestamp: 30n },
    ]);
    expect(ranked.map((entry) => entry.player)).toEqual(["0xaaa", "0xccc", "0xbbb"]);
  });

  it("limits the public board without mutating the source", () => {
    const source = [
      { player: "0xaaa", nickname: "A", runId: "0x01", score: 1n, speedLevel: 1, runDuration: 1, timestamp: 1n },
      { player: "0xbbb", nickname: "B", runId: "0x02", score: 2n, speedLevel: 1, runDuration: 1, timestamp: 2n },
    ];
    expect(rankOnchainScores(source, 1)).toHaveLength(1);
    expect(source[0]?.player).toBe("0xaaa");
  });

  it("keeps only the highest confirmed record for each wallet", () => {
    const ranked = rankOnchainScores([
      { player: "0xAAA", nickname: "Old", runId: "0x01", score: 400n, speedLevel: 2, runDuration: 8, timestamp: 10n },
      { player: "0xaaa", nickname: "New", runId: "0x02", score: 900n, speedLevel: 4, runDuration: 12, timestamp: 20n },
      { player: "0xbbb", nickname: "B", runId: "0x03", score: 800n, speedLevel: 3, runDuration: 9, timestamp: 30n },
    ]);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]).toMatchObject({ player: "0xaaa", nickname: "New", score: 900n });
  });
});
