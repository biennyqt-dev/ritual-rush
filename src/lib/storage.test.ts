import { beforeEach, describe, expect, it } from "vitest";
import {
  millisecondsUntilUtcReset,
  readJson,
  utcDateKey,
  writeJson,
} from "@/lib/storage";

describe("safe local storage", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips JSON and falls back on corruption", () => {
    expect(writeJson("test", { score: 12 })).toBe(true);
    expect(readJson("test", { score: 0 })).toEqual({ score: 12 });
    localStorage.setItem("test", "{bad json");
    expect(readJson("test", { score: 0 })).toEqual({ score: 0 });
  });

  it("uses UTC day boundaries", () => {
    const date = new Date("2026-07-24T23:59:59.000Z");
    expect(utcDateKey(date)).toBe("2026-07-24");
    expect(millisecondsUntilUtcReset(date)).toBe(1000);
  });
});
