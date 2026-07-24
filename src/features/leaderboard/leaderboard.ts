import { readJson, utcDateKey, writeJson } from "@/lib/storage";

export type IdentityKind = "guest" | "wallet" | "demo";

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  score: number;
  kind: IdentityKind;
  dateKey: string;
  isCurrentPlayer?: boolean;
}

export interface LeaderboardService {
  getDailyLeaderboard(identityId?: string): Promise<LeaderboardEntry[]>;
  submitScore(entry: Omit<LeaderboardEntry, "dateKey">): Promise<void>;
  getPlayerDailyBest(identityId: string): Promise<number>;
  getDailyRank(identityId: string): Promise<number | null>;
}

interface StoredLeaderboard {
  dateKey: string;
  entries: LeaderboardEntry[];
}

const STORAGE_KEY = "ritual-rush:leaderboard:v1";

const DEMO_NAMES = [
  "NullVector",
  "ByteBloom",
  "KernelKid",
  "NeonOracle",
  "PacketGhost",
  "EchoNode",
  "AgentZero",
  "HashRunner",
  "GreenSignal",
  "CipherFox",
  "LoopTheory",
  "DataWarden",
  "FluxPilot",
  "QuietTensor",
  "BlockScout",
  "PulseChain",
  "RelayRider",
  "AsyncAce",
  "GraphNomad",
  "CoreDrift",
  "ProofSpark",
  "StackRitual",
  "ModelMint",
  "ShardShift",
  "HexHopper",
];

export function createDemoEntries(dateKey = utcDateKey()): LeaderboardEntry[] {
  return DEMO_NAMES.map((nickname, index) => ({
    id: `demo-${index + 1}`,
    nickname,
    score: Math.max(420, 12480 - index * 417 - ((index * 83) % 173)),
    kind: "demo" as const,
    dateKey,
  }));
}

function readStored(dateKey: string): StoredLeaderboard {
  const stored = readJson<StoredLeaderboard | null>(STORAGE_KEY, null);
  if (
    !stored ||
    stored.dateKey !== dateKey ||
    !Array.isArray(stored.entries)
  ) {
    return { dateKey, entries: [] };
  }
  return {
    dateKey,
    entries: stored.entries.filter(
      (entry) =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.nickname === "string" &&
        Number.isFinite(entry.score) &&
        entry.score >= 0,
    ),
  };
}

function sorted(
  dateKey: string,
  playerEntries: LeaderboardEntry[],
  identityId?: string,
): LeaderboardEntry[] {
  const combined = [...createDemoEntries(dateKey), ...playerEntries];
  return combined
    .sort((a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname))
    .slice(0, 25)
    .map((entry) => ({
      ...entry,
      isCurrentPlayer: entry.id === identityId,
    }));
}

export class LocalLeaderboardService implements LeaderboardService {
  async getDailyLeaderboard(identityId?: string) {
    const dateKey = utcDateKey();
    return sorted(dateKey, readStored(dateKey).entries, identityId);
  }

  async submitScore(entry: Omit<LeaderboardEntry, "dateKey">) {
    const dateKey = utcDateKey();
    const stored = readStored(dateKey);
    const safeScore = Math.max(0, Math.min(10_000_000, Math.floor(entry.score)));
    const existing = stored.entries.find((item) => item.id === entry.id);

    if (existing && existing.score >= safeScore) return;

    const nextEntry: LeaderboardEntry = {
      id: entry.id.slice(0, 80),
      nickname: entry.nickname.slice(0, 18),
      score: safeScore,
      kind: entry.kind === "wallet" ? "wallet" : "guest",
      dateKey,
    };

    const entries = existing
      ? stored.entries.map((item) =>
          item.id === entry.id ? nextEntry : item,
        )
      : [...stored.entries, nextEntry];

    writeJson(STORAGE_KEY, { dateKey, entries } satisfies StoredLeaderboard);
  }

  async getPlayerDailyBest(identityId: string) {
    const dateKey = utcDateKey();
    return (
      readStored(dateKey).entries.find((entry) => entry.id === identityId)
        ?.score ?? 0
    );
  }

  async getDailyRank(identityId: string) {
    const entries = await this.getDailyLeaderboard(identityId);
    const index = entries.findIndex((entry) => entry.id === identityId);
    return index === -1 ? null : index + 1;
  }
}

export const localLeaderboard = new LocalLeaderboardService();
