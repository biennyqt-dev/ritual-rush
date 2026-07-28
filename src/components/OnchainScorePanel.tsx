"use client";
/* eslint-disable react-hooks/set-state-in-effect -- transaction and RPC hooks synchronize external wallet state into this UI. */

import { useCallback, useEffect, useState } from "react";
import { parseAbiItem } from "viem";
import {
  useAccount,
  useConnect,
  usePublicClient,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import type { AchievementDefinition } from "@/features/achievements/achievements";
import type { RunResult } from "@/game/engine/types";
import { RITUAL_CHAIN_ID } from "@/lib/ritual";
import { ritualNetworkMessage } from "@/lib/ritualTransaction";
import {
  RITUAL_RUSH_CONTRACT_ABI,
  RITUAL_RUSH_CONTRACT_ADDRESS,
  RITUAL_RUSH_DEPLOYMENT_BLOCK,
  ritualRushContractExplorerUrl,
  ritualRushTransactionExplorerUrl,
} from "@/lib/ritualRushContract";
import {
  canSubmitRun,
  formatRunDuration,
  scoreMetadataReference,
} from "@/lib/scoreRecord";
import { rankOnchainScores } from "@/lib/onchainLeaderboard";

const SUBMISSION_KEY = "ritual-rush:onchain-runs:v1";
const scoreRecordedEvent = parseAbiItem(
  "event ScoreRecorded(address indexed player,uint256 score,uint32 speedLevel,uint32 runDuration,bytes32 indexed runId,string metadataURI,uint256 timestamp)",
);

type ScoreAction = "record" | "mint";
type PanelState = "idle" | "confirming" | "submitted" | "confirmed" | "rejected" | "failed";

interface LocalRunState {
  recorded: boolean;
  minted: boolean;
  tokenId?: string;
  recordHash?: string;
  mintHash?: string;
}

interface OnchainScorePanelProps {
  result: RunResult;
  nickname: string;
  personalBest: number;
  unlocked: AchievementDefinition[];
  onWalletConnected: (address: string | null) => void;
  onExit: () => void;
}

function shortAddress(address: string | null | undefined) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function readLocalRunState(runId: string): LocalRunState {
  if (typeof window === "undefined") {
    return { recorded: false, minted: false };
  }
  try {
    const raw = window.localStorage.getItem(SUBMISSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, LocalRunState>) : {};
    return parsed[runId] ?? { recorded: false, minted: false };
  } catch {
    return { recorded: false, minted: false };
  }
}

function saveLocalRunState(runId: string, value: LocalRunState) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(SUBMISSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, LocalRunState>) : {};
    parsed[runId] = value;
    window.localStorage.setItem(SUBMISSION_KEY, JSON.stringify(parsed));
  } catch {
    // Storage is an enhancement; the contract remains the source of truth.
  }
}

function errorLabel(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/reject|denied|user canceled|user denied/i.test(message)) {
    return "Transaction rejected in wallet.";
  }
  if (/insufficient|balance|funds|gas required/i.test(message)) {
    return "Insufficient RITUAL for gas.";
  }
  return "Transaction failed. Check your Ritual Testnet balance and try again.";
}

export function OnchainScorePanel({
  result,
  nickname,
  personalBest,
  unlocked,
  onWalletConnected,
  onExit,
}: OnchainScorePanelProps) {
  const { address, chainId, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const contractAddress = RITUAL_RUSH_CONTRACT_ADDRESS;
  const networkReady = Boolean(address && isConnected && chainId === RITUAL_CHAIN_ID);
  const connector = connectors[0];
  const [action, setAction] = useState<ScoreAction | null>(null);
  const [recordState, setRecordState] = useState<PanelState>("idle");
  const [mintState, setMintState] = useState<PanelState>("idle");
  const [localState, setLocalState] = useState<LocalRunState>(() =>
    readLocalRunState(result.runId),
  );
  const [error, setError] = useState<string | null>(null);

  const { data: contractVersion } = useReadContract({
    address: contractAddress ?? undefined,
    abi: RITUAL_RUSH_CONTRACT_ABI,
    functionName: "VERSION",
    chainId: RITUAL_CHAIN_ID,
    query: { enabled: Boolean(contractAddress), retry: 3 },
  });
  const registryMismatch =
    contractVersion !== undefined && contractVersion !== "2.0.0";
  // The public v2 address is known and write-capable even while the version
  // read is still loading or a wallet RPC temporarily declines the read.
  const registryReady = Boolean(contractAddress) && !registryMismatch;

  const {
    writeContract: writeRecord,
    data: recordHash,
    error: recordError,
    isPending: isRecordWalletPending,
    reset: resetRecord,
  } = useWriteContract();
  const {
    writeContract: writeMint,
    data: mintHash,
    error: mintError,
    isPending: isMintWalletPending,
    reset: resetMint,
  } = useWriteContract();
  const recordReceipt = useWaitForTransactionReceipt({
    hash: recordHash,
    confirmations: 1,
  });
  const mintReceipt = useWaitForTransactionReceipt({
    hash: mintHash,
    confirmations: 1,
  });

  const metadataURI = scoreMetadataReference(result.runId);

  useEffect(() => {
    onWalletConnected(address ?? null);
  }, [address, onWalletConnected]);

  useEffect(() => {
    setLocalState(readLocalRunState(result.runId));
    setAction(null);
    setRecordState("idle");
    setMintState("idle");
    setError(null);
    resetRecord();
    resetMint();
  }, [resetMint, resetRecord, result.runId]);

  useEffect(() => {
    if (!recordHash) return;
    setRecordState(recordReceipt.isSuccess ? "confirmed" : "submitted");
    if (recordReceipt.isSuccess && !localState.recorded) {
      const next = {
        ...localState,
        recorded: true,
        recordHash,
      };
      setLocalState(next);
      saveLocalRunState(result.runId, next);
    }
  }, [localState, recordHash, recordReceipt.isSuccess, result.runId]);

  useEffect(() => {
    if (!mintHash) return;
    setMintState(mintReceipt.isSuccess ? "confirmed" : "submitted");
    if (mintReceipt.isSuccess && !localState.minted) {
      const tokenId = mintReceipt.data?.logs
        .map((log) => log.topics[3])
        .find(Boolean);
      const next = {
        ...localState,
        minted: true,
        mintHash,
        tokenId: tokenId ? BigInt(tokenId).toString() : localState.tokenId,
      };
      setLocalState(next);
      saveLocalRunState(result.runId, next);
    }
  }, [localState, mintHash, mintReceipt.data, mintReceipt.isSuccess, result.runId]);

  useEffect(() => {
    if (recordError) {
      setRecordState(/reject|denied|cancel/i.test(recordError.message) ? "rejected" : "failed");
      setError(errorLabel(recordError));
    }
    if (mintError) {
      setMintState(/reject|denied|cancel/i.test(mintError.message) ? "rejected" : "failed");
      setError(errorLabel(mintError));
    }
    if (recordReceipt.isError) {
      setRecordState("failed");
      setError("Record transaction reverted on Ritual Testnet.");
    }
    if (mintReceipt.isError) {
      setMintState("failed");
      setError("Mint transaction reverted on Ritual Testnet.");
    }
  }, [mintError, mintReceipt.isError, recordError, recordReceipt.isError]);

  const startWalletConnection = () => {
    if (connector) connect({ connector });
  };

  const requestAction = (nextAction: ScoreAction) => {
    setError(null);
    setAction(nextAction);
  };

  const submitRecord = () => {
    if (!contractAddress || !address || !networkReady || !registryReady) return;
    setError(null);
    setAction(null);
    setRecordState("submitted");
    try {
      writeRecord({
        address: contractAddress,
        abi: RITUAL_RUSH_CONTRACT_ABI,
        functionName: "recordScore",
        chainId: RITUAL_CHAIN_ID,
        args: [
          BigInt(Math.max(1, Math.floor(result.score))),
          result.speedLevel,
          Math.max(1, Math.floor(result.elapsedSeconds)),
          result.runId as `0x${string}`,
          metadataURI,
        ],
      });
    } catch (submissionError) {
      setRecordState("failed");
      setError(errorLabel(submissionError));
    }
  };

  const submitMint = () => {
    if (!contractAddress || !address || !networkReady || !registryReady) return;
    setError(null);
    setAction(null);
    setMintState("submitted");
    try {
      writeMint({
        address: contractAddress,
        abi: RITUAL_RUSH_CONTRACT_ABI,
        functionName: "mintScoreCard",
        chainId: RITUAL_CHAIN_ID,
        args: [result.runId as `0x${string}`],
      });
    } catch (submissionError) {
      setMintState("failed");
      setError(errorLabel(submissionError));
    }
  };

  const recordConfirmed = localState.recorded || recordReceipt.isSuccess;
  const recordBusy =
    isRecordWalletPending ||
    recordReceipt.isLoading ||
    recordState === "submitted";
  const mintBusy =
    isMintWalletPending || mintReceipt.isLoading || mintState === "submitted";
  const statusLabel = !contractAddress
    ? "Registry not configured"
    : recordConfirmed
      ? "Recorded on Ritual Testnet"
      : recordBusy
        ? "Recording on Ritual"
        : recordState === "rejected"
          ? "Record rejected"
          : recordState === "failed"
            ? "Record failed"
        : ritualNetworkMessage(Boolean(isConnected), chainId, registryReady);

  return (
    <aside className="score-record-panel" aria-label="Ritual score recording">
      <div className="score-record-scanline" aria-hidden="true" />
      <div className="score-record-header">
        <div>
          <span className="data-label">Ritual Rush</span>
          <h3>Score Record</h3>
        </div>
        <span className={`record-status record-status--${recordConfirmed ? "confirmed" : "ready"}`}>
          <i aria-hidden="true" /> {statusLabel}
        </span>
      </div>

      <div className="score-record-watermark" aria-hidden="true">◈</div>
      <div className="score-record-grid">
        <div><span>Runner</span><strong>{nickname}</strong></div>
        <div><span>Wallet</span><strong>{shortAddress(address)}</strong></div>
        <div><span>Final score</span><strong>{result.score.toLocaleString()}</strong></div>
        <div><span>Personal best</span><strong>{personalBest.toLocaleString()}</strong></div>
        <div><span>Speed level</span><strong>{result.speedLevel}</strong></div>
        <div><span>Run duration</span><strong>{formatRunDuration(result.elapsedSeconds)}</strong></div>
        <div><span>Shields</span><strong>{result.shieldsCollected}</strong></div>
        <div><span>Achievements</span><strong>{unlocked.length}</strong></div>
      </div>
      <div className="score-record-footer">
        <span>UTC {result.completedAt.replace("T", " ").slice(0, 16)}</span>
      </div>
      <code className="score-record-run">Run {result.runId.slice(0, 10)}…{result.runId.slice(-8)}</code>

      <p className="score-record-note">
        Recording proves this wallet submitted the run record. It does not make
        gameplay cheat-proof. This action uses a small amount of testnet RITUAL
        for network gas.
      </p>

      {!isConnected && (
        <button className="primary-cta primary-cta--compact score-record-action" type="button" disabled={isConnecting || !connector} onClick={startWalletConnection}>
          {isConnecting ? "Connecting…" : "Connect Wallet to Record"}
        </button>
      )}
      {isConnected && chainId !== RITUAL_CHAIN_ID && (
        <button className="outline-button score-record-action" type="button" disabled={isSwitching} onClick={() => switchChain({ chainId: RITUAL_CHAIN_ID })}>
          {isSwitching ? "Switching…" : "Switch to Ritual Testnet to record or mint your score."}
        </button>
      )}
      {isConnected && chainId === RITUAL_CHAIN_ID && registryMismatch && (
        <div className="panel-state panel-state--error score-record-action">This wallet is connected to an older score registry. Refresh the app before recording.</div>
      )}
      {isConnected && chainId === RITUAL_CHAIN_ID && registryReady && (
        <div className="score-record-actions">
          <button className="primary-cta primary-cta--compact" type="button" disabled={!canSubmitRun({ recorded: recordConfirmed, pending: recordBusy })} onClick={() => requestAction("record")}>
            {recordConfirmed ? "Score Recorded" : recordBusy ? "Recording…" : "Record your score"}
          </button>
          <button className="outline-button" type="button" disabled={!recordConfirmed || localState.minted || mintBusy} onClick={() => requestAction("mint")}>
            {localState.minted ? `Minted #${localState.tokenId ?? "—"}` : mintBusy ? "Minting…" : mintState === "rejected" ? "Mint rejected" : mintState === "failed" ? "Mint failed" : "Mint Score Card"}
          </button>
        </div>
      )}

      <button
        className="outline-button score-record-action score-record-exit"
        type="button"
        onClick={onExit}
      >
        EXIT
      </button>

      {action && (
        <div className="score-record-confirm" role="dialog" aria-label="Confirm Ritual transaction">
          <strong>{action === "record" ? "Ready to record this score?" : "Mint this score card?"}</strong>
          <span>Final score {result.score.toLocaleString()} · {formatRunDuration(result.elapsedSeconds)} · one normal Ritual gas transaction.</span>
          <div>
            <button className="primary-cta primary-cta--compact" type="button" onClick={action === "record" ? submitRecord : submitMint}>
              Confirm {action === "record" ? "Record" : "Mint"}
            </button>
            <button className="text-button" type="button" onClick={() => setAction(null)}>Cancel</button>
          </div>
        </div>
      )}

      {(recordHash || mintHash) && (
        <div className="score-record-links">
          {recordHash && <a href={ritualRushTransactionExplorerUrl(recordHash)} target="_blank" rel="noreferrer" title={`Open transaction ${recordHash}`}>Open record tx ↗ {shortAddress(recordHash)}</a>}
          {mintHash && <a href={ritualRushTransactionExplorerUrl(mintHash)} target="_blank" rel="noreferrer" title={`Open transaction ${mintHash}`}>Open mint tx ↗ {shortAddress(mintHash)}</a>}
        </div>
      )}
      {recordConfirmed && <span className="score-record-success">Recorded on Ritual Testnet ✓</span>}
      {error && <span className="inline-error score-record-error" role="alert">{error}</span>}
    </aside>
  );
}

interface HistoryRow {
  player: string;
  runId: string;
  score: bigint;
  speedLevel: number;
  runDuration: number;
  timestamp: bigint;
  txHash?: string;
}

export function OnchainHistoryPanel() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: RITUAL_CHAIN_ID });
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!RITUAL_RUSH_CONTRACT_ADDRESS || !publicClient) {
      setState("error");
      setMessage("The score registry is not configured for this preview.");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const logs = await publicClient.getLogs({
        address: RITUAL_RUSH_CONTRACT_ADDRESS,
        event: scoreRecordedEvent,
        fromBlock: RITUAL_RUSH_DEPLOYMENT_BLOCK,
      });
      const parsedRows = logs
        .map<HistoryRow | null>((log) => {
          const args = log.args as {
            player?: string;
            score?: bigint;
            speedLevel?: number;
            runDuration?: number;
            runId?: string;
            timestamp?: bigint;
          };
          if (
            !args.player ||
            args.score === undefined ||
            args.speedLevel === undefined ||
            args.runDuration === undefined ||
            !args.runId ||
            args.timestamp === undefined
          ) {
            return null;
          }
          return {
            player: args.player,
            runId: args.runId,
            score: args.score,
            speedLevel: args.speedLevel,
            runDuration: args.runDuration,
            timestamp: args.timestamp,
            txHash: log.transactionHash as string | undefined,
          };
        })
        .filter((row): row is HistoryRow => row !== null);
      const nextRows = rankOnchainScores(parsedRows, 25);
      setRows(nextRows);
      setLastUpdated(new Date().toISOString());
      setState("success");
    } catch {
      setState("error");
      setMessage("Live scores could not be read. Try refreshing.");
    }
  }, [publicClient]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 12_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return (
    <div className="onchain-history">
      <div className="onchain-history-toolbar">
        <div>
          <span className="data-label">Live onchain leaderboard</span>
          <h3>YOUR RECORD SCORE IN RITUAL RUSH</h3>
        </div>
        <div className="onchain-history-actions">
          {lastUpdated && <span className="onchain-history-updated">Live · {lastUpdated.slice(11, 16)} UTC</span>}
          <button className="micro-button" type="button" onClick={() => void refresh()} disabled={state === "loading"}>
            {state === "loading" ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
      {message && <div className="panel-state panel-state--error">{message}</div>}
      {state === "success" && rows.length === 0 && <div className="panel-state">No records have been written yet.</div>}
      {rows.length > 0 && (
        <div className="onchain-history-table-wrap">
          <table className="leaderboard-table onchain-history-table">
            <thead><tr><th>Rank</th><th>Score</th><th>Player</th><th>Level</th><th>Duration</th><th>Recorded</th><th>Transaction</th></tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.player}-${row.runId}`} className={row.player.toLowerCase() === address?.toLowerCase() ? "is-current-player" : undefined}>
                  <td>{index + 1}</td>
                  <td>{row.score.toLocaleString()}</td>
                  <td>
                    <code>{shortAddress(row.player)}</code>
                    {row.player.toLowerCase() === address?.toLowerCase() && <small className="history-you">You</small>}
                  </td>
                  <td>{row.speedLevel}</td>
                  <td>{formatRunDuration(row.runDuration)}</td>
                  <td>{new Date(Number(row.timestamp) * 1000).toISOString().slice(0, 10)}</td>
                  <td>
                    {row.txHash ? (
                      <a href={ritualRushTransactionExplorerUrl(row.txHash)} target="_blank" rel="noreferrer" title={`Open transaction ${row.txHash}`}>
                        Open tx ↗
                      </a>
                    ) : (
                      <a href={ritualRushContractExplorerUrl() ?? "#"} target="_blank" rel="noreferrer">Contract ↗</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
