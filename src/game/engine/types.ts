export type Lane = 0 | 1 | 2;
export type GameStatus = "idle" | "playing" | "paused" | "gameover";
export type ShieldState = "none" | "ready" | "active" | "broken";

export type ObstacleKind = "ritual-logo";

export interface TrackObject {
  id: number;
  lane: Lane;
  y: number;
  kind: ObstacleKind | "shield";
  speedFactor: number;
  collided: boolean;
  passed: boolean;
}

export interface GameSnapshot {
  status: GameStatus;
  score: number;
  distance: number;
  bestScore: number;
  lane: Lane;
  displayLane: number;
  speedLevel: number;
  multiplier: number;
  shield: ShieldState;
  shieldSeconds: number;
  shieldsCollected: number;
  shieldUsed: boolean;
  closeCall: boolean;
  elapsedSeconds: number;
  laneMoves: number;
  nearMisses: number;
  stationaryPasses: number;
}

export interface RunResult {
  runId: string;
  completedAt: string;
  score: number;
  distance: number;
  bestScore: number;
  isNewBest: boolean;
  shieldsCollected: number;
  shieldUsed: boolean;
  closeCall: boolean;
  elapsedSeconds: number;
  speedLevel: number;
  laneMoves: number;
  nearMisses: number;
  stationaryPasses: number;
}
