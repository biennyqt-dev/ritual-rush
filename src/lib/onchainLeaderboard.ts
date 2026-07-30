export interface OnchainScoreRecord {
  player: string;
  nickname: string;
  runId: string;
  score: bigint;
  speedLevel: number;
  runDuration: number;
  timestamp: bigint;
  txHash?: string;
}

export const ONCHAIN_LOG_BLOCK_RANGE = 90_000n;

export function chunkBlockRange(
  fromBlock: bigint,
  toBlock: bigint,
  maxBlockRange = ONCHAIN_LOG_BLOCK_RANGE,
) {
  if (maxBlockRange <= 0n) {
    throw new RangeError("maxBlockRange must be greater than zero");
  }
  if (toBlock < fromBlock) return [];

  const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  for (let start = fromBlock; start <= toBlock; start += maxBlockRange) {
    ranges.push({
      fromBlock: start,
      toBlock: start + maxBlockRange - 1n > toBlock
        ? toBlock
        : start + maxBlockRange - 1n,
    });
  }
  return ranges;
}

export function rankOnchainScores(
  records: OnchainScoreRecord[],
  limit = 25,
): OnchainScoreRecord[] {
  const highestByWallet = new Map<string, OnchainScoreRecord>();
  for (const record of records) {
    const key = record.player.toLowerCase();
    const existing = highestByWallet.get(key);
    if (
      !existing ||
      record.score > existing.score ||
      (record.score === existing.score && record.timestamp > existing.timestamp)
    ) {
      highestByWallet.set(key, record);
    }
  }

  return [...highestByWallet.values()]
    .sort((left, right) => {
      if (left.score !== right.score) return left.score > right.score ? -1 : 1;
      if (left.timestamp !== right.timestamp) return left.timestamp > right.timestamp ? -1 : 1;
      return left.player.localeCompare(right.player);
    })
    .slice(0, Math.max(1, limit));
}
