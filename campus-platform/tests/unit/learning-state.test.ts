import { describe, expect, it } from "vitest";
import { applyAttemptCompletionToPortalSnapshot, calculateProgressPercent } from "../../src/lib/learning-state";
import type { AttemptCompletionResult, PortalSnapshot } from "../../src/lib/platform-types";

const baseSnapshot: PortalSnapshot = {
  learnerName: "Sebastian Demo",
  membershipLabel: "Premium pilot entitlement",
  enrolledCourseTitle: "Programa de Empoderamiento en Power Skills",
  activeRunLabel: "Cohorte mayo 2026 abierta",
  completedBlocks: 2,
  totalBlocks: 4,
  progressPercent: 50,
  nextReviewAt: "2026-05-11T14:00:00.000Z",
  dueReviewsCount: 0,
  atRiskLabel: "Ritmo saludable",
  gamification: {
    completedAttempts: 2,
    totalXp: 240,
    currentStreakDays: 2,
    longestStreakDays: 2,
    lastActivityOn: "2026-05-10",
    leaderboardOptIn: true,
    rankPosition: 3,
    participantCount: 4,
    refreshedAt: "2026-05-10T16:00:00.000Z"
  },
  leaderboard: [],
  mastery: [
    {
      competencySlug: "foco-y-autonomia-operativa",
      competencyTitle: "Foco y autonomia operativa",
      bloomLevel: "aplicar",
      bloomLabel: "Aplicar",
      position: 1,
      masteryLevel: 0.5,
      masteryPercent: 50,
      nextReviewAt: "2026-05-11T14:00:00.000Z",
      repetitions: 1,
      intervalDays: 3,
      isDue: false
    }
  ]
};

const baseAttempt: AttemptCompletionResult = {
  mode: "live",
  status: "completed",
  courseSlug: "programa-empoderamiento-power-skills",
  courseTitle: "Programa de Empoderamiento en Power Skills",
  contentBlockId: 103,
  contentBlockTitle: "Deep Research aplicado",
  completedAt: "2026-05-11T16:00:00.000Z",
  xpEarned: 120,
  completedBlocks: 3,
  totalBlocks: 4,
  progressPercent: 75,
  competencySlug: "foco-y-autonomia-operativa",
  competencyTitle: "Foco y autonomia operativa",
  masteryLevel: 0.75,
  masteryPercent: 75,
  nextReviewAt: "2026-05-14T16:00:00.000Z",
  repetitions: 1,
  intervalDays: 3,
  easeFactor: 2.65,
  xapiStatementId: 77,
  credential: null
};

describe("learning state", () => {
  it("caps progress between 0 and 100", () => {
    expect(calculateProgressPercent(3, 4)).toBe(75);
    expect(calculateProgressPercent(5, 4)).toBe(100);
    expect(calculateProgressPercent(0, 0)).toBe(0);
  });

  it("applies live completion snapshots from the backend", () => {
    const updated = applyAttemptCompletionToPortalSnapshot(baseSnapshot, baseAttempt);
    expect(updated.completedBlocks).toBe(3);
    expect(updated.progressPercent).toBe(75);
    expect(updated.nextReviewAt).toBe(baseAttempt.nextReviewAt);
    expect(updated.mastery[0]?.masteryPercent).toBe(75);
    expect(updated.gamification?.totalXp).toBe(360);
  });

  it("increments demo progress locally even without authoritative counts", () => {
    const demoAttempt: AttemptCompletionResult = {
      ...baseAttempt,
      mode: "demo",
      completedBlocks: 1,
      progressPercent: 25
    };

    const updated = applyAttemptCompletionToPortalSnapshot(baseSnapshot, demoAttempt);
    expect(updated.completedBlocks).toBe(3);
    expect(updated.progressPercent).toBe(75);
    expect(updated.gamification?.currentStreakDays).toBe(3);
    expect(updated.gamification?.longestStreakDays).toBe(3);
  });
});
