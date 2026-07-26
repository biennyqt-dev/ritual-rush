export interface OnchainScoreRecord {
  player: string;
  runId: string;
  score: bigint;
  speedLevel: number;
  runDuration: number;
  timestamp: bigint;
  txHash?: string;
}

export function rankOnchainScores(
  records: OnchainScoreRecord[],
  limit = 25,
): OnchainScoreRecord[] {
  return [...records]
    .sort((left, right) => {
      if (left.score !== right.score) return left.score > right.score ? -1 : 1;
      if (left.timestamp !== right.timestamp) return left.timestamp > right.timestamp ? -1 : 1;
      return left.player.localeCompare(right.player);
    })
    .slice(0, Math.max(1, limit));
}
