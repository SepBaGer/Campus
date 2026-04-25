import { describe, expect, it } from "vitest";
import {
  buildAdminNotificationTemplatePayload,
  resolveNotificationTemplateAuthoringModel
} from "../../src/lib/admin-notifications";

describe("admin-notifications", () => {
  it("builds a normalized payload from form data", () => {
    const formData = new FormData();
    formData.set("course_slug", "programa-empoderamiento-power-skills");
    formData.set("run_slug", "power-skills-pilot-open");
    formData.set("template_slug", "bienvenida-cohorte-email");
    formData.set("title", "Bienvenida de cohorte");
    formData.set("channel_code", "email");
    formData.set("audience_code", "active");
    formData.set("trigger_code", "manual");
    formData.set("offset_days", "3");
    formData.set("offset_hours", "-2");
    formData.set("subject_template", "Hola {{learner_name}}");
    formData.set("body_template", "Activa tu cohorte.");
    formData.set("cta_label", "Abrir portal");
    formData.set("cta_url", "{{portal_url}}");
    formData.set("status", "active");

    expect(buildAdminNotificationTemplatePayload(formData)).toEqual({
      course_slug: "programa-empoderamiento-power-skills",
      run_slug: "power-skills-pilot-open",
      template_slug: "bienvenida-cohorte-email",
      title: "Bienvenida de cohorte",
      channel_code: "email",
      audience_code: "active",
      trigger_code: "manual",
      offset_days: 3,
      offset_hours: -2,
      subject_template: "Hola {{learner_name}}",
      body_template: "Activa tu cohorte.",
      cta_label: "Abrir portal",
      cta_url: "{{portal_url}}",
      status: "active"
    });
  });

  it("derives defaults for a new template", () => {
    expect(
      resolveNotificationTemplateAuthoringModel(null, "power-skills-pilot-open", "Cohorte abierta")
    ).toMatchObject({
      runSlug: "power-skills-pilot-open",
      runTitle: "Cohorte abierta",
      slug: "nueva-notificacion",
      channelCode: "email",
      triggerCode: "manual",
      ctaUrl: "{{portal_url}}"
    });
  });
});
