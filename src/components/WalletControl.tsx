"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { RITUAL_CHAIN_ID } from "@/lib/ritual";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const subscribeToProvider = () => () => undefined;
const readProvider = () => "ethereum" in window;
const readServerProvider = () => false;

export function WalletControl({
  onIdentity,
}: {
  onIdentity: (address: string | null) => void;
}) {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const hasProvider = useSyncExternalStore(
    subscribeToProvider,
    readProvider,
    readServerProvider,
  );

  useEffect(() => {
    onIdentity(address ?? null);
  }, [address, onIdentity]);

  if (isConnected && address) {
    const wrongNetwork = chainId !== RITUAL_CHAIN_ID;
    return (
      <div className="wallet-stack">
        <button
          className={`wallet-pill ${wrongNetwork ? "wallet-pill--warning" : ""}`}
          type="button"
          onClick={() => disconnect()}
          aria-label={`Disconnect wallet ${shortAddress(address)}`}
          title="Disconnect wallet"
        >
          <span className="status-dot" aria-hidden="true" />
          <span>{shortAddress(address)}</span>
          <small>{wrongNetwork ? "Wrong network" : "Ritual Testnet"}</small>
        </button>
        {wrongNetwork && (
          <button
            className="micro-button micro-button--gold"
            type="button"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: RITUAL_CHAIN_ID })}
          >
            {isSwitching ? "Switching…" : "Switch / add Ritual Testnet"}
          </button>
        )}
      </div>
    );
  }

  const connector = connectors[0];
  return (
    <div className="wallet-stack">
      <button
        className="wallet-pill"
        type="button"
        disabled={isPending || !hasProvider || !connector}
        onClick={() => connector && connect({ connector })}
      >
        <span className="status-dot status-dot--idle" aria-hidden="true" />
        {isPending
          ? "Connecting…"
          : hasProvider
            ? "Connect Wallet — Optional"
            : "Browser wallet unavailable"}
      </button>
      {error && (
        <small className="inline-error" role="status">
          Connection cancelled or unavailable. Guest play is ready.
        </small>
      )}
    </div>
  );
}
