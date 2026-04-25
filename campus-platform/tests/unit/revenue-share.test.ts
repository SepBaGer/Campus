import { describe, expect, it } from "vitest";
import {
  buildRevenueShareManifestFromForm,
  createDefaultRevenueShareManifest,
  formatRevenueShareSummary,
  normalizeRevenueShareManifest,
  resolveRevenueShareAuthoringModel
} from "../../src/lib/revenue-share";

describe("revenue-share", () => {
  it("provides the default 30/70 manual monthly contract", () => {
    expect(createDefaultRevenueShareManifest()).toEqual({
      enabled: false,
      settlement_mode: "manual_monthly",
      currency: "usd",
      teacher: {
        person_id: null,
        display_name: "Docente invitado",
        stripe_account_id: null
      },
      split: {
        platform_percent: 30,
        teacher_percent: 70
      },
      settlement_window_days: 15,
      minimum_amount_minor: 0,
      stripe_connect: {
        charge_type: "destination",
        on_behalf_of: false
      }
    });
  });

  it("normalizes partial manifests defensively", () => {
    const manifest = normalizeRevenueShareManifest({
      enabled: true,
      settlement_mode: "stripe_connect_destination_charge",
      currency: "COP",
      teacher: {
        display_name: "Mauricio",
        stripe_account_id: "acct_teacher"
      },
      split: {
        platform_percent: 25,
        teacher_percent: 75
      },
      stripe_connect: {
        on_behalf_of: true
      }
    });

    expect(manifest.currency).toBe("cop");
    expect(manifest.teacher.display_name).toBe("Mauricio");
    expect(manifest.teacher.stripe_account_id).toBe("acct_teacher");
    expect(manifest.split.platform_percent).toBe(25);
    expect(manifest.split.teacher_percent).toBe(75);
    expect(manifest.stripe_connect.on_behalf_of).toBe(true);
    expect(manifest.settlement_window_days).toBe(15);
  });

  it("builds a manifest from admin form fields", () => {
    const formData = new FormData();
    formData.set("revenue_share_enabled", "true");
    formData.set("revenue_share_settlement_mode", "stripe_connect_destination_charge");
    formData.set("revenue_share_currency", "usd");
    formData.set("revenue_share_teacher_person_id", "teacher-1");
    formData.set("revenue_share_teacher_display_name", "Mauricio");
    formData.set("revenue_share_teacher_stripe_account_id", "acct_123");
    formData.set("revenue_share_platform_percent", "20");
    formData.set("revenue_share_teacher_percent", "80");
    formData.set("revenue_share_settlement_window_days", "15");
    formData.set("revenue_share_minimum_amount_minor", "5000");
    formData.set("revenue_share_on_behalf_of", "true");

    const manifest = buildRevenueShareManifestFromForm(formData);

    expect(manifest).toEqual({
      enabled: true,
      settlement_mode: "stripe_connect_destination_charge",
      currency: "usd",
      teacher: {
        person_id: "teacher-1",
        display_name: "Mauricio",
        stripe_account_id: "acct_123"
      },
      split: {
        platform_percent: 20,
        teacher_percent: 80
      },
      settlement_window_days: 15,
      minimum_amount_minor: 5000,
      stripe_connect: {
        charge_type: "destination",
        on_behalf_of: true
      }
    });
  });

  it("resolves an authoring summary for active contracts", () => {
    const model = resolveRevenueShareAuthoringModel({
      enabled: true,
      settlement_mode: "manual_monthly",
      teacher: {
        display_name: "Mauricio"
      },
      split: {
        platform_percent: 30,
        teacher_percent: 70
      }
    });

    expect(model.summary).toBe("30% plataforma / 70% docente | Mauricio | Liquidacion mensual T+15");
    expect(formatRevenueShareSummary(normalizeRevenueShareManifest({ enabled: false })))
      .toBe("Revenue share inactivo para esta cohorte.");
  });
});
