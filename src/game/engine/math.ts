import type { Lane } from "@/game/engine/types";

export interface Difficulty {
  level: number;
  speed: number;
  spawnInterval: number;
  multiplier: number;
}

export const LEVEL_DURATION_SECONDS = 15;
export const MAX_DIFFICULTY_LEVEL = 100;
export const BASE_FALL_SPEED = 0.22;
export const TRAP_SPEED_PER_LEVEL = 0.08;
export const MAX_FALL_SPEED =
  BASE_FALL_SPEED + (MAX_DIFFICULTY_LEVEL - 1) * TRAP_SPEED_PER_LEVEL;

export interface PatternItem {
  lane: Lane;
  delay: number;
  fast?: boolean;
}

export interface ShieldModel {
  activeSeconds: number;
  brokenSeconds: number;
  consumed: boolean;
}

export interface ShieldSpawnConfig {
  minimumLevelOne: number;
  targetLevelOne: number;
  minimumLaterLevels: number;
  minimumGapSeconds: number;
  firstSpawnAfterSeconds: number;
  levelOneChance: number;
  laterLevelChance: number;
}

export const DEFAULT_SHIELD_SPAWN_CONFIG: ShieldSpawnConfig = {
  minimumLevelOne: 2,
  targetLevelOne: 3,
  minimumLaterLevels: 1,
  minimumGapSeconds: 3.8,
  firstSpawnAfterSeconds: 2.2,
  levelOneChance: 0.58,
  laterLevelChance: 0.24,
};

export function shieldTargetForLevel(
  level: number,
  config = DEFAULT_SHIELD_SPAWN_CONFIG,
): number {
  if (level <= 1) return config.targetLevelOne;
  return Math.max(
    config.minimumLaterLevels,
    Math.round(config.targetLevelOne * Math.pow(0.84, level - 1)),
  );
}

export function shouldSpawnShield(
  level: number,
  levelElapsedSeconds: number,
  spawnedThisLevel: number,
  lastSpawnElapsedSeconds: number,
  hasShieldReady: boolean,
  random = Math.random,
  config = DEFAULT_SHIELD_SPAWN_CONFIG,
): boolean {
  if (hasShieldReady) return false;
  if (spawnedThisLevel >= shieldTargetForLevel(level, config)) return false;
  if (
    levelElapsedSeconds < config.firstSpawnAfterSeconds ||
    levelElapsedSeconds - lastSpawnElapsedSeconds < config.minimumGapSeconds
  ) {
    return false;
  }

  if (
    level === 1 &&
    spawnedThisLevel < config.minimumLevelOne &&
    levelElapsedSeconds < 14.5
  ) {
    return true;
  }

  return random() <
    (level === 1 ? config.levelOneChance : config.laterLevelChance);
}

export function chooseShieldLane(
  pattern: PatternItem[],
  blockedLanes: Lane[] = [],
  random = Math.random,
): Lane | null {
  const blocked = new Set<Lane>(blockedLanes);
  for (const item of pattern) {
    if (item.delay <= 1.1) blocked.add(item.lane);
  }
  const safeLanes = ([0, 1, 2] as Lane[]).filter(
    (lane) => !blocked.has(lane),
  );
  if (safeLanes.length === 0) return null;
  return safeLanes[Math.floor(random() * safeLanes.length)] ?? safeLanes[0];
}

let fallbackRunCounter = 0;

export function createRunId(random = Math.random): string {
  const bytes = new Uint8Array(32);
  const timestamp = Date.now() + fallbackRunCounter++;
  const useSecureRandom =
    random === Math.random &&
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function";

  if (useSecureRandom) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < 8; index += 1) {
      bytes[index] = (timestamp >>> ((index % 4) * 8)) & 0xff;
    }
    for (let index = 8; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.max(0, Math.min(0.999999, random())) * 256);
    }
  }

  if (bytes.every((value) => value === 0)) bytes[31] = 1;
  return `0x${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function clampLane(value: number): Lane {
  return Math.max(0, Math.min(2, Math.round(value))) as Lane;
}

export function moveLane(current: Lane, direction: -1 | 1): Lane {
  return clampLane(current + direction);
}

export function detectCollision(
  playerLane: Lane,
  objectLane: Lane,
  objectY: number,
  playerY = 0.82,
  radius = 0.068,
): boolean {
  return playerLane === objectLane && Math.abs(objectY - playerY) <= radius;
}

export function difficultyAt(seconds: number): Difficulty {
  const normalized = Math.max(0, seconds);
  const accelerationProgress = normalized / LEVEL_DURATION_SECONDS;
  const level = Math.min(
    MAX_DIFFICULTY_LEVEL,
    1 + Math.floor(accelerationProgress),
  );
  const levelProgress = Math.min(
    MAX_DIFFICULTY_LEVEL - 1,
    accelerationProgress,
  );
  const speed = Math.min(
    MAX_FALL_SPEED,
    BASE_FALL_SPEED + levelProgress * TRAP_SPEED_PER_LEVEL,
  );
  return {
    level,
    speed,
    spawnInterval: Math.max(0.9, 1.32 - accelerationProgress * 0.03),
    multiplier: Math.min(5, 1 + Math.floor(accelerationProgress / 2)),
  };
}

export function advanceScore(
  score: number,
  deltaSeconds: number,
  multiplier: number,
): number {
  return score + Math.max(0, deltaSeconds) * 86 * Math.max(1, multiplier);
}

export function activateShield(duration = 8): ShieldModel {
  return {
    activeSeconds: Math.max(0, duration),
    brokenSeconds: 0,
    consumed: false,
  };
}

export function consumeShield(model: ShieldModel): ShieldModel {
  if (model.activeSeconds <= 0) return model;
  return {
    activeSeconds: 0,
    brokenSeconds: 0.85,
    consumed: true,
  };
}

export function generateFairPattern(
  difficultyLevel: number,
  random = Math.random,
): PatternItem[] {
  const roll = random();
  const lane = Math.floor(random() * 3) as Lane;

  if (difficultyLevel >= 3 && roll > 0.66) {
    const safe = lane;
    return ([0, 1, 2] as Lane[])
      .filter((candidate) => candidate !== safe)
      .map((blocked) => ({ lane: blocked, delay: 0 }));
  }

  if (difficultyLevel >= 2 && roll > 0.38) {
    const next = ((lane + (random() > 0.5 ? 1 : 2)) % 3) as Lane;
    return [
      { lane, delay: 0 },
      { lane: next, delay: Math.max(0.52, 0.8 - difficultyLevel * 0.02) },
    ];
  }

  return [
    {
      lane,
      delay: 0,
      fast: difficultyLevel >= 5 && random() > 0.72,
    },
  ];
}

export function patternIsPossible(items: PatternItem[]): boolean {
  const groups = new Map<number, Set<Lane>>();
  for (const item of items) {
    const key = Math.round(item.delay * 100);
    const lanes = groups.get(key) ?? new Set<Lane>();
    lanes.add(item.lane);
    groups.set(key, lanes);
  }
  return Array.from(groups.values()).every((lanes) => lanes.size < 3);
}
