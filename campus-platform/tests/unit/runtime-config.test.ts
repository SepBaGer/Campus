import { describe, expect, it } from "vitest";
import { buildRedirectUrl, normalizeRedirectPath, resolveSiteUrl } from "../../src/lib/runtime-config";

describe("runtime config helpers", () => {
  it("prefers configured site url and strips trailing slashes", () => {
    expect(resolveSiteUrl("https://campus.example.com///", "http://localhost:4321")).toBe("https://campus.example.com");
  });

  it("builds redirect urls from a site root and relative path", () => {
    expect(buildRedirectUrl("https://campus.example.com", "/portal")).toBe("https://campus.example.com/portal");
  });

  it("normalizes unsafe redirect paths back to portal", () => {
    expect(normalizeRedirectPath("portal")).toBe("/portal");
    expect(normalizeRedirectPath("https://malicious.example")).toBe("/portal");
    expect(normalizeRedirectPath("/admin", "/portal")).toBe("/admin");
  });
});
