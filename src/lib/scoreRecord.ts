import type { RunResult } from "@/game/engine/types";

export interface ScoreRecordMetadata {
  game: "Ritual Dash";
  player: string;
  wallet: string;
  score: number;
  personalBest: number;
  speedLevel: number;
  runDuration: number;
  shieldsCollected: number;
  achievementsUnlocked: number;
  recordedAt: string;
  runId: string;
  network: "Ritual Testnet";
}

export interface ScoreSubmissionState {
  recorded: boolean;
  pending: boolean;
}

export function canSubmitRun(state: ScoreSubmissionState): boolean {
  return !state.recorded && !state.pending;
}

export function formatRunDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function scoreMetadataReference(runId: string): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://ritual-rush-eight.vercel.app";
  return `${origin}/?score=${encodeURIComponent(runId)}`;
}

export function buildScoreMetadata(
  result: RunResult,
  nickname: string,
  wallet: string,
  personalBest: number,
  achievementsUnlocked: number,
  recordedAt = new Date(result.completedAt),
): ScoreRecordMetadata {
  return {
    game: "Ritual Dash",
    player: nickname,
    wallet,
    score: result.score,
    personalBest,
    speedLevel: result.speedLevel,
    runDuration: Math.floor(result.elapsedSeconds),
    shieldsCollected: result.shieldsCollected,
    achievementsUnlocked,
    recordedAt: recordedAt.toISOString(),
    runId: result.runId,
    network: "Ritual Testnet",
  };
}

export function freezeRunResult(result: RunResult): RunResult {
  return Object.freeze({ ...result });
}
