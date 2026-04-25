import { describe, expect, it } from "vitest";
import {
  loadCatalogSnapshot,
  loadCourseSnapshot,
  loadPortalSnapshot,
  loadVerificationSnapshot
} from "../../src/lib/catalog-repository";

describe("catalog repository", () => {
  it("returns the demo catalog when live mode is not configured", async () => {
    const catalog = await loadCatalogSnapshot();
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog[0]?.slug).toBe("programa-empoderamiento-power-skills");
    expect(catalog[0]?.competencies.length).toBeGreaterThanOrEqual(3);
  });

  it("returns the demo course detail for the pilot slug", async () => {
    const course = await loadCourseSnapshot("programa-empoderamiento-power-skills");
    expect(course?.blocks.length).toBeGreaterThanOrEqual(4);
    expect(course?.sessions.length).toBeGreaterThanOrEqual(3);
    expect(course?.competencies.length).toBeGreaterThanOrEqual(3);
    expect(course?.competencies[0]?.bloomLabel).toBeTruthy();
    expect(course?.blocks[0]?.competencyTitle).toBeTruthy();
  });

  it("returns a portal snapshot with coherent progress numbers", async () => {
    const portal = await loadPortalSnapshot();
    expect(portal.completedBlocks).toBeLessThanOrEqual(portal.totalBlocks);
    expect(portal.progressPercent).toBeGreaterThan(0);
    expect(portal.mastery.length).toBeGreaterThanOrEqual(3);
  });

  it("resolves the demo verification token", async () => {
    const badge = await loadVerificationSnapshot("demo-badge-power-skills");
    expect(badge?.status).toBe("issued");
    expect(badge?.courseTitle).toContain("Power Skills");
  });
});
