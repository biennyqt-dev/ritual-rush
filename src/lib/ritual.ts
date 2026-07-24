import { defineChain } from "viem";

export const RITUAL_CHAIN_ID = 1979;

export const ritualChain = defineChain({
  id: RITUAL_CHAIN_ID,
  name: "Ritual Testnet",
  nativeCurrency: {
    name: "RITUAL",
    symbol: "RITUAL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RITUAL_RPC_URL ??
          "https://rpc.ritualfoundation.org",
      ],
      webSocket: ["wss://rpc.ritualfoundation.org/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "Ritual Explorer",
      url: "https://explorer.ritualfoundation.org",
    },
  },
  contracts: {
    multicall3: {
      address: "0x5577Ea679673Ec7508E9524100a188E7600202a3",
    },
  },
  testnet: true,
});

export const RITUAL_NETWORK = {
  chainId: RITUAL_CHAIN_ID,
  hexChainId: "0x7bb",
  name: ritualChain.name,
  currency: ritualChain.nativeCurrency,
  rpcUrl: ritualChain.rpcUrls.default.http[0],
  explorerUrl: ritualChain.blockExplorers.default.url,
} as const;
