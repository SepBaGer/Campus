import type { NotificationTemplateSnapshot } from "./platform-types";

export function buildAdminNotificationTemplatePayload(formData: FormData) {
  return {
    course_slug: String(formData.get("course_slug") || ""),
    run_slug: String(formData.get("run_slug") || ""),
    template_slug: String(formData.get("template_slug") || ""),
    title: String(formData.get("title") || ""),
    channel_code: String(formData.get("channel_code") || "email"),
    audience_code: String(formData.get("audience_code") || "active"),
    trigger_code: String(formData.get("trigger_code") || "manual"),
    offset_days: Number(formData.get("offset_days") || 0),
    offset_hours: Number(formData.get("offset_hours") || 0),
    subject_template: String(formData.get("subject_template") || ""),
    body_template: String(formData.get("body_template") || ""),
    cta_label: String(formData.get("cta_label") || ""),
    cta_url: String(formData.get("cta_url") || ""),
    status: String(formData.get("status") || "draft")
  };
}

export function resolveNotificationTemplateAuthoringModel(
  template: NotificationTemplateSnapshot | null,
  fallbackRunSlug: string,
  fallbackRunTitle: string
) {
  return {
    runSlug: template?.runSlug || fallbackRunSlug,
    runTitle: template?.runTitle || fallbackRunTitle,
    slug: template?.slug || "nueva-notificacion",
    title: template?.title || "Nueva notificacion",
    channelCode: template?.channelCode || "email",
    audienceCode: template?.audienceCode || "active",
    triggerCode: template?.triggerCode || "manual",
    offsetDays: template?.offsetDays || 0,
    offsetHours: template?.offsetHours || 0,
    subjectTemplate: template?.subjectTemplate || "Tu cohorte {{run_title}} ya esta activa, {{learner_name}}",
    bodyTemplate: template?.bodyTemplate || "Hola {{learner_name}}, revisa {{course_title}} y entra al portal para sostener tu ritmo.",
    ctaLabel: template?.ctaLabel || "Abrir portal",
    ctaUrl: template?.ctaUrl || "{{portal_url}}",
    status: template?.status || "draft"
  };
}
