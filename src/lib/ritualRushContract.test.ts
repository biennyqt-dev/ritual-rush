import { describe, expect, it } from "vitest";
import {
  RITUAL_RUSH_CONTRACT_ABI,
  ritualRushContractExplorerUrl,
  ritualRushTransactionExplorerUrl,
} from "@/lib/ritualRushContract";

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

  it("builds Ritual transaction links and exposes record/mint functions", () => {
    expect(
      ritualRushTransactionExplorerUrl(`0x${"ab".repeat(32)}`),
    ).toBe(
      `https://explorer.ritualfoundation.org/tx/0x${"ab".repeat(32)}`,
    );
    expect(
      RITUAL_RUSH_CONTRACT_ABI.filter((item) => item.type === "function").map(
        (item) => item.name,
      ),
    ).toContain("recordScore");
    expect(
      RITUAL_RUSH_CONTRACT_ABI.filter((item) => item.type === "function").map(
        (item) => item.name,
      ),
    ).toContain("mintScoreCard");
  });
});
