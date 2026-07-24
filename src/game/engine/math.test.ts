import { describe, expect, it } from "vitest";
import {
  activateShield,
  advanceScore,
  clampLane,
  consumeShield,
  detectCollision,
  difficultyAt,
  generateFairPattern,
  moveLane,
  patternIsPossible,
} from "@/game/engine/math";

describe("lane movement", () => {
  it("clamps lanes at both track boundaries", () => {
    expect(clampLane(-5)).toBe(0);
    expect(clampLane(9)).toBe(2);
    expect(moveLane(0, -1)).toBe(0);
    expect(moveLane(2, 1)).toBe(2);
  });

  it("moves exactly one lane per input", () => {
    expect(moveLane(1, -1)).toBe(0);
    expect(moveLane(1, 1)).toBe(2);
  });
});

describe("collision and shields", () => {
  it("detects only same-lane collisions inside the hit window", () => {
    expect(detectCollision(1, 1, 0.82)).toBe(true);
    expect(detectCollision(1, 0, 0.82)).toBe(false);
    expect(detectCollision(1, 1, 0.68)).toBe(false);
  });

  it("activates and consumes a shield", () => {
    const active = activateShield();
    expect(active.activeSeconds).toBe(8);
    expect(active.consumed).toBe(false);
    const broken = consumeShield(active);
    expect(broken.activeSeconds).toBe(0);
    expect(broken.brokenSeconds).toBeGreaterThan(0);
    expect(broken.consumed).toBe(true);
  });
});

describe("score and difficulty", () => {
  it("progresses score with delta time and multiplier", () => {
    expect(advanceScore(100, 0.5, 2)).toBe(186);
    expect(advanceScore(100, -1, 2)).toBe(100);
  });

  it("increases difficulty within fair caps", () => {
    const start = difficultyAt(0);
    const late = difficultyAt(10_000);
    expect(late.speed).toBeGreaterThan(start.speed);
    expect(late.speed).toBeLessThanOrEqual(0.5);
    expect(late.spawnInterval).toBeGreaterThanOrEqual(0.64);
    expect(late.level).toBe(12);
  });

  it("announces a new level every 15 seconds while ramping smoothly", () => {
    const before = difficultyAt(14.9);
    const after = difficultyAt(15);
    expect(before.level).toBe(1);
    expect(after.level).toBe(2);
    expect(after.speed - before.speed).toBeLessThan(0.001);
    expect(before.spawnInterval - after.spawnInterval).toBeLessThan(0.001);
  });

  it("never emits a three-lane block", () => {
    for (let index = 0; index < 500; index += 1) {
      let seed = index + 1;
      const random = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
      expect(patternIsPossible(generateFairPattern(8, random))).toBe(true);
    }
  });
});
