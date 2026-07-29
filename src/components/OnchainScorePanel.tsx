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
import { rankOnchainScores, type OnchainScoreRecord } from "@/lib/onchainLeaderboard";

const SUBMISSION_KEY = "ritual-rush:onchain-runs:v1";
const scoreRecordedEvent = parseAbiItem(
  "event ScoreRecorded(address indexed player,uint256 score,uint32 speedLevel,uint32 runDuration,bytes32 indexed runId,string nickname,string metadataURI,uint256 timestamp)",
);

type PanelState =
  | "idle"
  | "confirming"
  | "simulating"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "failed";

interface LocalRunState {
  recorded: boolean;
  recordHash?: string;
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

function formatRecordedDate(timestamp: bigint): string {
  const raw = Number(timestamp);
  const milliseconds = raw > 100_000_000_000 ? raw : raw * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? "—" : date.toISOString().slice(0, 10);
}

function readLocalRunState(runId: string): LocalRunState {
  if (typeof window === "undefined") return { recorded: false };
  try {
    const raw = window.localStorage.getItem(SUBMISSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, LocalRunState>) : {};
    return parsed[runId] ?? { recorded: false };
  } catch {
    return { recorded: false };
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
    // Browser storage is only a convenience; the contract remains canonical.
  }
}

function errorLabel(error: unknown): string {
  const candidate = error as { shortMessage?: string; message?: string } | null;
  const message = candidate?.shortMessage ?? candidate?.message ?? String(error ?? "");
  if (/reject|denied|user canceled|user denied/i.test(message)) {
    return "Transaction rejected in wallet.";
  }
  if (/insufficient|balance|funds|gas required/i.test(message)) {
    return "Insufficient testnet RITUAL for normal network gas.";
  }
  if (/DuplicateRun/i.test(message)) {
    return "This run ID was already recorded. Start a new run before recording again.";
  }
  if (/InvalidSpeedLevel/i.test(message)) {
    return "The run level is outside the supported Ritual Rush range (1–100).";
  }
  if (/InvalidScore/i.test(message)) {
    return "The score is outside the valid Ritual Rush range.";
  }
  if (/InvalidRunDuration/i.test(message)) {
    return "The run duration is outside the valid range.";
  }
  if (/InvalidRunId/i.test(message)) {
    return "This run did not receive a valid unique run ID. Start a new run.";
  }
  if (/NicknameTooLong/i.test(message)) {
    return "That nickname is too long to record onchain.";
  }
  if (/MetadataTooLong/i.test(message)) {
    return "The score metadata is too long for the Ritual registry.";
  }
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact) {
    return `Ritual Testnet simulation failed: ${compact.slice(0, 180)}`;
  }
  return "Ritual Testnet transaction failed. Check the wallet network and testnet RITUAL balance.";
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
  const publicClient = usePublicClient({ chainId: RITUAL_CHAIN_ID });
  const contractAddress = RITUAL_RUSH_CONTRACT_ADDRESS;
  const networkReady = Boolean(address && isConnected && chainId === RITUAL_CHAIN_ID);
  const connector = connectors[0];
  const [recordState, setRecordState] = useState<PanelState>("idle");
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
    contractVersion !== undefined && contractVersion !== "3.0.0";
  const registryReady = Boolean(contractAddress) && !registryMismatch;

  const {
    writeContract: writeRecord,
    data: recordHash,
    error: recordError,
    isPending: isRecordWalletPending,
    reset: resetRecord,
  } = useWriteContract();
  const recordReceipt = useWaitForTransactionReceipt({
    hash: recordHash,
    confirmations: 1,
  });

  const metadataURI = scoreMetadataReference(result.runId);

  useEffect(() => {
    onWalletConnected(address ?? null);
  }, [address, onWalletConnected]);

  useEffect(() => {
    setLocalState(readLocalRunState(result.runId));
    setRecordState("idle");
    setError(null);
    resetRecord();
  }, [resetRecord, result.runId]);

  useEffect(() => {
    if (!recordHash) return;
    if (recordReceipt.isSuccess) {
      setRecordState("confirmed");
      if (!localState.recorded) {
        const next = { recorded: true, recordHash };
        setLocalState(next);
        saveLocalRunState(result.runId, next);
      }
    } else if (recordReceipt.isError) {
      setRecordState("failed");
      setError("The Ritual Testnet record transaction reverted. No score was saved.");
    } else {
      setRecordState("submitted");
    }
  }, [localState.recorded, recordHash, recordReceipt.isError, recordReceipt.isSuccess, result.runId]);

  useEffect(() => {
    if (recordError) {
      setRecordState(/reject|denied|cancel/i.test(recordError.message) ? "rejected" : "failed");
      setError(errorLabel(recordError));
    }
  }, [recordError]);

  const startWalletConnection = () => {
    if (connector) connect({ connector });
  };

  const submitRecord = async () => {
    if (!contractAddress || !address || !networkReady || !registryReady) return;
    setError(null);
    setRecordState("simulating");
    try {
      if (!publicClient) throw new Error("Ritual Testnet RPC is unavailable.");
      const simulation = await publicClient.simulateContract({
        address: contractAddress,
        abi: RITUAL_RUSH_CONTRACT_ABI,
        functionName: "recordScore",
        account: address,
        args: [
          BigInt(Math.max(1, Math.floor(result.score))),
          result.speedLevel,
          Math.max(1, Math.floor(result.elapsedSeconds)),
          result.runId as `0x${string}`,
          nickname,
          metadataURI,
        ],
      });
      setRecordState("submitted");
      writeRecord(simulation.request);
    } catch (submissionError) {
      setRecordState(/reject|denied|cancel/i.test(String(submissionError)) ? "rejected" : "failed");
      setError(errorLabel(submissionError));
    }
  };

  const recordConfirmed = localState.recorded || recordReceipt.isSuccess;
  const recordBusy =
    isRecordWalletPending ||
    recordReceipt.isLoading ||
    recordState === "simulating" ||
    recordState === "submitted";
  const statusLabel = !contractAddress
    ? "Registry not configured"
    : recordConfirmed
      ? "Recorded on Ritual Testnet"
      : recordBusy
        ? recordState === "simulating"
          ? "Checking transaction"
          : "Recording on Ritual"
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
        for normal network gas.
      </p>

      {!isConnected && (
        <button className="primary-cta primary-cta--compact score-record-action" type="button" disabled={isConnecting || !connector} onClick={startWalletConnection}>
          {isConnecting ? "Connecting…" : "Connect Wallet to Record"}
        </button>
      )}
      {isConnected && chainId !== RITUAL_CHAIN_ID && (
        <button className="outline-button score-record-action" type="button" disabled={isSwitching} onClick={() => switchChain({ chainId: RITUAL_CHAIN_ID })}>
          {isSwitching ? "Switching…" : "Switch to Ritual Testnet to record your score."}
        </button>
      )}
      {isConnected && chainId === RITUAL_CHAIN_ID && registryMismatch && (
        <div className="panel-state panel-state--error score-record-action">This wallet is connected to an older score registry. Refresh the app before recording.</div>
      )}
      {isConnected && chainId === RITUAL_CHAIN_ID && registryReady && (
        <button className="primary-cta primary-cta--compact score-record-action" type="button" disabled={!canSubmitRun({ recorded: recordConfirmed, pending: recordBusy })} onClick={() => void submitRecord()}>
          {recordConfirmed ? "Score Recorded" : recordBusy ? (recordState === "simulating" ? "Checking…" : "Recording…") : "Record your score"}
        </button>
      )}

      <button
        className="outline-button score-record-action score-record-exit"
        type="button"
        onClick={onExit}
      >
        EXIT
      </button>

      {recordHash && (
        <div className="score-record-links">
          <a href={ritualRushTransactionExplorerUrl(recordHash)} target="_blank" rel="noreferrer" title={`Open transaction ${recordHash}`}>
            Open successful record tx ↗ {shortAddress(recordHash)}
          </a>
        </div>
      )}
      {recordConfirmed && <span className="score-record-success">Recorded on Ritual Testnet ✓</span>}
      {error && <span className="inline-error score-record-error" role="alert">{error}</span>}
    </aside>
  );
}

type HistoryRow = OnchainScoreRecord;

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
      setMessage("The Ritual score registry is not configured.");
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
            nickname?: string;
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
            nickname: args.nickname?.trim() ?? "",
            runId: args.runId,
            score: args.score,
            speedLevel: args.speedLevel,
            runDuration: args.runDuration,
            timestamp: args.timestamp,
            txHash: log.transactionHash as string | undefined,
          };
        })
        .filter((row): row is HistoryRow => row !== null);
      setRows(rankOnchainScores(parsedRows, 25));
      setLastUpdated(new Date().toISOString());
      setState("success");
    } catch (readError) {
      setState("error");
      setMessage(errorLabel(readError));
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
          <span className="data-label">Confirmed Ritual Testnet events</span>
          <h3>YOUR RECORD SCORE IN RITUAL RUSH</h3>
        </div>
        <div className="onchain-history-actions">
          {lastUpdated && <span className="onchain-history-updated">Live · {lastUpdated.slice(11, 16)} UTC</span>}
          <button className="micro-button" type="button" onClick={() => void refresh()} disabled={state === "loading"}>
            {state === "loading" ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
      {message && <div className="panel-state panel-state--error" role="alert">{message}</div>}
      {state === "loading" && <div className="panel-state" role="status">Reading confirmed onchain scores…</div>}
      {state === "success" && rows.length === 0 && <div className="panel-state">No onchain scores recorded yet.</div>}
      {rows.length > 0 && (
        <div className="onchain-history-table-wrap">
          <table className="leaderboard-table onchain-history-table">
            <thead><tr><th>Rank</th><th>Score</th><th>Runner</th><th>Level</th><th>Duration</th><th>Recorded</th><th>Transaction</th></tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.player}-${row.runId}`} className={row.player.toLowerCase() === address?.toLowerCase() ? "is-current-player" : undefined}>
                  <td>{index + 1}</td>
                  <td>{row.score.toLocaleString()}</td>
                  <td>
                    <strong>{row.nickname || "Anonymous"}</strong>
                    <small><code>{shortAddress(row.player)}</code>{row.player.toLowerCase() === address?.toLowerCase() && <span className="history-you">You</span>}</small>
                  </td>
                  <td>{row.speedLevel}</td>
                  <td>{formatRunDuration(row.runDuration)}</td>
                  <td>{formatRecordedDate(row.timestamp)}</td>
                  <td>
                    {row.txHash ? (
                      <a href={ritualRushTransactionExplorerUrl(row.txHash)} target="_blank" rel="noreferrer" title={`Open successful transaction ${row.txHash}`}>
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
