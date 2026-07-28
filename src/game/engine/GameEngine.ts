import {
  advanceScore,
  BASE_FALL_SPEED,
  chooseShieldLane,
  createRunId,
  DEFAULT_SHIELD_SPAWN_CONFIG,
  detectCollision,
  difficultyAt,
  generateFairPattern,
  MAX_DIFFICULTY_LEVEL,
  MAX_FALL_SPEED,
  moveLane,
  shouldSpawnShield,
  type PatternItem,
} from "@/game/engine/math";
import { freezeRunResult } from "@/lib/scoreRecord";
import type {
  GameSnapshot,
  Lane,
  RunResult,
  ShieldState,
  TrackObject,
} from "@/game/engine/types";

const PLAYER_Y = 0.84;
const SHIELD_DURATION = 8;

interface PendingSpawn extends PatternItem {
  at: number;
}

export interface EngineOptions {
  onSnapshot?: (snapshot: GameSnapshot) => void;
  onGameOver?: (result: RunResult) => void;
  onAcceleration?: (level: number) => void;
  random?: () => number;
  getBestScore?: () => number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private animationFrame = 0;
  private previousTime = 0;
  private status: GameSnapshot["status"] = "idle";
  private lane: Lane = 1;
  private displayLane = 1;
  private score = 0;
  private runId = "0x";
  private distance = 0;
  private elapsed = 0;
  private spawnTimer = 0.6;
  private shieldTimer = 0;
  private brokenTimer = 0;
  private shieldsCollected = 0;
  private shieldCountByLevel = new Map<number, number>();
  private lastShieldSpawnElapsed = Number.NEGATIVE_INFINITY;
  private shieldSpawnLevel = 1;
  private shieldUsed = false;
  private closeCall = false;
  private laneMoves = 0;
  private nearMisses = 0;
  private stationaryPasses = 0;
  private bestStationaryPasses = 0;
  private objects: TrackObject[] = [];
  private pending: PendingSpawn[] = [];
  private particles: Particle[] = [];
  private nextId = 1;
  private snapshotAccumulator = 0;
  private nextMilestone = 1000;
  private nextAccelerationLevel = 2;
  private flash = 0;
  private shake = 0;
  private readonly random: () => number;
  private readonly onSnapshot?: (snapshot: GameSnapshot) => void;
  private readonly onGameOver?: (result: RunResult) => void;
  private readonly onAcceleration?: (level: number) => void;
  private readonly getBestScore: () => number;
  private readonly logoImage: HTMLImageElement | null;
  private readonly backgroundImage: HTMLImageElement | null;

  constructor(options: EngineOptions = {}) {
    this.random = options.random ?? Math.random;
    this.onSnapshot = options.onSnapshot;
    this.onGameOver = options.onGameOver;
    this.onAcceleration = options.onAcceleration;
    this.getBestScore = options.getBestScore ?? (() => 0);
    this.logoImage = typeof Image === "undefined" ? null : new Image();
    this.backgroundImage = typeof Image === "undefined" ? null : new Image();
    if (this.logoImage) {
      this.logoImage.decoding = "async";
      this.logoImage.src = "/ritual-logo.jpg";
    }
    if (this.backgroundImage) {
      this.backgroundImage.decoding = "async";
      this.backgroundImage.src = "/galaxy-background.jpg";
    }
  }

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", { alpha: false });
    this.resize();
    if (!this.animationFrame) {
      this.previousTime = performance.now();
      this.animationFrame = requestAnimationFrame(this.loop);
    }
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    this.canvas = null;
    this.context = null;
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  start() {
    this.status = "playing";
    this.lane = 1;
    this.displayLane = 1;
    this.score = 0;
    this.runId = createRunId(this.random);
    this.distance = 0;
    this.elapsed = 0;
    this.spawnTimer = 1.05;
    this.shieldTimer = 0;
    this.brokenTimer = 0;
    this.shieldsCollected = 0;
    this.shieldCountByLevel.clear();
    this.lastShieldSpawnElapsed = Number.NEGATIVE_INFINITY;
    this.shieldSpawnLevel = 1;
    this.shieldUsed = false;
    this.closeCall = false;
    this.laneMoves = 0;
    this.nearMisses = 0;
    this.stationaryPasses = 0;
    this.bestStationaryPasses = 0;
    this.objects = [];
    this.pending = [];
    this.particles = [];
    this.nextMilestone = 1000;
    this.nextAccelerationLevel = 2;
    this.flash = 0;
    this.shake = 0;
    this.emitSnapshot();
  }

  resetToIdle() {
    this.status = "idle";
    this.objects = [];
    this.pending = [];
    this.particles = [];
    this.flash = 0;
    this.emitSnapshot();
  }

  pause() {
    if (this.status === "playing") {
      this.status = "paused";
      this.emitSnapshot();
    }
  }

  resume() {
    if (this.status === "paused") {
      this.status = "playing";
      this.previousTime = performance.now();
      this.emitSnapshot();
    }
  }

  togglePause() {
    if (this.status === "playing") this.pause();
    else if (this.status === "paused") this.resume();
  }

  move(direction: -1 | 1) {
    if (this.status !== "playing") return;
    const next = moveLane(this.lane, direction);
    if (next !== this.lane) {
      this.lane = next;
      this.laneMoves += 1;
      this.stationaryPasses = 0;
      this.burst(this.displayLane, PLAYER_Y, "#19D184", 7);
    }
  }

  getSnapshot(): GameSnapshot {
    const difficulty = difficultyAt(this.elapsed);
    return {
      status: this.status,
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      bestScore: Math.max(this.getBestScore(), Math.floor(this.score)),
      lane: this.lane,
      displayLane: this.displayLane,
      speedLevel: difficulty.level,
      multiplier: difficulty.multiplier,
      shield: this.getShieldState(),
      shieldSeconds: Math.max(0, this.shieldTimer),
      shieldsCollected: this.shieldsCollected,
      shieldUsed: this.shieldUsed,
      closeCall: this.closeCall,
      elapsedSeconds: this.elapsed,
      laneMoves: this.laneMoves,
      nearMisses: this.nearMisses,
      stationaryPasses: this.bestStationaryPasses,
    };
  }

  update(deltaSeconds: number) {
    if (this.status !== "playing") return;
    const delta = Math.min(0.05, Math.max(0, deltaSeconds));
    this.elapsed += delta;
    const difficulty = difficultyAt(this.elapsed);
    this.score = advanceScore(this.score, delta, difficulty.multiplier);
    this.distance += delta * difficulty.speed * 128;
    this.displayLane += (this.lane - this.displayLane) * Math.min(1, delta * 16);
    this.spawnTimer -= delta;
    this.shieldTimer = Math.max(0, this.shieldTimer - delta);
    this.brokenTimer = Math.max(0, this.brokenTimer - delta);
    this.flash = Math.max(0, this.flash - delta * 2.8);
    this.shake = Math.max(0, this.shake - delta * 2.5);

    if (this.score >= this.nextMilestone) {
      this.nextMilestone += 1000;
      this.flash = 0.3;
    }

    if (difficulty.level >= this.nextAccelerationLevel) {
      this.onAcceleration?.(difficulty.level);
      this.nextAccelerationLevel = difficulty.level + 1;
      this.flash = Math.max(this.flash, 0.42);
    }

    if (this.spawnTimer <= 0) {
      this.queuePattern(difficulty.level);
      this.spawnTimer = difficulty.spawnInterval * (0.9 + this.random() * 0.2);
    }

    this.flushPending();

    for (const object of this.objects) {
      object.y += delta * difficulty.speed * object.speedFactor;

      if (
        !object.collided &&
        detectCollision(this.lane, object.lane, object.y)
      ) {
        object.collided = true;
        if (object.kind === "shield") {
          this.shieldTimer = SHIELD_DURATION;
          this.brokenTimer = 0;
          this.shieldsCollected += 1;
          this.burst(object.lane, PLAYER_Y, "#BFFF00", 20);
        } else if (this.shieldTimer > 0) {
          this.shieldTimer = 0;
          this.brokenTimer = 0.85;
          this.shieldUsed = true;
          this.flash = 0.8;
          this.shake = 0.6;
          this.burst(object.lane, PLAYER_Y, "#BFFF00", 32);
        } else {
          this.finishRun();
          return;
        }
      }

      if (!object.passed && object.y > PLAYER_Y + 0.08) {
        object.passed = true;
        if (object.kind !== "shield") {
          this.stationaryPasses += 1;
          this.bestStationaryPasses = Math.max(
            this.bestStationaryPasses,
            this.stationaryPasses,
          );
        }
        if (
          object.kind !== "shield" &&
          Math.abs(object.lane - this.lane) === 1 &&
          Math.abs(this.displayLane - this.lane) > 0.12
        ) {
          this.closeCall = true;
          this.nearMisses += 1;
        }
      }
    }

    this.objects = this.objects.filter(
      (object) => object.y < 1.18 && !object.collided,
    );

    for (const particle of this.particles) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.life -= delta;
    }
    this.particles = this.particles
      .filter((particle) => particle.life > 0)
      .slice(-90);

    this.snapshotAccumulator += delta;
    if (this.snapshotAccumulator >= 0.09) {
      this.snapshotAccumulator = 0;
      this.emitSnapshot();
    }
  }

  private readonly loop = (time: number) => {
    const delta = (time - this.previousTime) / 1000;
    this.previousTime = time;
    this.update(delta);
    this.render(time / 1000);
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private queuePattern(level: number) {
    const difficulty = difficultyAt(this.elapsed);
    const pattern = generateFairPattern(level, this.random);
    for (const item of pattern) {
      this.pending.push({
        ...item,
        at: this.elapsed + item.delay,
      });
    }

    const levelStart = Math.max(0, (level - 1) * 15);
    if (this.shieldSpawnLevel !== level) {
      this.shieldSpawnLevel = level;
      this.lastShieldSpawnElapsed = Number.NEGATIVE_INFINITY;
    }
    const spawnedThisLevel = this.shieldCountByLevel.get(level) ?? 0;
    const hasShieldReady =
      this.shieldTimer > 0 ||
      this.objects.some((object) => object.kind === "shield");
    if (
      shouldSpawnShield(
        level,
        this.elapsed - levelStart,
        spawnedThisLevel,
        this.lastShieldSpawnElapsed,
        hasShieldReady,
        this.random,
        DEFAULT_SHIELD_SPAWN_CONFIG,
      )
    ) {
      const shieldTravelSeconds =
        (PLAYER_Y + 0.26) / (difficulty.speed * 0.94);
      const liveObstacleLanes = this.objects
        .filter((object) => object.kind !== "shield" && object.y < 0.48)
        .filter((object) => {
          const obstacleArrival =
            (PLAYER_Y - object.y) /
            (difficulty.speed * object.speedFactor);
          return Math.abs(obstacleArrival - shieldTravelSeconds) < 1.25;
        })
        .map((object) => object.lane);
      const pendingObstacleLanes = this.pending
        .filter((item) => item.at >= this.elapsed)
        .filter((item) => {
          const spawnIn = item.at - this.elapsed;
          const obstacleTravelSeconds =
            (PLAYER_Y + 0.26) /
            (difficulty.speed * (item.fast ? 1.18 : 1));
          return (
            Math.abs(spawnIn + obstacleTravelSeconds - shieldTravelSeconds) <
            1.25
          );
        })
        .map((item) => item.lane);
      const shieldLane = chooseShieldLane(
        pattern,
        [...liveObstacleLanes, ...pendingObstacleLanes],
        this.random,
      );
      if (shieldLane !== null) {
        this.spawnObject(shieldLane, "shield", 0.94);
        this.shieldCountByLevel.set(level, spawnedThisLevel + 1);
        this.lastShieldSpawnElapsed = this.elapsed - levelStart;
      }
    }
  }

  private flushPending() {
    const due = this.pending.filter((item) => item.at <= this.elapsed);
    this.pending = this.pending.filter((item) => item.at > this.elapsed);
    for (const item of due) {
      this.spawnObject(item.lane, "ritual-logo", item.fast ? 1.18 : 1);
    }
  }

  private spawnObject(
    lane: Lane,
    kind: TrackObject["kind"],
    speedFactor: number,
  ) {
    this.objects.push({
      id: this.nextId++,
      lane,
      y: -0.26,
      kind,
      speedFactor,
      collided: false,
      passed: false,
    });
  }

  private getShieldState(): ShieldState {
    if (this.brokenTimer > 0) return "broken";
    if (this.shieldTimer > 0) return "active";
    if (this.objects.some((object) => object.kind === "shield"))
      return "ready";
    return "none";
  }

  private finishRun() {
    this.status = "gameover";
    this.flash = 1;
    this.shake = 1;
    this.burst(this.lane, PLAYER_Y, "#EF4444", 44);
    const score = Math.floor(this.score);
    const previousBest = this.getBestScore();
    const result = freezeRunResult({
      runId: this.runId,
      completedAt: new Date().toISOString(),
      score,
      distance: Math.floor(this.distance),
      bestScore: Math.max(score, previousBest),
      isNewBest: score > previousBest,
      shieldsCollected: this.shieldsCollected,
      shieldUsed: this.shieldUsed,
      closeCall: this.closeCall,
      elapsedSeconds: this.elapsed,
      speedLevel: difficultyAt(this.elapsed).level,
      laneMoves: this.laneMoves,
      nearMisses: this.nearMisses,
      stationaryPasses: this.bestStationaryPasses,
    });
    this.emitSnapshot();
    this.onGameOver?.(result);
  }

  private emitSnapshot() {
    this.onSnapshot?.(this.getSnapshot());
  }

  private burst(
    lane: number,
    y: number,
    color: string,
    count: number,
  ) {
    for (let index = 0; index < count; index += 1) {
      const angle = this.random() * Math.PI * 2;
      const force = 0.06 + this.random() * 0.18;
      this.particles.push({
        x: lane,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        life: 0.25 + this.random() * 0.55,
        color,
      });
    }
  }

  private render(time: number) {
    const canvas = this.canvas;
    const context = this.context;
    if (!canvas || !context) return;
    const width = canvas.width;
    const height = canvas.height;
    const jitterX = this.shake > 0 ? Math.sin(time * 91) * 7 * this.shake : 0;
    const jitterY = this.shake > 0 ? Math.cos(time * 73) * 4 * this.shake : 0;

    context.save();
    context.translate(jitterX, jitterY);
    this.drawBackground(context, width, height, time);
    this.drawObjects(context, width, height, time);
    this.drawPlayer(context, width, height, time);
    this.drawParticles(context, width, height);

    if (this.flash > 0) {
      context.fillStyle = `rgba(${this.status === "gameover" ? "239,68,68" : "25,209,132"},${this.flash * 0.12})`;
      context.fillRect(-10, -10, width + 20, height + 20);
    }
    context.restore();
  }

  private trackPoint(
    lane: number,
    y: number,
    width: number,
    height: number,
  ) {
    const horizonY = height * 0.055;
    const clampedY = Math.max(-0.28, y);
    const depth = Math.max(0, Math.min(1, (clampedY + 0.28) / 1.46));
    const perspective = Math.pow(depth, 1.08);
    const laneSpread = width * (0.13 + perspective * 0.16);
    const x = width / 2 + (lane - 1) * laneSpread;
    const screenY = horizonY + perspective * height * 0.92;
    return { x, y: screenY, scale: 0.22 + perspective * 0.88 };
  }

  private drawBackground(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
  ) {
    context.fillStyle = "#000";
    context.fillRect(-12, -12, width + 24, height + 24);

    const difficulty = difficultyAt(this.elapsed);
    const speedProgress = Math.min(
      1,
      Math.max(
        0,
        (difficulty.speed - BASE_FALL_SPEED) /
          (MAX_FALL_SPEED - BASE_FALL_SPEED),
      ),
    );
    const moving = this.status === "playing";

    if (
      this.backgroundImage &&
      this.backgroundImage.complete &&
      this.backgroundImage.naturalWidth > 0
    ) {
      const image = this.backgroundImage;
      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;
      const targetRatio = width / height;
      const sourceRatio = sourceWidth / sourceHeight;
      const coverWidth =
        sourceRatio > targetRatio ? sourceHeight * targetRatio : sourceWidth;
      const coverHeight =
        sourceRatio > targetRatio ? sourceHeight : sourceWidth / targetRatio;
      const zoom = 1.08 + speedProgress * 0.06;
      const cropWidth = coverWidth / zoom;
      const cropHeight = coverHeight / zoom;
      const maxX = Math.max(0, sourceWidth - cropWidth);
      const maxY = Math.max(0, sourceHeight - cropHeight);
      const travelRate = moving
        ? 0.13 +
          difficulty.speed * 0.42 +
          Math.min(MAX_DIFFICULTY_LEVEL - 1, difficulty.level - 1) * 0.0006
        : 0.035;
      const travel = time * travelRate;
      const sourceX =
        maxX *
        (0.5 + Math.sin(travel * 0.52) * (0.08 + speedProgress * 0.035));
      const sourceY = maxY * (0.5 + Math.sin(travel) * 0.48);

      context.globalAlpha = 0.94;
      context.drawImage(
        image,
        Math.max(0, Math.min(maxX, sourceX)),
        Math.max(0, Math.min(maxY, sourceY)),
        cropWidth,
        cropHeight,
        -8,
        -8,
        width + 16,
        height + 16,
      );

      const depthZoom = zoom + 0.1;
      const depthWidth = coverWidth / depthZoom;
      const depthHeight = coverHeight / depthZoom;
      const depthMaxX = Math.max(0, sourceWidth - depthWidth);
      const depthMaxY = Math.max(0, sourceHeight - depthHeight);
      context.globalAlpha = 0.13 + speedProgress * 0.05;
      context.globalCompositeOperation = "screen";
      context.drawImage(
        image,
        depthMaxX * (0.5 + Math.cos(travel * 0.31) * 0.2),
        depthMaxY * (0.5 + Math.sin(travel * 0.44) * 0.42),
        depthWidth,
        depthHeight,
        0,
        0,
        width,
        height,
      );
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
    }

    const horizon = height * 0.145;
    const glow = context.createRadialGradient(
      width / 2,
      horizon,
      0,
      width / 2,
      horizon,
      width * 0.55,
    );
    glow.addColorStop(
      0,
      `rgba(25,209,132,${0.08 + speedProgress * 0.05})`,
    );
    glow.addColorStop(0.45, "rgba(25,209,132,.018)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height * 0.75);

    context.strokeStyle = `rgba(25,209,132,${0.055 + speedProgress * 0.035})`;
    context.lineWidth = Math.max(1, width / 900);
    for (let line = -7; line <= 7; line += 1) {
      context.beginPath();
      context.moveTo(width / 2 + line * width * 0.012, horizon);
      context.lineTo(width / 2 + line * width * 0.09, height);
      context.stroke();
    }

    const gridSpeed = moving ? 0.18 + difficulty.speed * 1.25 : 0.04;
    const gridOffset = (time * gridSpeed) % 0.12;
    for (let row = -1; row < 12; row += 1) {
      const y = row * 0.12 + gridOffset;
      const left = this.trackPoint(-1.7, y, width, height);
      const right = this.trackPoint(3.7, y, width, height);
      context.strokeStyle = `rgba(25,209,132,${0.025 + Math.max(0, y) * (0.08 + speedProgress * 0.035)})`;
      context.beginPath();
      context.moveTo(left.x, left.y);
      context.lineTo(right.x, right.y);
      context.stroke();
    }

    const corridorTop = -0.12;
    const corridorBottom = 1.1;
    const corridorLeft = this.trackPoint(-0.5, corridorTop, width, height);
    const corridorRight = this.trackPoint(2.5, corridorTop, width, height);
    const corridorBottomRight = this.trackPoint(
      2.5,
      corridorBottom,
      width,
      height,
    );
    const corridorBottomLeft = this.trackPoint(
      -0.5,
      corridorBottom,
      width,
      height,
    );

    context.save();
    context.fillStyle = "rgba(0, 7, 5, 0.27)";
    context.beginPath();
    context.moveTo(corridorLeft.x, corridorLeft.y);
    context.lineTo(corridorRight.x, corridorRight.y);
    context.lineTo(corridorBottomRight.x, corridorBottomRight.y);
    context.lineTo(corridorBottomLeft.x, corridorBottomLeft.y);
    context.closePath();
    context.fill();

    context.lineCap = "round";
    context.lineJoin = "round";
    context.shadowColor = "rgba(25, 209, 132, 0.42)";
    context.shadowBlur = Math.max(5, width * 0.012);
    const corridorLineWidth = Math.max(2, width / 450);

    for (const [lane, accent] of [
      [-0.5, 0.42],
      [0.5, 0.56],
      [1.5, 0.56],
      [2.5, 0.42],
    ] as const) {
      const start = this.trackPoint(lane, corridorTop, width, height);
      const end = this.trackPoint(lane, corridorBottom, width, height);
      const laneGradient = context.createLinearGradient(
        start.x,
        start.y,
        end.x,
        end.y,
      );
      laneGradient.addColorStop(0, "rgba(25,209,132,0.16)");
      laneGradient.addColorStop(0.42, "rgba(25,209,132,0.28)");
      laneGradient.addColorStop(1, `rgba(25,209,132,${accent + speedProgress * 0.06})`);
      context.strokeStyle = laneGradient;
      context.lineWidth = corridorLineWidth;
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
    context.restore();

    const particleSpeed = moving ? 18 + difficulty.speed * 165 : 7;
    const particleCount = 24 + Math.round(speedProgress * 10);
    for (let index = 0; index < particleCount; index += 1) {
      const seed = index * 47.13;
      const x = ((Math.sin(seed) + 1) / 2) * width;
      const y =
        (seed * 31 + time * particleSpeed * (0.7 + (index % 5) * 0.13)) %
        (height + 40);
      const alpha = 0.12 + (index % 4) * 0.035 + speedProgress * 0.03;
      context.fillStyle = `rgba(214,238,255,${alpha})`;
      context.fillRect(
        x,
        y - 20,
        1 + (index % 2),
        2 + (index % 4) * 2 + speedProgress * 7,
      );
    }

    if (difficulty.level >= 4 && moving) {
      context.strokeStyle = `rgba(191,255,0,${0.045 + speedProgress * 0.045})`;
      for (let index = 0; index < 12; index += 1) {
        const x =
          ((index * 83 + time * (120 + difficulty.speed * 150)) %
            (width + 160)) -
          80;
        context.beginPath();
        context.moveTo(x, height * 0.3);
        context.lineTo(x - 42, height * 0.56);
        context.stroke();
      }
    }

    const readability = context.createLinearGradient(0, 0, 0, height);
    readability.addColorStop(0, "rgba(0,0,0,.16)");
    readability.addColorStop(0.56, "rgba(0,0,0,.08)");
    readability.addColorStop(1, "rgba(0,0,0,.38)");
    context.fillStyle = readability;
    context.fillRect(0, 0, width, height);
  }

  private drawObjects(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
  ) {
    for (const object of this.objects) {
      const point = this.trackPoint(object.lane, object.y, width, height);
      const size = Math.max(8, Math.min(width, height) * 0.049 * point.scale);
      context.save();
      context.translate(point.x, point.y);
      context.lineWidth = Math.max(1.5, size * 0.075);

      if (object.kind === "shield") {
        context.rotate(time * 0.8 + object.id);
        context.shadowColor = "#BFFF00";
        context.shadowBlur = size * 0.8;
        context.strokeStyle = "#BFFF00";
        context.fillStyle = "rgba(191,255,0,.08)";
        context.beginPath();
        for (let edge = 0; edge < 6; edge += 1) {
          const angle = -Math.PI / 2 + edge * (Math.PI / 3);
          const x = Math.cos(angle) * size * 0.72;
          const y = Math.sin(angle) * size * 0.72;
          if (edge === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.closePath();
        context.fill();
        context.stroke();
        context.beginPath();
        context.arc(0, 0, size * 0.24, 0, Math.PI * 2);
        context.fillStyle = "#BFFF00";
        context.fill();
        context.rotate(-(time * 0.8 + object.id));
        context.strokeStyle = "rgba(255,255,255,.72)";
        context.lineWidth = Math.max(1, size * 0.045);
        context.beginPath();
        context.arc(0, 0, size * 0.42, 0, Math.PI * 2);
        context.stroke();
        context.restore();
        continue;
      }

      const frameSize = size * 1.58;
      context.shadowColor = "rgba(255,70,98,.62)";
      context.shadowBlur = size * 0.42;
      context.fillStyle = "rgba(3,5,5,.84)";
      context.strokeStyle = "rgba(255,104,126,.72)";
      context.lineWidth = Math.max(1.25, size * 0.055);
      context.beginPath();
      context.roundRect(
        -frameSize / 2,
        -frameSize / 2,
        frameSize,
        frameSize,
        size * 0.22,
      );
      context.fill();
      context.stroke();

      if (
        this.logoImage &&
        this.logoImage.complete &&
        this.logoImage.naturalWidth > 0
      ) {
        const ratio =
          this.logoImage.naturalWidth / this.logoImage.naturalHeight;
        const maxDimension = frameSize * 0.88;
        const drawWidth = ratio >= 1 ? maxDimension : maxDimension * ratio;
        const drawHeight = ratio >= 1 ? maxDimension / ratio : maxDimension;
        context.save();
        context.beginPath();
        context.roundRect(
          -frameSize * 0.44,
          -frameSize * 0.44,
          frameSize * 0.88,
          frameSize * 0.88,
          size * 0.16,
        );
        context.clip();
        context.shadowBlur = 0;
        context.drawImage(
          this.logoImage,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight,
        );
        context.restore();
      }
      context.restore();
    }
  }

  private drawPlayer(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
  ) {
    const point = this.trackPoint(this.displayLane, PLAYER_Y, width, height);
    const size = Math.min(width, height) * 0.072;
    const floatY = Math.sin(time * 3.2) * size * 0.08;
    context.save();
    context.translate(point.x, point.y + floatY);

    for (let index = 4; index > 0; index -= 1) {
      context.fillStyle = `rgba(25,209,132,${0.018 * (5 - index)})`;
      context.beginPath();
      context.ellipse(
        0,
        size * (0.78 + index * 0.36),
        size * (0.52 - index * 0.045),
        size * 0.18,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
    }

    const shieldState = this.getShieldState();
    if (shieldState === "active") {
      context.strokeStyle = "rgba(191,255,0,.82)";
      context.lineWidth = 2.5;
      context.shadowColor = "#BFFF00";
      context.shadowBlur = 24;
      context.beginPath();
      context.arc(0, 0, size * (1.28 + Math.sin(time * 5) * 0.05), 0, Math.PI * 2);
      context.stroke();
    }

    const frameSize = size * 1.62;
    context.shadowColor = "#19D184";
    context.shadowBlur = 18;
    context.fillStyle = "rgba(1,16,10,.92)";
    context.strokeStyle = "rgba(25,209,132,.9)";
    context.lineWidth = Math.max(1.5, size * 0.055);
    context.beginPath();
    context.roundRect(
      -frameSize / 2,
      -frameSize / 2,
      frameSize,
      frameSize,
      size * 0.24,
    );
    context.fill();
    context.stroke();

    context.save();
    context.beginPath();
    context.roundRect(
      -frameSize * 0.44,
      -frameSize * 0.44,
      frameSize * 0.88,
      frameSize * 0.88,
      size * 0.17,
    );
    context.clip();
    context.shadowBlur = 0;

    if (
      this.logoImage &&
      this.logoImage.complete &&
      this.logoImage.naturalWidth > 0
    ) {
      const ratio =
        this.logoImage.naturalWidth / this.logoImage.naturalHeight;
      const maxDimension = frameSize * 0.88;
      const drawWidth = ratio >= 1 ? maxDimension : maxDimension * ratio;
      const drawHeight = ratio >= 1 ? maxDimension / ratio : maxDimension;
      context.drawImage(
        this.logoImage,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight,
      );
    }
    context.restore();

    context.shadowColor = "#19D184";
    context.shadowBlur = 12;
    context.strokeStyle = "rgba(25,209,132,.56)";
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(
      0,
      size * 0.98,
      size * (0.64 + Math.sin(time * 4.2) * 0.03),
      size * 0.13,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
  }

  private drawParticles(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) {
    for (const particle of this.particles) {
      const point = this.trackPoint(particle.x, particle.y, width, height);
      context.globalAlpha = Math.min(1, particle.life * 2);
      context.fillStyle = particle.color;
      context.fillRect(point.x - 2, point.y - 2, 4, 4);
    }
    context.globalAlpha = 1;
  }
}
