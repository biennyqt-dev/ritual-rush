"use client";

import { QueryClient } from "@tanstack/react-query";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { ritualChain } from "@/lib/ritual";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [ritualChain],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [ritualChain.id]: http(),
  },
  ssr: true,
});
