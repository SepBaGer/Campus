import { describe, expect, it } from "vitest";
import { extractVerificationToken, resolveVerificationTokenFromUrl } from "../../src/lib/verification-token";

describe("verification token helpers", () => {
  it("normalizes raw token candidates", () => {
    expect(extractVerificationToken(" /demo-token/ ")).toBe("demo-token");
    expect(extractVerificationToken("")).toBe("");
  });

  it("prefers the querystring token when present", () => {
    const token = resolveVerificationTokenFromUrl(
      new URL("https://campus.metodologia.info/verify/?token=query-token")
    );

    expect(token).toBe("query-token");
  });

  it("extracts the token from a rewritten verify pathname", () => {
    const token = resolveVerificationTokenFromUrl(
      new URL("https://campus.metodologia.info/verify/live-issued-token")
    );

    expect(token).toBe("live-issued-token");
  });

  it("ignores the generic verify index route without token", () => {
    const token = resolveVerificationTokenFromUrl(
      new URL("https://campus.metodologia.info/verify/index.html")
    );

    expect(token).toBe("");
  });
});
