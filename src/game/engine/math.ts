import type { Lane } from "@/game/engine/types";

export interface Difficulty {
  level: number;
  speed: number;
  spawnInterval: number;
  multiplier: number;
}

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
  const accelerationProgress = normalized / 15;
  const level = Math.min(12, 1 + Math.floor(accelerationProgress));
  return {
    level,
    speed: Math.min(0.48, 0.195 + accelerationProgress * 0.03),
    spawnInterval: Math.max(0.76, 1.34 - accelerationProgress * 0.045),
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
