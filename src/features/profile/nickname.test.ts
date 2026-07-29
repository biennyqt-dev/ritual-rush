import { describe, expect, it } from "vitest";
import {
  generateGuestNickname,
  NICKNAME_HELPER_TEXT,
  validateNickname,
} from "@/features/profile/nickname";

describe("nickname validation", () => {
  it("trims and normalizes a valid nickname", () => {
    expect(validateNickname("  Neon   Runner  ")).toEqual({
      ok: true,
      value: "Neon Runner",
    });
  });

  it("rejects empty, overly long, and invisible control characters", () => {
    expect(validateNickname("   ").ok).toBe(false);
    expect(validateNickname("x".repeat(30)).ok).toBe(false);
    expect(validateNickname("Runner\u0000").ok).toBe(false);
  });

  it("accepts symbols and emoji as one continuous value", () => {
    expect(validateNickname("<Rush> #1 🚀")).toEqual({
      ok: true,
      value: "<Rush> #1 🚀",
    });
  });

  it("publishes the display-name helper text", () => {
    expect(NICKNAME_HELPER_TEXT).toBe(
      "Letters, numbers, spaces, emojis, and symbols are allowed.",
    );
  });

  it("generates a stable guest-shaped default", () => {
    expect(generateGuestNickname(() => 0.42)).toBe("Guest-4780");
  });
});
