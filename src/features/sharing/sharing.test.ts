import { describe, expect, it } from "vitest";
import { makeShareText, makeXIntent } from "@/features/sharing/sharing";

describe("score sharing", () => {
  it("includes the dynamic score, challenge, and origin", () => {
    const text = makeShareText({
      score: 8420,
      origin: "https://ritual-rush.example",
    });
    expect(text).toContain("8,420");
    expect(text).toContain("Can you beat my score?");
    expect(text).toContain("https://ritual-rush.example");
  });

  it("properly encodes the X intent", () => {
    const url = makeXIntent({ score: 1000, origin: "http://localhost:3000" });
    expect(url).toMatch(/^https:\/\/x\.com\/intent\/post\?text=/);
    expect(decodeURIComponent(url)).toContain("1,000");
  });
});
