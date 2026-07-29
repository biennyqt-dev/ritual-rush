import type { Address } from "viem";
import { RITUAL_NETWORK } from "@/lib/ritual";
export { RITUAL_RUSH_CONTRACT_ABI } from "@/lib/generated/ritualRushAbi";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const DEPLOYED_RITUAL_RUSH_ADDRESS =
  "0xeA43d7fcDb8ECCDc0C1F5A763b7F21c2EF4dCaEE" as Address;

function configuredAddress(value: string | undefined): Address | null {
  if (!value || value.toLowerCase() === ZERO_ADDRESS) return null;
  return /^0x[a-fA-F0-9]{40}$/.test(value) ? (value as Address) : null;
}

export const RITUAL_RUSH_CONTRACT_ADDRESS =
  configuredAddress(process.env.NEXT_PUBLIC_RITUAL_RUSH_CONTRACT) ??
  DEPLOYED_RITUAL_RUSH_ADDRESS;

export const RITUAL_RUSH_DEPLOYMENT_BLOCK = 52372790n;

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

export type ScoreRecordView = {
  score: bigint;
  speedLevel: number;
  runDuration: number;
  timestamp: bigint;
  exists: boolean;
  nickname: string;
  metadataURI: string;
};
