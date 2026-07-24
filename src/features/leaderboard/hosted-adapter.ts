import type {
  LeaderboardEntry,
  LeaderboardService,
} from "@/features/leaderboard/leaderboard";

/**
 * Future hosted implementation boundary. It is intentionally inactive in the
 * local preview so no credentials or fake online scores are required.
 */
export class HostedLeaderboardService implements LeaderboardService {
  constructor(private readonly baseUrl: string) {}

  async getDailyLeaderboard(): Promise<LeaderboardEntry[]> {
    throw new Error(`Hosted leaderboard is not configured at ${this.baseUrl}.`);
  }

  async submitScore(): Promise<void> {
    throw new Error("Hosted leaderboard is not configured.");
  }

  async getPlayerDailyBest(): Promise<number> {
    throw new Error("Hosted leaderboard is not configured.");
  }

  async getDailyRank(): Promise<number | null> {
    throw new Error("Hosted leaderboard is not configured.");
  }
}
