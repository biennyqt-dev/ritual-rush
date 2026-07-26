import { describe, expect, it } from "vitest";
import {
  buildScoreMetadata,
  canSubmitRun,
  formatRunDuration,
  freezeRunResult,
  scoreMetadataReference,
} from "@/lib/scoreRecord";
import type { RunResult } from "@/game/engine/types";

const result: RunResult = {
  runId: `0x${"ab".repeat(32)}`,
  completedAt: "2026-07-26T00:00:00.000Z",
  score: 420,
  distance: 800,
  bestScore: 500,
  isNewBest: false,
  shieldsCollected: 2,
  shieldUsed: true,
  closeCall: true,
  elapsedSeconds: 73.4,
  speedLevel: 5,
  laneMoves: 4,
  nearMisses: 2,
  stationaryPasses: 12,
};

describe("score record helpers", () => {
  it("formats run duration for the score card", () => {
    expect(formatRunDuration(73.4)).toBe("1:13");
    expect(formatRunDuration(-2)).toBe("0:00");
  });

  it("builds a compact public metadata reference", () => {
    expect(scoreMetadataReference(result.runId)).toContain(result.runId);
    const metadata = buildScoreMetadata(
      result,
      "Runner",
      "0x1234…abcd",
      500,
      3,
      new Date("2026-07-26T00:00:00.000Z"),
    );
    expect(metadata.network).toBe("Ritual Testnet");
    expect(metadata.runDuration).toBe(73);
    expect(metadata.achievementsUnlocked).toBe(3);
  });

  it("freezes a completed run payload", () => {
    const frozen = freezeRunResult(result);
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(frozen.runId).toBe(result.runId);
  });

  it("blocks duplicate or in-flight score submissions", () => {
    expect(canSubmitRun({ recorded: false, pending: false })).toBe(true);
    expect(canSubmitRun({ recorded: true, pending: false })).toBe(false);
    expect(canSubmitRun({ recorded: false, pending: true })).toBe(false);
  });
});
