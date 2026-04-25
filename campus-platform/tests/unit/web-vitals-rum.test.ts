import { describe, expect, it } from "vitest";
import {
  createRumPayload,
  resolveRumDeviceType,
  resolveRumSampleRate,
  sanitizeRumPath,
  summarizeRumAttribution
} from "../../src/lib/web-vitals-rum";

describe("web vitals RUM helpers", () => {
  it("normalizes sample rates into a safe 0..1 range", () => {
    expect(resolveRumSampleRate("0.25")).toBe(0.25);
    expect(resolveRumSampleRate("5")).toBe(1);
    expect(resolveRumSampleRate("-1")).toBe(0);
    expect(resolveRumSampleRate("not-a-number")).toBe(1);
  });

  it("keeps only pathname data and drops query strings", () => {
    expect(sanitizeRumPath("https://campus.metodologia.info/verify/token-secreto?token=abc"))
      .toBe("/verify/:token");
    expect(sanitizeRumPath("/portal?session=abc#fragment")).toBe("/portal");
    expect(sanitizeRumPath("javascript:alert(1)")).toBe("/");
  });

  it("classifies coarse device types from viewport width", () => {
    expect(resolveRumDeviceType(390)).toBe("mobile");
    expect(resolveRumDeviceType(900)).toBe("tablet");
    expect(resolveRumDeviceType(1280)).toBe("desktop");
    expect(resolveRumDeviceType(0)).toBe("unknown");
  });

  it("summarizes attribution without preserving full resource URLs", () => {
    expect(summarizeRumAttribution({
      name: "LCP",
      attribution: {
        target: "h1.hero-title",
        url: "https://cdn.example.com/assets/hero.png?secret=1",
        timeToFirstByte: 123.45678,
        ignored: { nested: true }
      }
    })).toEqual({
      target: "h1.hero-title",
      timeToFirstByte: 123.4568,
      resourcePath: "/assets/hero.png"
    });
  });

  it("creates a normalized payload for the Edge Function", () => {
    const payload = createRumPayload({
      id: "v5-abc",
      name: "INP",
      value: 181.23456,
      delta: 181.23456,
      rating: "good",
      navigationType: "navigate",
      attribution: {
        interactionTarget: "button.site-cta",
        interactionType: "pointer",
        inputDelay: 4,
        processingDuration: 20,
        presentationDelay: 10
      }
    }, {
      pageLoadId: "11111111-1111-4111-8111-111111111111",
      clientSessionId: "22222222-2222-4222-8222-222222222222",
      sampleRate: 0.5,
      href: "https://campus.metodologia.info/catalogo?utm=hidden",
      origin: "https://campus.metodologia.info",
      viewportWidth: 1366,
      viewportHeight: 768,
      visibilityState: "visible",
      effectiveConnectionType: "4g"
    });

    expect(payload).toMatchObject({
      id: "v5-abc",
      name: "INP",
      value: 181.2346,
      delta: 181.2346,
      rating: "good",
      path: "/catalogo",
      device_type: "desktop",
      effective_connection_type: "4g",
      sample_rate: 0.5
    });
  });
});
