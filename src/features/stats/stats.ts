import type { RunResult } from "@/game/engine/types";
import { readJson, utcDateKey, writeJson } from "@/lib/storage";

export interface LifetimeStats {
  totalGames: number;
  highestScore: number;
  totalShieldsCollected: number;
  totalDistance: number;
  bestSpeedLevel: number;
  totalNearMisses: number;
  firstPlayedDay?: string;
  lastPlayedDay?: string;
}

const STORAGE_KEY = "ritual-rush:stats:v1";

export function emptyLifetimeStats(): LifetimeStats {
  return {
    totalGames: 0,
    highestScore: 0,
    totalShieldsCollected: 0,
    totalDistance: 0,
    bestSpeedLevel: 1,
    totalNearMisses: 0,
  };
}

export function readLifetimeStats(): LifetimeStats {
  const fallback = emptyLifetimeStats();
  const stored = readJson<Partial<LifetimeStats> | null>(STORAGE_KEY, null);
  if (!stored) return fallback;

  const safeNumber = (value: unknown, fallbackValue = 0) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.floor(value))
      : fallbackValue;
  const safeDay = (value: unknown) =>
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value
      : undefined;

  return {
    totalGames: safeNumber(stored.totalGames),
    highestScore: safeNumber(stored.highestScore),
    totalShieldsCollected: safeNumber(stored.totalShieldsCollected),
    totalDistance: safeNumber(stored.totalDistance),
    bestSpeedLevel: Math.max(1, safeNumber(stored.bestSpeedLevel, 1)),
    totalNearMisses: safeNumber(stored.totalNearMisses),
    firstPlayedDay: safeDay(stored.firstPlayedDay),
    lastPlayedDay: safeDay(stored.lastPlayedDay),
  };
}

export function recordCompletedRun(
  stats: LifetimeStats,
  run: RunResult,
  date = new Date(),
): LifetimeStats {
  const day = utcDateKey(date);
  const next: LifetimeStats = {
    totalGames: stats.totalGames + 1,
    highestScore: Math.max(stats.highestScore, run.score),
    totalShieldsCollected:
      stats.totalShieldsCollected + run.shieldsCollected,
    totalDistance: stats.totalDistance + run.distance,
    bestSpeedLevel: Math.max(stats.bestSpeedLevel, run.speedLevel),
    totalNearMisses: stats.totalNearMisses + run.nearMisses,
    firstPlayedDay: stats.firstPlayedDay ?? day,
    lastPlayedDay: day,
  };
  writeJson(STORAGE_KEY, next);
  return next;
}

