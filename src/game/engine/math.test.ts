import { describe, expect, it } from "vitest";
import {
  activateShield,
  advanceScore,
  clampLane,
  consumeShield,
  chooseShieldLane,
  createRunId,
  detectCollision,
  difficultyAt,
  generateFairPattern,
  moveLane,
  patternIsPossible,
  shieldTargetForLevel,
  shouldSpawnShield,
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

  it("targets three shields in level one with a two-shield minimum", () => {
    expect(shieldTargetForLevel(1)).toBe(3);

    expect(shouldSpawnShield(1, 2.3, 0, Number.NEGATIVE_INFINITY, false, () => 0)).toBe(true);
    expect(shouldSpawnShield(1, 3.1, 1, 2.3, false, () => 0)).toBe(false);
    expect(shouldSpawnShield(1, 6.2, 1, 2.3, false, () => 0)).toBe(true);
    expect(shouldSpawnShield(1, 10.2, 2, 6.2, false, () => 0)).toBe(true);
    expect(shouldSpawnShield(1, 14.9, 3, 10.2, false, () => 0)).toBe(false);
    expect(shouldSpawnShield(2, 3, 0, Number.NEGATIVE_INFINITY, false, () => 0)).toBe(true);
  });

  it("only places shields in lanes that remain fair", () => {
    expect(chooseShieldLane([{ lane: 0, delay: 0 }], [1], () => 0)).toBe(2);
    expect(chooseShieldLane([{ lane: 0, delay: 0 }], [1, 2], () => 0)).toBe(null);
  });

  it("creates non-zero unique run identifiers", () => {
    const first = createRunId(() => 0);
    const second = createRunId(() => 0);
    expect(first).toMatch(/^0x[0-9a-f]{64}$/);
    expect(second).toMatch(/^0x[0-9a-f]{64}$/);
    expect(first).not.toBe(second);
    expect(first).not.toBe(`0x${"0".repeat(64)}`);
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
