import { RITUAL_CHAIN_ID } from "@/lib/ritual";

export function ritualNetworkMessage(
  connected: boolean,
  chainId: number | undefined,
  registryReady: boolean,
): string {
  if (!connected) return "Wallet not connected";
  if (chainId !== RITUAL_CHAIN_ID) {
    return "Switch to Ritual Testnet to record your score.";
  }
  if (!registryReady) return "Registry update pending";
  return "Ready to Record";
}
