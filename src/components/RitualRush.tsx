"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { WalletControl } from "@/components/WalletControl";
import { Modal } from "@/components/Modal";
import {
  OnchainHistoryPanel,
  OnchainScorePanel,
} from "@/components/OnchainScorePanel";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  achievementPercent,
  emptyAchievementStore,
  evaluateRunAchievements,
  readAchievementStore,
  type AchievementDefinition,
  type AchievementProgress,
  type AchievementStore,
} from "@/features/achievements/achievements";
import {
  generateGuestNickname,
  validateNickname,
} from "@/features/profile/nickname";
import { shareOnX } from "@/features/sharing/sharing";
import { ritualAudio } from "@/features/settings/audio";
import {
  emptyLifetimeStats,
  readLifetimeStats,
  recordCompletedRun,
  type LifetimeStats,
} from "@/features/stats/stats";
import { GameEngine } from "@/game/engine/GameEngine";
import type {
  GameSnapshot,
  RunResult,
} from "@/game/engine/types";
import {
  readJson,
  writeJson,
} from "@/lib/storage";

const PROFILE_KEY = "ritual-rush:profile:v1";
const BEST_KEY = "ritual-rush:best:v1";
const SETTINGS_KEY = "ritual-rush:settings:v1";

type Panel = "achievements" | "profile" | "onchain" | null;

const EMPTY_SNAPSHOT: GameSnapshot = {
  status: "idle",
  score: 0,
  distance: 0,
  bestScore: 0,
  lane: 1,
  displayLane: 1,
  speedLevel: 1,
  multiplier: 1,
  shield: "none",
  shieldSeconds: 0,
  shieldsCollected: 0,
  shieldUsed: false,
  closeCall: false,
  elapsedSeconds: 0,
  laneMoves: 0,
  nearMisses: 0,
  stationaryPasses: 0,
};

interface StoredProfile {
  identityId: string;
  nickname: string;
}

interface Settings {
  music: boolean;
}

function makeIdentityId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `guest:${crypto.randomUUID()}`;
  }
  return `guest:${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function formatScore(score: number) {
  return Math.floor(score).toLocaleString("en-US");
}

function AchievementCard({
  definition,
  progress,
  bestScore,
}: {
  definition: AchievementDefinition;
  progress: AchievementProgress;
  bestScore: number;
}) {
  const unlocked = Boolean(progress.unlockedAt);
  const hiddenLocked = Boolean(definition.hidden && !unlocked);
  const name = hiddenLocked ? "???" : definition.name;
  const description = hiddenLocked
    ? "Unlock this secret challenge to reveal it."
    : definition.description;
  const percent = hiddenLocked
    ? 0
    : achievementPercent(definition, progress);

  return (
    <article
      className={`achievement-card ${unlocked ? "is-unlocked" : ""} ${hiddenLocked ? "is-hidden" : ""}`}
      tabIndex={0}
      aria-label={
        hiddenLocked
          ? "Hidden achievement, locked"
          : `${definition.name}, ${unlocked ? "unlocked" : "locked"}`
      }
    >
      <div className="badge-glyph" aria-hidden="true">
        {hiddenLocked ? "?" : definition.glyph}
      </div>
      <div className="achievement-card-copy">
        <span>{unlocked ? "Unlocked" : hiddenLocked ? "Secret" : "Locked"}</span>
        <h4>{name}</h4>
        <div className="achievement-details">
          <p>{description}</p>
          <div
            className="achievement-progress"
            role="progressbar"
            aria-label={hiddenLocked ? "Hidden progress" : `${name} progress`}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${percent}%` }} />
          </div>
          <small>
            {unlocked
              ? `Unlocked ${new Date(progress.unlockedAt!).toLocaleDateString()}`
              : hiddenLocked
                ? "Secret objective"
                : `${progress.progress.toLocaleString()} / ${definition.target.toLocaleString()}`}
          </small>
          {unlocked && (
            <button type="button" onClick={() => shareOnX(bestScore)}>
              Share achievement
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function RitualRush() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const bestRef = useRef(0);
  const resultHandlerRef = useRef<(result: RunResult) => void>(() => {});
  const touchStartRef = useRef<number | null>(null);
  const accelerationTimerRef = useRef<number | null>(null);
  const lastGameOverAtRef = useRef(0);
  const immediateRestartRef = useRef(false);

  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [bestScore, setBestScore] = useState(0);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [achievements, setAchievements] = useState<AchievementStore>(
    emptyAchievementStore,
  );
  const [stats, setStats] = useState<LifetimeStats>(emptyLifetimeStats);
  const [unlocked, setUnlocked] = useState<AchievementDefinition[]>([]);
  const [achievementQueue, setAchievementQueue] = useState<
    AchievementDefinition[]
  >([]);
  const [profile, setProfile] = useState<StoredProfile>({
    identityId: "guest:pending",
    nickname: "Guest-0000",
  });
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [, setWalletAddress] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>({ music: true });
  const [accelerationLevel, setAccelerationLevel] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const storedBest = readJson<number>(BEST_KEY, 0);
    const storedProfile = readJson<StoredProfile | null>(PROFILE_KEY, null);
    const nextProfile =
      storedProfile &&
      typeof storedProfile.identityId === "string" &&
      typeof storedProfile.nickname === "string"
        ? storedProfile
        : {
            identityId: makeIdentityId(),
            nickname: generateGuestNickname(),
          };
    const storedSettings = readJson<Partial<Settings>>(SETTINGS_KEY, {});
    bestRef.current = Number.isFinite(storedBest) ? Math.max(0, storedBest) : 0;
    setBestScore(bestRef.current);
    setProfile(nextProfile);
    setNicknameDraft(nextProfile.nickname);
    setSettings({ music: storedSettings.music !== false });
    setAchievements(readAchievementStore());
    setStats(readLifetimeStats());
    writeJson(PROFILE_KEY, nextProfile);
  }, []);

  useEffect(() => {
    ritualAudio.configure(settings.music);
    writeJson(SETTINGS_KEY, settings);
  }, [settings]);

  useEffect(() => {
    if (achievementQueue.length === 0) return;
    const timer = window.setTimeout(() => {
      setAchievementQueue((queue) => queue.slice(1));
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [achievementQueue]);

  useEffect(() => {
    const engine = new GameEngine({
      onSnapshot: setSnapshot,
      onGameOver: (result) => resultHandlerRef.current(result),
      onAcceleration: (level) => {
        if (accelerationTimerRef.current !== null) {
          window.clearTimeout(accelerationTimerRef.current);
        }
        setAccelerationLevel(level);
        accelerationTimerRef.current = window.setTimeout(() => {
          setAccelerationLevel(null);
          accelerationTimerRef.current = null;
        }, 1050);
      },
      getBestScore: () => bestRef.current,
    });
    engineRef.current = engine;
    if (canvasRef.current) engine.attach(canvasRef.current);
    const resize = () => engine.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (accelerationTimerRef.current !== null) {
        window.clearTimeout(accelerationTimerRef.current);
      }
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleGameOver = useCallback(
    (result: RunResult) => {
      const completedAt = new Date(result.completedAt);
      lastGameOverAtRef.current = Date.now();
      if (accelerationTimerRef.current !== null) {
        window.clearTimeout(accelerationTimerRef.current);
        accelerationTimerRef.current = null;
      }
      setAccelerationLevel(null);
      if (result.isNewBest) {
        bestRef.current = result.score;
        setBestScore(result.score);
        writeJson(BEST_KEY, result.score);
      }
      const nextStats = recordCompletedRun(stats, result, completedAt);
      setStats(nextStats);
      const evaluated = evaluateRunAchievements(achievements, {
        score: result.score,
        shieldsCollected: result.shieldsCollected,
        shieldUsed: result.shieldUsed,
        closeCall: result.closeCall,
        dailyRank: null,
        elapsedSeconds: result.elapsedSeconds,
        speedLevel: result.speedLevel,
        laneMoves: result.laneMoves,
        nearMisses: result.nearMisses,
        stationaryPasses: result.stationaryPasses,
        immediateRestart: immediateRestartRef.current,
        date: completedAt,
      }, nextStats);
      setAchievements(evaluated.store);
      setUnlocked(evaluated.unlocked);
      setAchievementQueue((queue) => [...queue, ...evaluated.unlocked]);
      setRunResult(result);
    },
    [
      achievements,
      stats,
    ],
  );

  useEffect(() => {
    resultHandlerRef.current = (result) => {
      void handleGameOver(result);
    };
  }, [handleGameOver]);

  const startRun = useCallback(() => {
    ritualAudio.unlock();
    immediateRestartRef.current =
      lastGameOverAtRef.current > 0 &&
      Date.now() - lastGameOverAtRef.current <= 12_000;
    lastGameOverAtRef.current = 0;
    if (accelerationTimerRef.current !== null) {
      window.clearTimeout(accelerationTimerRef.current);
      accelerationTimerRef.current = null;
    }
    setAccelerationLevel(null);
    setRunResult(null);
    setUnlocked([]);
    setPanel(null);
    engineRef.current?.start();
  }, []);

  const togglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }
      if (
        ["ArrowLeft", "ArrowRight", " ", "Escape"].includes(event.key) ||
        ["a", "d", "p"].includes(event.key.toLowerCase())
      ) {
        event.preventDefault();
      }
      if (panel) return;
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        engineRef.current?.move(-1);
      } else if (
        event.key === "ArrowRight" ||
        event.key.toLowerCase() === "d"
      ) {
        engineRef.current?.move(1);
      } else if (
        event.key === "Escape" ||
        event.key.toLowerCase() === "p"
      ) {
        togglePause();
      } else if (
        (event.key === "Enter" || event.key === " ") &&
        (snapshot.status === "idle" || snapshot.status === "gameover")
      ) {
        startRun();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [panel, snapshot.status, startRun, togglePause]);

  useEffect(() => {
    const autoPause = () => {
      if (document.hidden || !document.hasFocus()) {
        engineRef.current?.pause();
        ritualAudio.setVisible(false);
      } else {
        ritualAudio.setVisible(true);
      }
    };
    document.addEventListener("visibilitychange", autoPause);
    window.addEventListener("blur", autoPause);
    window.addEventListener("focus", autoPause);
    return () => {
      document.removeEventListener("visibilitychange", autoPause);
      window.removeEventListener("blur", autoPause);
      window.removeEventListener("focus", autoPause);
    };
  }, []);

  const openPanel = (next: Exclude<Panel, null>) => {
    if (snapshot.status === "playing") engineRef.current?.pause();
    setPanel(next);
  };

  const saveNickname = () => {
    const result = validateNickname(nicknameDraft);
    if (!result.ok) {
      setNicknameError(result.error ?? "Choose another nickname.");
      return;
    }
    const next = { ...profile, nickname: result.value };
    setProfile(next);
    setNicknameDraft(result.value);
    setNicknameError("");
    writeJson(PROFILE_KEY, next);
    setPanel(null);
  };

  const returnToMenu = () => {
    engineRef.current?.resetToIdle();
    lastGameOverAtRef.current = 0;
    immediateRestartRef.current = false;
    setRunResult(null);
    setUnlocked([]);
  };

  const shieldLabel =
    snapshot.shield === "active"
      ? `Active ${snapshot.shieldSeconds.toFixed(1)}s`
      : snapshot.shield[0].toUpperCase() + snapshot.shield.slice(1);
  const completedAchievements = ACHIEVEMENTS.filter(
    (definition) => achievements.progress[definition.id].unlockedAt,
  ).length;
  const completionPercent = Math.round(
    (completedAchievements / ACHIEVEMENTS.length) * 100,
  );
  const achievementToast = achievementQueue[0] ?? null;
  const lifetimeStatItems = [
    { label: "Total Games Played", value: formatScore(stats.totalGames) },
    {
      label: "Highest Score",
      value: formatScore(Math.max(stats.highestScore, bestScore)),
    },
    {
      label: "Total Shields Collected",
      value: formatScore(stats.totalShieldsCollected),
    },
    {
      label: "Total Distance Survived",
      value: `${formatScore(stats.totalDistance)} m`,
    },
    { label: "Best Speed Level", value: `Level ${stats.bestSpeedLevel}` },
    {
      label: "Achievements Completed",
      value: `${completedAchievements} / ${ACHIEVEMENTS.length}`,
    },
  ];

  return (
    <div
      className={`rush-shell rush-shell--${snapshot.status}`}
      onTouchStart={(event) => {
        touchStartRef.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartRef.current === null) return;
        const end = event.changedTouches[0]?.clientX ?? touchStartRef.current;
        const delta = end - touchStartRef.current;
        touchStartRef.current = null;
        if (Math.abs(delta) > 34) engineRef.current?.move(delta < 0 ? -1 : 1);
      }}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="Three-lane endless runner. Move the Ritual logo left and right to avoid falling Ritual logos and collect energy shields."
      >
        Ritual Rush is a three-lane arcade game. Move the Ritual logo left and
        right to avoid obstacles.
      </canvas>

      <div className="scanlines" aria-hidden="true" />

      {accelerationLevel !== null && snapshot.status === "playing" && (
        <div className="speed-notice" role="status" aria-live="polite">
          <span>SPEED UP</span>
          <strong>Level {accelerationLevel}</strong>
        </div>
      )}

      {achievementToast && (
        <aside
          className="achievement-toast"
          role="status"
          aria-live="polite"
          key={achievementToast.id}
        >
          <span className="achievement-toast-icon" aria-hidden="true">
            {achievementToast.glyph}
          </span>
          <div>
            <small>Achievement Unlocked</small>
            <strong>{achievementToast.name}</strong>
          </div>
        </aside>
      )}

      {(snapshot.status === "playing" || snapshot.status === "paused") && (
        <header className="hud" aria-label="Game status">
          <div className="hud-score">
            <span>Score</span>
            <strong>{formatScore(snapshot.score)}</strong>
            <small>
              Best {formatScore(Math.max(bestScore, snapshot.score))}
            </small>
          </div>
          <div className="hud-center">
            <span className={`shield-state shield-state--${snapshot.shield}`}>
              <i aria-hidden="true">◈</i> Shield: {shieldLabel}
            </span>
          </div>
          <button
            className="icon-button hud-pause"
            type="button"
            onClick={togglePause}
            aria-label={snapshot.status === "paused" ? "Resume game" : "Pause game"}
          >
            {snapshot.status === "paused" ? "▶" : "Ⅱ"}
          </button>
        </header>
      )}

      {snapshot.status === "idle" && (
        <section className="menu-layer" aria-labelledby="game-title">
          <header className="credits-bar" aria-label="Game credits">
            <span>
              Powered by <strong>Ritual</strong>
            </span>
            <span>
              Created by <strong>Bien</strong>
            </span>
          </header>
          <div className="menu-content">
            <h1 id="game-title">
              RITUAL
              <span>RUSH</span>
            </h1>

            <button className="primary-cta" type="button" onClick={startRun}>
              <span>Start Rush</span>
              <kbd>Enter</kbd>
            </button>

            <div className="menu-actions">
              <button
                className="outline-button"
                type="button"
                onClick={() => openPanel("onchain")}
              >
                <span aria-hidden="true">↗</span> Onchain Leaderboard
              </button>
              <button
                className="outline-button"
                type="button"
                onClick={() => openPanel("achievements")}
              >
                <span aria-hidden="true">◇</span> Achievements
              </button>
            </div>

            <WalletControl onIdentity={setWalletAddress} />
          </div>

          <aside className="menu-side">
            <div className="identity-card">
              <div>
                <p className="data-label">Current runner</p>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => openPanel("profile")}
                >
                  {profile.nickname} <span aria-hidden="true">✎</span>
                </button>
              </div>
              <div className="best-readout">
                <p className="data-label">Personal best</p>
                <strong>{formatScore(bestScore)}</strong>
                <small>Local browser record</small>
              </div>
            </div>
            <div className="controls-guide">
              <p className="data-label">Controls</p>
              <div>
                <span>
                  <kbd>A</kbd>
                  <kbd>←</kbd> Move left
                </span>
                <span>
                  <kbd>D</kbd>
                  <kbd>→</kbd> Move right
                </span>
              </div>
            </div>
            <div className="settings-row">
              <button
                className={`toggle-chip ${settings.music ? "is-on" : ""}`}
                type="button"
                aria-pressed={settings.music}
                onClick={() =>
                  setSettings((value) => ({
                    ...value,
                    music: !value.music,
                  }))
                }
              >
                MUSIC {settings.music ? "ON" : "OFF"}
              </button>
            </div>
          </aside>
        </section>
      )}

      {snapshot.status === "paused" && (
        <section className="center-overlay paused-overlay" aria-label="Game paused">
          <p className="eyebrow">Run paused</p>
          <h2>Paused</h2>
          <p>Resume when ready.</p>
          <button className="primary-cta primary-cta--compact" onClick={togglePause}>
            Resume Rush
          </button>
          <button className="text-button" type="button" onClick={returnToMenu}>
            Return to menu
          </button>
        </section>
      )}

      {snapshot.status === "gameover" && runResult && (
        <section className="results-layer" aria-labelledby="failure-title">
          <div className="results-main">
            <p className="eyebrow">Run complete</p>
            <h2 id="failure-title">Game Over</h2>
            {runResult.isNewBest && (
              <p className="new-best">
                <span aria-hidden="true">◆</span> New personal best
              </p>
            )}
            <div className="result-stats">
              <div>
                <span>Final score</span>
                <strong>{formatScore(runResult.score)}</strong>
              </div>
              <div>
                <span>Personal best</span>
                <strong>{formatScore(runResult.bestScore)}</strong>
              </div>
            </div>
            {unlocked.length > 0 && (
              <div className="unlock-banner" role="status">
                <span aria-hidden="true">{unlocked[0]?.glyph}</span>
                <div>
                  <small>Achievement unlocked</small>
                  <strong>{unlocked[0]?.name}</strong>
                </div>
              </div>
            )}
            <div className="results-actions">
              <button className="primary-cta primary-cta--compact" onClick={startRun}>
                Play Again
              </button>
              <button
                className="outline-button"
                onClick={() => shareOnX(runResult.score)}
              >
                Share on X
              </button>
              <button
                className="outline-button"
                onClick={() => openPanel("onchain")}
              >
                Onchain Leaderboard
              </button>
              <button className="text-button" onClick={returnToMenu}>
                Menu
              </button>
            </div>
          </div>
          <OnchainScorePanel
            result={runResult}
            nickname={profile.nickname}
            personalBest={Math.max(bestScore, runResult.bestScore)}
            unlocked={unlocked}
            onWalletConnected={setWalletAddress}
            onExit={returnToMenu}
          />
        </section>
      )}

      {(snapshot.status === "playing" || snapshot.status === "paused") && (
        <div className="mobile-controls" aria-label="Touch game controls">
          <button
            type="button"
            onPointerDown={() => engineRef.current?.move(-1)}
            aria-label="Move left"
          >
            ←
          </button>
          <button
            className="mobile-pause"
            type="button"
            onClick={togglePause}
            aria-label={snapshot.status === "paused" ? "Resume game" : "Pause game"}
          >
            {snapshot.status === "paused" ? "▶" : "Ⅱ"}
          </button>
          <button
            type="button"
            onPointerDown={() => engineRef.current?.move(1)}
            aria-label="Move right"
          >
            →
          </button>
        </div>
      )}

      {panel === "profile" && (
        <Modal
          title="Runner Identity"
          eyebrow="Local profile"
          onClose={() => setPanel(null)}
        >
          <div className="profile-form">
            <label htmlFor="nickname">Nickname</label>
            <input
              id="nickname"
              value={nicknameDraft}
              onChange={(event) => {
                setNicknameDraft(event.target.value);
                setNicknameError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveNickname();
              }}
              aria-describedby="nickname-error"
            />
            <div className="field-meta">
              <span id="nickname-error" role="status">
                {nicknameError}
              </span>
              <span>{nicknameDraft.length} characters</span>
            </div>
            <button className="primary-cta primary-cta--compact" onClick={saveNickname}>
              Save identity
            </button>
          </div>
        </Modal>
      )}

      {panel === "achievements" && (
        <Modal
          title="Achievements"
          eyebrow="Progress archive"
          className="achievement-modal"
          onClose={() => setPanel(null)}
        >
          <div className="achievement-hub">
            <section className="achievement-overview" aria-label="Achievement completion">
              <div>
                <span>Overall completion</span>
                <strong>
                  {completedAchievements} / {ACHIEVEMENTS.length}
                </strong>
              </div>
              <div
                className="completion-track"
                role="progressbar"
                aria-label="Overall achievement completion"
                aria-valuenow={completionPercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <i style={{ width: `${completionPercent}%` }} />
              </div>
              <b>{completionPercent}%</b>
            </section>

            <section className="lifetime-stats" aria-labelledby="stats-title">
              <header>
                <span>Local progression</span>
                <h3 id="stats-title">Lifetime Stats</h3>
              </header>
              <div className="lifetime-stats-grid">
                {lifetimeStatItems.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </section>

            <div className="achievement-categories">
              {ACHIEVEMENT_CATEGORIES.map((category) => {
                const definitions = ACHIEVEMENTS.filter(
                  (definition) => definition.category === category.id,
                );
                const categoryCompleted = definitions.filter(
                  (definition) =>
                    achievements.progress[definition.id].unlockedAt,
                ).length;
                return (
                  <section
                    className="achievement-category"
                    key={category.id}
                    aria-labelledby={`achievement-category-${category.id}`}
                  >
                    <header>
                      <h3 id={`achievement-category-${category.id}`}>
                        {category.label}
                      </h3>
                      <span>
                        {categoryCompleted} / {definitions.length}
                      </span>
                    </header>
                    <div className="achievement-grid">
                      {definitions.map((definition) => (
                        <AchievementCard
                          definition={definition}
                          progress={achievements.progress[definition.id]}
                          bestScore={bestScore}
                          key={definition.id}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {panel === "onchain" && (
        <Modal
          title="YOUR RECORD SCORE IN RITUAL RUSH"
          eyebrow="Live onchain leaderboard"
          onClose={() => setPanel(null)}
        >
          <OnchainHistoryPanel />
          <p className="modal-note">
            Public records show scores submitted through connected wallets.
            Each transaction link opens the Ritual Explorer. They do not make
            browser gameplay cheat-proof.
          </p>
        </Modal>
      )}
    </div>
  );
}
