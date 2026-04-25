import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  translate
} from "../../src/lib/i18n";

describe("i18n", () => {
  it("normalizes supported locale families to the project canon", () => {
    expect(normalizeLocale("en")).toBe("en-US");
    expect(normalizeLocale("pt-PT")).toBe("pt-BR");
    expect(normalizeLocale("es-MX")).toBe("es-CO");
  });

  it("falls back to the default locale when the input is unknown", () => {
    expect(normalizeLocale("fr-FR")).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale("")).toBe(DEFAULT_LOCALE);
  });

  it("interpolates translation variables in the selected locale", () => {
    expect(
      translate("en-US", "portal.focus.route", { value: "Power Skills Pilot" })
    ).toBe("Active path: Power Skills Pilot");
  });

  it("returns locale-specific copy for supported locales", () => {
    expect(translate("pt-BR", "layout.nav.home")).toBe("Inicio");
  });
});
