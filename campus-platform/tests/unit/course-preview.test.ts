import { describe, expect, it } from "vitest";
import { buildBlockPreviewContent, resolveCoursePreviewBlock } from "../../src/lib/course-preview";
import { getDemoCourseSnapshot } from "../../src/lib/platform-data";

describe("course preview", () => {
  it("resolves the first public block as the preview entrypoint", () => {
    const course = getDemoCourseSnapshot("programa-empoderamiento-power-skills");
    const previewBlock = resolveCoursePreviewBlock(course?.blocks || []);

    expect(previewBlock?.slug).toBe("m1-s1-de-ocupado-a-productivo");
    expect(previewBlock?.isFree).toBe(true);
  });

  it("builds preview copy from the block metadata without needing a custom backend field", () => {
    const course = getDemoCourseSnapshot("programa-empoderamiento-power-skills");
    const previewBlock = resolveCoursePreviewBlock(course?.blocks || []);
    if (!previewBlock) {
      throw new Error("Expected demo preview block");
    }

    const preview = buildBlockPreviewContent(previewBlock);

    expect(preview.paragraphs.length).toBeGreaterThan(1);
    expect(preview.experiencePoints.length).toBeGreaterThan(1);
    expect(preview.evidencePoints.some((entry) => entry.includes(previewBlock.competencyTitle))).toBe(true);
  });
});
