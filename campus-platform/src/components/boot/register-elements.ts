function registerIfPresent(selector: string, loader: () => Promise<unknown>) {
  if (document.querySelector(selector)) {
    void loader();
  }
}

registerIfPresent("admin-console", () => import("../elements/admin-console"));
registerIfPresent("badge-viewer", () => import("../elements/badge-viewer"));
registerIfPresent("course-card", () => import("../elements/course-card"));
registerIfPresent("enrollment-form", () => import("../elements/enrollment-form"));
registerIfPresent("enterprise-sso-form", () => import("../elements/enterprise-sso-form"));
registerIfPresent("magic-link-form", () => import("../elements/magic-link-form"));
registerIfPresent("progress-ring", () => import("../elements/progress-ring"));
registerIfPresent("schedule-picker", () => import("../elements/schedule-picker"));

registerIfPresent("portal-shell", async () => {
  await Promise.all([
    import("../elements/portal-shell"),
    import("../elements/attempt-runner"),
    import("../elements/streak-ring")
  ]);
});
