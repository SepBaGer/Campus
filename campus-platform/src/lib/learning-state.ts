import type { AttemptCompletionResult, PortalSnapshot } from "./platform-types";

export function calculateProgressPercent(completedBlocks: number, totalBlocks: number) {
  if (totalBlocks <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((completedBlocks / totalBlocks) * 100)));
}

function toIsoDate(value: string | null | undefined) {
  if (!value) return null;
  return value.includes("T") ? value.slice(0, 10) : value.slice(0, 10);
}

function incrementPortalGamification(snapshot: PortalSnapshot, result: AttemptCompletionResult) {
  const gamification = snapshot.gamification;
  if (!gamification) {
    return gamification;
  }

  const completedAtDate = toIsoDate(result.completedAt);
  const lastActivityOn = toIsoDate(gamification.lastActivityOn);
  const yesterday = completedAtDate
    ? new Date(`${completedAtDate}T00:00:00.000Z`)
    : null;

  if (yesterday) {
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  }

  const previousDay = yesterday ? yesterday.toISOString().slice(0, 10) : null;
  const repeatedDay = Boolean(completedAtDate && lastActivityOn === completedAtDate);
  const continuedStreak = Boolean(completedAtDate && lastActivityOn === previousDay);
  const currentStreakDays = repeatedDay
    ? gamification.currentStreakDays
    : continuedStreak
      ? gamification.currentStreakDays + 1
      : 1;

  return {
    ...gamification,
    completedAttempts: Math.max(gamification.completedAttempts, completedAtDate ? gamification.completedAttempts + (repeatedDay ? 0 : 1) : gamification.completedAttempts),
    totalXp: gamification.totalXp + (result.xpEarned || 0),
    currentStreakDays,
    longestStreakDays: Math.max(gamification.longestStreakDays, currentStreakDays),
    lastActivityOn: completedAtDate || gamification.lastActivityOn,
    rankPosition: gamification.leaderboardOptIn ? gamification.rankPosition : null,
    refreshedAt: result.completedAt
  };
}

export function applyAttemptCompletionToPortalSnapshot(
  snapshot: PortalSnapshot,
  result: AttemptCompletionResult
): PortalSnapshot {
  const totalBlocks = result.mode === "demo"
    ? snapshot.totalBlocks
    : Math.max(result.totalBlocks, snapshot.totalBlocks);
  const completedBlocks = result.mode === "demo"
    ? Math.min(snapshot.completedBlocks + 1, totalBlocks)
    : Math.max(snapshot.completedBlocks, Math.min(result.completedBlocks, totalBlocks));

  const mastery = snapshot.mastery.map((entry) => (
    entry.competencySlug === result.competencySlug
      ? {
          ...entry,
          masteryLevel: result.masteryLevel,
          masteryPercent: result.masteryPercent,
          nextReviewAt: result.nextReviewAt,
          repetitions: result.repetitions,
          intervalDays: result.intervalDays,
          isDue: false
        }
      : entry
  ));

  return {
    ...snapshot,
    completedBlocks,
    totalBlocks,
    progressPercent: calculateProgressPercent(completedBlocks, totalBlocks),
    nextReviewAt: result.nextReviewAt,
    dueReviewsCount: mastery.filter((entry) => entry.isDue).length,
    atRiskLabel: "Ritmo saludable",
    gamification: incrementPortalGamification(snapshot, result),
    mastery
  };
}
