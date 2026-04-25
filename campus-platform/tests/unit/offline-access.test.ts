import { describe, expect, it } from "vitest";
import { buildOfflineRoutePlan, summarizeOfflineReadiness } from "../../src/lib/offline-access";
import { getDemoCourseSnapshot } from "../../src/lib/platform-data";

describe("offline access helpers", () => {
  it("builds a deduplicated route plan for a course", () => {
    const routes = buildOfflineRoutePlan("programa-empoderamiento-power-skills");

    expect(routes).toContain("/portal");
    expect(routes).toContain("/offline");
    expect(routes).toContain("/curso/programa-empoderamiento-power-skills");
    expect(routes).toContain("/curso/programa-empoderamiento-power-skills/preview");
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("summarizes offline-capable blocks from the course contract", () => {
    const course = getDemoCourseSnapshot("programa-empoderamiento-power-skills");
    const summary = summarizeOfflineReadiness(course);

    expect(summary.courseSlug).toBe("programa-empoderamiento-power-skills");
    expect(summary.totalBlocks).toBeGreaterThan(0);
    expect(summary.offlineCapableBlocks).toBeGreaterThan(0);
    expect(summary.canEnable).toBe(true);
  });
});
