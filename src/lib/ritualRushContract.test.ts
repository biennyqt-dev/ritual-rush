import { describe, expect, it } from "vitest";
import { ritualRushContractExplorerUrl } from "@/lib/ritualRushContract";

describe("Ritual Rush contract configuration", () => {
  it("builds the Ritual explorer URL for a deployment address", () => {
    expect(
      ritualRushContractExplorerUrl(
        "0x6cdD0392DDEA911470471F2eD4Df3318E8E2889a",
      ),
    ).toBe(
      "https://explorer.ritualfoundation.org/address/0x6cdD0392DDEA911470471F2eD4Df3318E8E2889a",
    );
  });

  it("omits the explorer URL while no contract is configured", () => {
    expect(ritualRushContractExplorerUrl(null)).toBeNull();
  });
});
