import { describe, expect, it } from "vitest";
import {
  activateShield,
  advanceScore,
  BASE_FALL_SPEED,
  clampLane,
  consumeShield,
  chooseShieldLane,
  createRunId,
  detectCollision,
  difficultyAt,
  generateFairPattern,
  MAX_FALL_SPEED,
  moveLane,
  patternIsPossible,
  shieldTargetForLevel,
  shouldSpawnShield,
  TRAP_SPEED_PER_LEVEL,
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
    expect(start.speed).toBe(BASE_FALL_SPEED);
    expect(late.speed).toBe(MAX_FALL_SPEED);
    expect(late.spawnInterval).toBeGreaterThanOrEqual(0.9);
    expect(late.level).toBe(100);
    expect(difficultyAt(99 * 15).level).toBe(100);
  });

  it("follows the approved trap-speed formula at every level", () => {
    const before = difficultyAt(14.9);
    const after = difficultyAt(15);
    expect(before.level).toBe(1);
    expect(after.level).toBe(2);
    expect(after.speed).toBeCloseTo(BASE_FALL_SPEED + TRAP_SPEED_PER_LEVEL, 8);
    expect(before.spawnInterval - after.spawnInterval).toBeLessThan(0.001);

    expect(difficultyAt(0).speed).toBeCloseTo(0.22, 8);
    expect(difficultyAt(15).speed).toBeCloseTo(0.3, 8);
    expect(difficultyAt(30).speed).toBeCloseTo(0.38, 8);
    expect(difficultyAt(99 * 15).speed).toBeCloseTo(8.14, 8);

    for (let level = 1; level < 100; level += 1) {
      const current = difficultyAt((level - 1) * 15);
      const next = difficultyAt(level * 15);
      expect(next.speed - current.speed).toBeCloseTo(TRAP_SPEED_PER_LEVEL, 8);
    }
  });

  it("never emits a three-lane block", () => {
    for (const difficultyLevel of [8, 100]) {
      for (let index = 0; index < 500; index += 1) {
        let seed = index + 1;
        const random = () => {
          seed = (seed * 16807) % 2147483647;
          return (seed - 1) / 2147483646;
        };
        expect(
          patternIsPossible(generateFairPattern(difficultyLevel, random)),
        ).toBe(true);
      }
    }
  });
});
