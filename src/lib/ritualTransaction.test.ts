import { describe, expect, it } from "vitest";
import { ritualNetworkMessage } from "@/lib/ritualTransaction";

describe("Ritual transaction network states", () => {
  it("keeps wallet connection optional", () => {
    expect(ritualNetworkMessage(false, undefined, true)).toBe("Wallet not connected");
  });

  it("explains the wrong-network action without Ethereum terminology", () => {
    const message = ritualNetworkMessage(true, 1, true);
    expect(message).toBe("Switch to Ritual Testnet to record or mint your score.");
    expect(message).not.toMatch(/ethereum|sepolia|eth/i);
  });

  it("only reports ready after the Ritual registry is available", () => {
    expect(ritualNetworkMessage(true, 1979, false)).toBe("Registry update pending");
    expect(ritualNetworkMessage(true, 1979, true)).toBe("Ready to Record");
  });
});
