import type { Address } from "viem";
import { RITUAL_NETWORK } from "@/lib/ritual";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function configuredAddress(value: string | undefined): Address | null {
  if (!value || value.toLowerCase() === ZERO_ADDRESS) {
    return null;
  }

  return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as Address) : null;
}

export const RITUAL_RUSH_CONTRACT_ADDRESS = configuredAddress(
  process.env.NEXT_PUBLIC_RITUAL_RUSH_CONTRACT,
);

export function ritualRushContractExplorerUrl(
  address: Address | null = RITUAL_RUSH_CONTRACT_ADDRESS,
) {
  return address
    ? `${RITUAL_NETWORK.explorerUrl}/address/${address}`
    : null;
}

export const RITUAL_RUSH_CONTRACT_ABI = [
  {
    type: "function",
    name: "claimScore",
    stateMutability: "nonpayable",
    inputs: [
      { name: "score", type: "uint64" },
      { name: "runId", type: "bytes32" },
    ],
    outputs: [{ name: "newPersonalBest", type: "bool" }],
  },
  {
    type: "function",
    name: "playerStats",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "bestClaimedScore", type: "uint64" },
          { name: "claimCount", type: "uint64" },
          { name: "lastClaimedAt", type: "uint64" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "ScoreClaimed",
    anonymous: false,
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "runId", type: "bytes32", indexed: true },
      { name: "score", type: "uint64", indexed: false },
      { name: "newPersonalBest", type: "bool", indexed: false },
    ],
  },
] as const;
