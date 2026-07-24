import type { LifetimeStats } from "@/features/stats/stats";
import { readJson, utcDateKey, writeJson } from "@/lib/storage";

export type AchievementCategory =
  | "getting-started"
  | "score-milestones"
  | "shield-mastery"
  | "speed-challenges"
  | "daily-challenges"
  | "leaderboard"
  | "skill-challenges"
  | "hidden-achievements";

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  glyph: string;
  target: number;
  hidden?: boolean;
}

export const ACHIEVEMENT_CATEGORIES: Array<{
  id: AchievementCategory;
  label: string;
}> = [
  { id: "getting-started", label: "Getting Started" },
  { id: "score-milestones", label: "Score Milestones" },
  { id: "shield-mastery", label: "Shield Mastery" },
  { id: "speed-challenges", label: "Speed Challenges" },
  { id: "daily-challenges", label: "Daily Challenges" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "skill-challenges", label: "Skill Challenges" },
  { id: "hidden-achievements", label: "Hidden Achievements" },
];

export const ACHIEVEMENTS = [
  {
    id: "first-steps",
    category: "getting-started",
    name: "First Steps",
    description: "Play your first game.",
    glyph: "◇",
    target: 1,
  },
  {
    id: "one-more-run",
    category: "getting-started",
    name: "One More Run",
    description: "Restart immediately after a Game Over.",
    glyph: "↻",
    target: 1,
  },
  {
    id: "persistent",
    category: "getting-started",
    name: "Persistent",
    description: "Return and play again on another day.",
    glyph: "◷",
    target: 1,
  },
  {
    id: "rookie-runner",
    category: "score-milestones",
    name: "Rookie Runner",
    description: "Reach 100 score.",
    glyph: "01",
    target: 100,
  },
  {
    id: "getting-faster",
    category: "score-milestones",
    name: "Getting Faster",
    description: "Reach 500 score.",
    glyph: "02",
    target: 500,
  },
  {
    id: "network-survivor",
    category: "score-milestones",
    name: "Network Survivor",
    description: "Reach 1,000 score.",
    glyph: "⬡",
    target: 1000,
  },
  {
    id: "signal-keeper",
    category: "score-milestones",
    name: "Signal Keeper",
    description: "Reach 2,500 score.",
    glyph: "⌁",
    target: 2500,
  },
  {
    id: "inference-runner",
    category: "score-milestones",
    name: "Inference Runner",
    description: "Reach 5,000 score.",
    glyph: "⇄",
    target: 5000,
  },
  {
    id: "autonomous-mind",
    category: "score-milestones",
    name: "Autonomous Mind",
    description: "Reach 7,500 score.",
    glyph: "◉",
    target: 7500,
  },
  {
    id: "unstoppable-agent",
    category: "score-milestones",
    name: "Unstoppable Agent",
    description: "Reach 10,000 score.",
    glyph: "▣",
    target: 10000,
  },
  {
    id: "ritual-veteran",
    category: "score-milestones",
    name: "Ritual Veteran",
    description: "Reach 20,000 score.",
    glyph: "◆",
    target: 20000,
  },
  {
    id: "genesis-legend",
    category: "score-milestones",
    name: "Genesis Legend",
    description: "Reach 50,000 score.",
    glyph: "✦",
    target: 50000,
  },
  {
    id: "shield-master",
    category: "shield-mastery",
    name: "Shield Master",
    description: "Collect five shields in one run.",
    glyph: "◈",
    target: 5,
  },
  {
    id: "shield-collector",
    category: "shield-mastery",
    name: "Shield Collector",
    description: "Collect 25 shields overall.",
    glyph: "⬢",
    target: 25,
  },
  {
    id: "guardian",
    category: "shield-mastery",
    name: "Guardian",
    description: "Collect 100 shields overall.",
    glyph: "⬣",
    target: 100,
  },
  {
    id: "lucky-escape",
    category: "shield-mastery",
    name: "Lucky Escape",
    description: "Survive one collision using a shield.",
    glyph: "✧",
    target: 1,
  },
  {
    id: "speed-demon",
    category: "speed-challenges",
    name: "Speed Demon",
    description: "Reach Speed Level 5.",
    glyph: "»",
    target: 5,
  },
  {
    id: "hyper-runner",
    category: "speed-challenges",
    name: "Hyper Runner",
    description: "Reach Speed Level 10.",
    glyph: "≫",
    target: 10,
  },
  {
    id: "marathon",
    category: "speed-challenges",
    name: "Marathon",
    description: "Survive for 10 minutes.",
    glyph: "∞",
    target: 600,
  },
  {
    id: "endless-mind",
    category: "speed-challenges",
    name: "Endless Mind",
    description: "Survive for 20 minutes.",
    glyph: "∞+",
    target: 1200,
  },
  {
    id: "daily-challenger",
    category: "daily-challenges",
    name: "Daily Challenger",
    description: "Submit a score on three different UTC days.",
    glyph: "◌",
    target: 3,
  },
  {
    id: "consistent-runner",
    category: "daily-challenges",
    name: "Consistent Runner",
    description: "Play 25 total games.",
    glyph: "25",
    target: 25,
  },
  {
    id: "ritual-addict",
    category: "daily-challenges",
    name: "Ritual Addict",
    description: "Play 100 total games.",
    glyph: "100",
    target: 100,
  },
  {
    id: "top-agent",
    category: "leaderboard",
    name: "Top Agent",
    description: "Finish inside the Daily Top 10.",
    glyph: "△",
    target: 1,
  },
  {
    id: "top-three",
    category: "leaderboard",
    name: "Top 3",
    description: "Finish inside the Daily Top 3.",
    glyph: "▲",
    target: 1,
  },
  {
    id: "champion",
    category: "leaderboard",
    name: "Champion",
    description: "Reach Rank #1.",
    glyph: "♛",
    target: 1,
  },
  {
    id: "close-call",
    category: "skill-challenges",
    name: "Close Call",
    description: "Barely avoid an incoming Ritual logo.",
    glyph: "⌁",
    target: 1,
  },
  {
    id: "thread-the-needle",
    category: "skill-challenges",
    name: "Thread the Needle",
    description: "Pass three consecutive hazards without changing lanes.",
    glyph: "↥",
    target: 3,
  },
  {
    id: "perfectionist",
    category: "skill-challenges",
    name: "Perfectionist",
    description: "Reach 5,000 without collecting a shield.",
    glyph: "⊘",
    target: 5000,
  },
  {
    id: "untouchable",
    category: "skill-challenges",
    name: "Untouchable",
    description: "Reach 10,000 without taking any damage.",
    glyph: "◎",
    target: 10000,
  },
  {
    id: "ghost-runner",
    category: "hidden-achievements",
    name: "Ghost Runner",
    description: "Survive for one minute without changing lanes.",
    glyph: "◍",
    target: 60,
    hidden: true,
  },
  {
    id: "lucky-seven",
    category: "hidden-achievements",
    name: "Lucky Seven",
    description: "Collect seven shields in one run.",
    glyph: "7",
    target: 7,
    hidden: true,
  },
  {
    id: "survivor-instinct",
    category: "hidden-achievements",
    name: "Survivor Instinct",
    description: "Escape five near-collisions in one game.",
    glyph: "!",
    target: 5,
    hidden: true,
  },
  {
    id: "night-shift",
    category: "hidden-achievements",
    name: "Night Shift",
    description: "Play during late-night hours.",
    glyph: "☾",
    target: 1,
    hidden: true,
  },
  {
    id: "ritual-obsession",
    category: "hidden-achievements",
    name: "Ritual Obsession",
    description: "Play 50 games in total.",
    glyph: "50",
    target: 50,
    hidden: true,
  },
] as const satisfies readonly AchievementDefinition[];

export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"];

export interface AchievementProgress {
  id: AchievementId;
  progress: number;
  unlockedAt?: string;
}

export interface AchievementStore {
  progress: Record<AchievementId, AchievementProgress>;
  playedDays: string[];
}

export interface RunAchievementInput {
  score: number;
  shieldsCollected: number;
  shieldUsed: boolean;
  closeCall: boolean;
  dailyRank: number | null;
  elapsedSeconds: number;
  speedLevel: number;
  laneMoves: number;
  nearMisses: number;
  stationaryPasses: number;
  immediateRestart?: boolean;
  date?: Date;
}

const STORAGE_KEY = "ritual-rush:achievements:v1";

export function emptyAchievementStore(): AchievementStore {
  return {
    progress: Object.fromEntries(
      ACHIEVEMENTS.map((item) => [
        item.id,
        { id: item.id, progress: 0 },
      ]),
    ) as Record<AchievementId, AchievementProgress>,
    playedDays: [],
  };
}

export function readAchievementStore(): AchievementStore {
  const fallback = emptyAchievementStore();
  const stored = readJson<{
    progress?: Record<string, { progress?: number; unlockedAt?: string }>;
    playedDays?: string[];
  } | null>(STORAGE_KEY, null);
  if (!stored?.progress || !Array.isArray(stored.playedDays)) return fallback;

  const aliases: Partial<Record<AchievementId, string[]>> = {
    "first-steps": ["first-rush"],
    perfectionist: ["no-protection"],
  };

  return {
    playedDays: stored.playedDays.filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day)),
    progress: Object.fromEntries(
      ACHIEVEMENTS.map((definition) => {
        const alias = aliases[definition.id]?.find(
          (candidate) => stored.progress?.[candidate],
        );
        const item =
          stored.progress?.[definition.id] ??
          (alias ? stored.progress?.[alias] : undefined);
        return [
          definition.id,
          {
            id: definition.id,
            progress:
              item && Number.isFinite(item.progress)
                ? Math.max(0, item.progress ?? 0)
                : 0,
            unlockedAt:
              item && typeof item.unlockedAt === "string"
                ? item.unlockedAt
                : undefined,
          },
        ];
      }),
    ) as Record<AchievementId, AchievementProgress>,
  };
}

export function evaluateRunAchievements(
  store: AchievementStore,
  run: RunAchievementInput,
  stats: LifetimeStats,
): { store: AchievementStore; unlocked: AchievementDefinition[] } {
  const now = run.date ?? new Date();
  const nowIso = now.toISOString();
  const dayKey = utcDateKey(now);
  const playedDays = Array.from(new Set([...store.playedDays, dayKey])).sort();
  const highestScore = Math.max(stats.highestScore, run.score);

  const values: Record<AchievementId, number> = {
    "first-steps": stats.totalGames,
    "one-more-run": run.immediateRestart ? 1 : 0,
    persistent:
      Boolean(stats.firstPlayedDay && stats.firstPlayedDay !== dayKey) ? 1 : 0,
    "rookie-runner": highestScore,
    "getting-faster": highestScore,
    "network-survivor": highestScore,
    "signal-keeper": highestScore,
    "inference-runner": highestScore,
    "autonomous-mind": highestScore,
    "unstoppable-agent": highestScore,
    "ritual-veteran": highestScore,
    "genesis-legend": highestScore,
    "shield-master": run.shieldsCollected,
    "shield-collector": stats.totalShieldsCollected,
    guardian: stats.totalShieldsCollected,
    "lucky-escape": run.shieldUsed ? 1 : 0,
    "speed-demon": stats.bestSpeedLevel,
    "hyper-runner": stats.bestSpeedLevel,
    marathon: run.elapsedSeconds,
    "endless-mind": run.elapsedSeconds,
    "daily-challenger": playedDays.length,
    "consistent-runner": stats.totalGames,
    "ritual-addict": stats.totalGames,
    "top-agent": run.dailyRank !== null && run.dailyRank <= 10 ? 1 : 0,
    "top-three": run.dailyRank !== null && run.dailyRank <= 3 ? 1 : 0,
    champion: run.dailyRank === 1 ? 1 : 0,
    "close-call": Math.max(run.closeCall ? 1 : 0, run.nearMisses),
    "thread-the-needle": run.stationaryPasses,
    perfectionist: run.shieldsCollected === 0 ? run.score : 0,
    untouchable: run.shieldUsed ? 0 : run.score,
    "ghost-runner": run.laneMoves === 0 ? run.elapsedSeconds : 0,
    "lucky-seven": run.shieldsCollected,
    "survivor-instinct": run.nearMisses,
    "night-shift": now.getHours() >= 22 || now.getHours() < 5 ? 1 : 0,
    "ritual-obsession": stats.totalGames,
  };

  const unlocked: AchievementDefinition[] = [];
  const progress = { ...store.progress };

  for (const definition of ACHIEVEMENTS) {
    const previous = progress[definition.id];
    const nextValue = Math.max(previous.progress, values[definition.id]);
    const justUnlocked =
      !previous.unlockedAt && nextValue >= definition.target;
    progress[definition.id] = {
      id: definition.id,
      progress: Math.min(nextValue, definition.target),
      unlockedAt: previous.unlockedAt ?? (justUnlocked ? nowIso : undefined),
    };
    if (justUnlocked) unlocked.push(definition);
  }

  const next = { progress, playedDays };
  writeJson(STORAGE_KEY, next);
  return { store: next, unlocked };
}

export function achievementPercent(
  definition: AchievementDefinition,
  state: AchievementProgress,
): number {
  return Math.min(100, Math.round((state.progress / definition.target) * 100));
}

