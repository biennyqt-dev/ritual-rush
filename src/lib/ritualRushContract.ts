import type { Address } from "viem";
import { RITUAL_NETWORK } from "@/lib/ritual";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const DEPLOYED_RITUAL_RUSH_ADDRESS =
  "0xa4eca5499d798c01dd2f8710d2520220b6177020" as Address;

function configuredAddress(value: string | undefined): Address | null {
  if (!value || value.toLowerCase() === ZERO_ADDRESS) return null;
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as Address) : null;
}

export const RITUAL_RUSH_CONTRACT_ADDRESS =
  configuredAddress(process.env.NEXT_PUBLIC_RITUAL_RUSH_CONTRACT) ??
  DEPLOYED_RITUAL_RUSH_ADDRESS;

export const RITUAL_RUSH_DEPLOYMENT_BLOCK = 52350865n;

export function ritualRushContractExplorerUrl(
  address: Address | null = RITUAL_RUSH_CONTRACT_ADDRESS,
) {
  return address
    ? `${RITUAL_NETWORK.explorerUrl}/address/${address}`
    : null;
}

export function ritualRushTransactionExplorerUrl(hash: string) {
  return `${RITUAL_NETWORK.explorerUrl}/tx/${hash}`;
}

export const RITUAL_RUSH_CONTRACT_ABI = [
  {
    type: "function",
    name: "recordScore",
    stateMutability: "nonpayable",
    inputs: [
      { name: "score", type: "uint256" },
      { name: "speedLevel", type: "uint32" },
      { name: "runDuration", type: "uint32" },
      { name: "runId", type: "bytes32" },
      { name: "nickname", type: "string" },
      { name: "metadataURI", type: "string" },
    ],
    outputs: [{ name: "newPersonalBest", type: "bool" }],
  },
  {
    type: "function",
    name: "scoreRecord",
    stateMutability: "view",
    inputs: [
      { name: "player", type: "address" },
      { name: "runId", type: "bytes32" },
    ],
    outputs: [
      {
        name: "record",
        type: "tuple",
        components: [
          { name: "score", type: "uint256" },
          { name: "speedLevel", type: "uint32" },
          { name: "runDuration", type: "uint32" },
          { name: "timestamp", type: "uint64" },
          { name: "exists", type: "bool" },
          { name: "nickname", type: "string" },
          { name: "metadataURI", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "playerRunCount",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "playerRunIdAt",
    stateMutability: "view",
    inputs: [
      { name: "player", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "playerBestScore",
    stateMutability: "view",
    inputs: [{ name: "player", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "MAX_SPEED_LEVEL",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint32" }],
  },
  {
    type: "function",
    name: "RITUAL_CHAIN_ID",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "VERSION",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "event",
    name: "ScoreRecorded",
    anonymous: false,
    inputs: [
      { name: "player", type: "address", indexed: true },
      { name: "score", type: "uint256", indexed: false },
      { name: "speedLevel", type: "uint32", indexed: false },
      { name: "runDuration", type: "uint32", indexed: false },
      { name: "runId", type: "bytes32", indexed: true },
      { name: "nickname", type: "string", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export type ScoreRecordView = {
  score: bigint;
  speedLevel: number;
  runDuration: number;
  timestamp: bigint;
  exists: boolean;
  nickname: string;
  metadataURI: string;
};
