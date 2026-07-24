import { describe, expect, it } from "vitest";
import {
  generateGuestNickname,
  validateNickname,
} from "@/features/profile/nickname";

describe("nickname validation", () => {
  it("trims and normalizes a valid nickname", () => {
    expect(validateNickname("  Neon   Runner  ")).toEqual({
      ok: true,
      value: "Neon Runner",
    });
  });

  it("rejects empty, overly long, and injection-like names", () => {
    expect(validateNickname("   ").ok).toBe(false);
    expect(validateNickname("x".repeat(30)).ok).toBe(false);
    expect(validateNickname("<script>alert(1)</script>").ok).toBe(false);
  });

  it("generates a stable guest-shaped default", () => {
    expect(generateGuestNickname(() => 0.42)).toBe("Guest-4780");
  });
});
