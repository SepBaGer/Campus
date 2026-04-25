import { LitElement, css, html } from "lit";
import "./rich-text-editor";
import {
  buildAdminNotificationTemplatePayload,
  resolveNotificationTemplateAuthoringModel
} from "../../lib/admin-notifications";
import {
  buildAdminBlockPayload,
  resolveExpressionVariantsAuthoringModel,
  resolveRendererManifestAuthoringModel,
  type RendererManifestAuthoringModel
} from "../../lib/admin-authoring";
import {
  buildCommunityManifestFromForm,
  resolveCommunityAuthoringModel
} from "../../lib/community-config";
import {
  buildOneRosterManifestFromForm,
  resolveOneRosterAuthoringModel
} from "../../lib/oneroster-config";
import {
  buildRevenueShareManifestFromForm,
  resolveRevenueShareAuthoringModel
} from "../../lib/revenue-share";
import {
  buildAdminRubricPayload,
  buildProjectSubmissionReviewPayload,
  resolveRubricAuthoringModel,
  resolveSubmissionReviewModel
} from "../../lib/admin-rubrics";
import { getDefaultBlockCatalogContract, normalizeBlockKind } from "../../lib/block-profile";
import {
  dispatchNotificationTemplateForBrowser,
  type AdminCatalogSnapshot,
  getBrowserSession,
  isBrowserLiveMode,
  loadAdminCatalogSnapshot,
  processDueNotificationsForBrowser,
  subscribeAdminReportingRealtimeForBrowser,
  syncOneRosterRunForBrowser,
  upsertAdminCatalogEntity
} from "../../lib/browser-platform";
import {
  formatDateTime,
  LOCALE_CHANGE_EVENT,
  getActiveLocale,
  type SupportedLocale
} from "../../lib/i18n";

const defaultCompetenciesManifest = [
  {
    slug: "foco-y-autonomia-operativa",
    title: "Foco y autonomia operativa",
    bloom_level: "aplicar",
    position: 1
  },
  {
    slug: "pensamiento-estrategico-y-sistemico",
    title: "Pensamiento estrategico y sistemico",
    bloom_level: "analizar",
    position: 2
  },
  {
    slug: "comunicacion-estructurada-con-evidencia",
    title: "Comunicacion estructurada con evidencia",
    bloom_level: "evaluar",
    position: 3
  },
  {
    slug: "diseno-de-soluciones-con-ia",
    title: "Diseno de soluciones con IA",
    bloom_level: "crear",
    position: 4
  }
];

function matchesCanonicalKind(
  kind: string | undefined,
  target: "video" | "quiz" | "reading" | "interactive" | "project"
) {
  switch (target) {
    case "video":
      return kind === "video";
    case "quiz":
      return kind === "quiz" || kind === "practice";
    case "reading":
      return kind === "reading" || kind === "lesson" || kind === "resource" || !kind;
    case "interactive":
      return kind === "interactive" || kind === "workshop";
    case "project":
      return kind === "project" || kind === "milestone";
    default:
      return false;
  }
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

class AdminConsoleElement extends LitElement {
  static properties = {
    courseSlug: { type: String, attribute: "course-slug" },
    snapshot: { state: true },
    loading: { state: true },
    errorMessage: { state: true },
    message: { state: true },
    sessionEmail: { state: true },
    selectedBlockSlug: { state: true },
    selectedBlockKind: { state: true },
    selectedRubricSlug: { state: true },
    selectedSubmissionId: { state: true },
    selectedNotificationSlug: { state: true },
    reportRealtimeStatus: { state: true },
    locale: { state: true }
  };

  courseSlug = "programa-empoderamiento-power-skills";
  snapshot: AdminCatalogSnapshot | null = null;
  loading = true;
  errorMessage = "";
  message = "";
  sessionEmail = "";
  selectedBlockSlug = "";
  selectedBlockKind = "reading";
  selectedRubricSlug = "";
  selectedSubmissionId = 0;
  selectedNotificationSlug = "";
  reportRealtimeStatus = "demo";
  locale: SupportedLocale = getActiveLocale();
  private reportRealtimeSubscription: { unsubscribe(): void } | null = null;
  private reportRealtimeRefreshTimer: number | null = null;
  private readonly handleLocaleChange = (event: Event) => {
    this.locale = (event as CustomEvent<{ locale?: SupportedLocale }>).detail?.locale || getActiveLocale();
  };

  static styles = css`
    :host {
      display: grid;
      gap: 1rem;
      color: var(--brand-text, #0f172a);
    }

    .panel {
      display: grid;
      gap: 1rem;
      padding: 1.2rem;
      border-radius: 22px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-panel, rgba(255, 255, 255, 0.82));
      box-shadow: var(--shadow-lg, 0 18px 48px rgba(15, 23, 42, 0.08));
    }

    .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .editor-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .editor-card {
      display: grid;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 18px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-tint, rgba(15, 23, 42, 0.04));
    }

    .utility {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .mastery-list {
      display: grid;
      gap: 0.85rem;
    }

    .metric-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .metric {
      display: grid;
      gap: 0.2rem;
      min-height: 92px;
      padding: 0.9rem;
      border-radius: 18px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-tint, rgba(15, 23, 42, 0.04));
    }

    .metric strong {
      color: var(--brand-text, #0f172a);
      font-family: var(--font-display, "Poppins", sans-serif);
      font-size: 1.45rem;
      line-height: 1;
    }

    .metric span {
      color: var(--brand-text-soft, #334155);
      font-size: 0.84rem;
      line-height: 1.35;
    }

    .surface-note {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 0.25rem 0.55rem;
      border-radius: 999px;
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      color: var(--brand-gold, #b88700);
      font-family: var(--font-mono, "Trebuchet MS", sans-serif);
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h4 {
      margin: 0;
      font-family: var(--font-display, "Poppins", sans-serif);
      font-size: 1rem;
    }

    form {
      display: grid;
      gap: 0.75rem;
    }

    label {
      display: grid;
      gap: 0.35rem;
      font-weight: 700;
      color: var(--brand-text-soft, #334155);
    }

    input,
    textarea,
    select {
      min-height: 2.8rem;
      padding: 0.75rem 0.95rem;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      border-radius: 14px;
      background: var(--surface-input, rgba(255, 255, 255, 0.86));
      color: var(--brand-text, #0f172a);
    }

    textarea {
      min-height: 6.5rem;
      resize: vertical;
    }

    rich-text-editor {
      display: block;
    }

    button,
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0.75rem 1rem;
      border-radius: 999px;
      border: 1px solid transparent;
      text-decoration: none;
      font-weight: 800;
    }

    button {
      background: var(--brand-gold, #b88700);
      border-color: var(--brand-gold, #b88700);
      color: var(--brand-dark, #09162c);
      cursor: pointer;
    }

    a {
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      border-color: var(--brand-border-strong, rgba(184, 135, 0, 0.28));
      color: var(--brand-gold, #b88700);
    }

    .message,
    .error {
      padding: 0.9rem 1rem;
      border: 1px solid transparent;
      border-radius: 16px;
    }

    .message {
      background: var(--positive-bg, rgba(220, 252, 231, 0.92));
      border-color: var(--positive-border, rgba(22, 101, 52, 0.18));
      color: var(--positive-text, #166534);
    }

    .error {
      background: var(--danger-bg, rgba(254, 242, 242, 0.96));
      border-color: var(--danger-border, rgba(185, 28, 28, 0.16));
      color: var(--danger-text, #b91c1c);
    }

    details {
      display: grid;
      gap: 0.75rem;
      padding: 0.95rem 1rem;
      border-radius: 18px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: rgba(255, 255, 255, 0.55);
    }

    summary {
      cursor: pointer;
      font-weight: 800;
      color: var(--brand-text, #0f172a);
    }

    ul {
      margin: 0;
      padding-left: 1rem;
      color: var(--brand-text-soft, #334155);
      line-height: 1.7;
    }

    p {
      margin: 0;
      color: var(--brand-text-soft, #334155);
    }

    @media (max-width: 980px) {
      .grid,
      .editor-grid,
      .metric-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
    void this.loadSnapshot();
  }

  disconnectedCallback() {
    window.removeEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
    this.stopAdminRealtimeSubscription();
    super.disconnectedCallback();
  }

  resolveActiveBlock() {
    const blocks = this.snapshot?.blocks || [];
    return blocks.find((entry) => entry.slug === this.selectedBlockSlug) || blocks[0] || null;
  }

  resolveActiveRubric() {
    const rubrics = this.snapshot?.rubrics || [];
    return rubrics.find((entry) => entry.slug === this.selectedRubricSlug) || rubrics[0] || null;
  }

  resolveActiveSubmission() {
    const submissions = this.snapshot?.submissions || [];
    return submissions.find((entry) => entry.id === this.selectedSubmissionId) || submissions[0] || null;
  }

  resolveActiveNotificationTemplate() {
    const templates = this.snapshot?.notificationTemplates || [];
    return templates.find((entry) => entry.slug === this.selectedNotificationSlug) || templates[0] || null;
  }

  syncBlockSelection(snapshot: AdminCatalogSnapshot | null) {
    const blocks = snapshot?.blocks || [];
    if (!blocks.length) {
      this.selectedBlockSlug = "";
      this.selectedBlockKind = "reading";
      return;
    }

    const activeBlock = blocks.find((entry) => entry.slug === this.selectedBlockSlug) || blocks[0];
    this.selectedBlockSlug = activeBlock.slug;
    this.selectedBlockKind = normalizeBlockKind(activeBlock.kind);
  }

  syncRubricSelection(snapshot: AdminCatalogSnapshot | null) {
    const rubrics = snapshot?.rubrics || [];
    if (!rubrics.length) {
      this.selectedRubricSlug = "";
      return;
    }

    const activeRubric = rubrics.find((entry) => entry.slug === this.selectedRubricSlug) || rubrics[0];
    this.selectedRubricSlug = activeRubric.slug;
  }

  syncSubmissionSelection(snapshot: AdminCatalogSnapshot | null) {
    const submissions = snapshot?.submissions || [];
    if (!submissions.length) {
      this.selectedSubmissionId = 0;
      return;
    }

    const activeSubmission = submissions.find((entry) => entry.id === this.selectedSubmissionId) || submissions[0];
    this.selectedSubmissionId = activeSubmission.id;
  }

  syncNotificationSelection(snapshot: AdminCatalogSnapshot | null) {
    const templates = snapshot?.notificationTemplates || [];
    if (!templates.length) {
      this.selectedNotificationSlug = "";
      return;
    }

    const activeTemplate = templates.find((entry) => entry.slug === this.selectedNotificationSlug) || templates[0];
    this.selectedNotificationSlug = activeTemplate.slug;
  }

  stopAdminRealtimeSubscription() {
    if (this.reportRealtimeRefreshTimer) {
      window.clearTimeout(this.reportRealtimeRefreshTimer);
      this.reportRealtimeRefreshTimer = null;
    }

    this.reportRealtimeSubscription?.unsubscribe();
    this.reportRealtimeSubscription = null;
  }

  refreshAdminRealtimeSubscription() {
    this.stopAdminRealtimeSubscription();

    if (!this.snapshot || !isBrowserLiveMode()) {
      this.reportRealtimeStatus = "demo";
      return;
    }

    const subscription = subscribeAdminReportingRealtimeForBrowser({
      courseSlug: this.courseSlug,
      onChange: () => {
        if (this.reportRealtimeRefreshTimer) {
          window.clearTimeout(this.reportRealtimeRefreshTimer);
        }

        this.reportRealtimeStatus = "actualizando";
        this.reportRealtimeRefreshTimer = window.setTimeout(() => {
          this.reportRealtimeRefreshTimer = null;
          void this.loadSnapshot();
        }, 750);
      }
    });

    this.reportRealtimeSubscription = subscription;
    this.reportRealtimeStatus = subscription.status === "subscribed" ? "live" : "demo";
  }

  async loadSnapshot() {
    this.loading = true;
    this.errorMessage = "";
    this.message = "";

    try {
      const session = await getBrowserSession();
      this.sessionEmail = session?.user.email || "";

      if (isBrowserLiveMode() && !session) {
        this.snapshot = null;
        this.syncBlockSelection(null);
        this.syncRubricSelection(null);
        this.syncSubmissionSelection(null);
        this.syncNotificationSelection(null);
        this.stopAdminRealtimeSubscription();
        this.reportRealtimeStatus = "sin sesion";
        return;
      }

      this.snapshot = await loadAdminCatalogSnapshot(this.courseSlug);
      this.syncBlockSelection(this.snapshot);
      this.syncRubricSelection(this.snapshot);
      this.syncSubmissionSelection(this.snapshot);
      this.syncNotificationSelection(this.snapshot);
      this.refreshAdminRealtimeSubscription();
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.loading = false;
    }
  }

  handleBlockSelection(event: Event) {
    const slug = (event.currentTarget as HTMLSelectElement).value;
    this.selectedBlockSlug = slug;

    const block = this.snapshot?.blocks.find((entry) => entry.slug === slug);
    this.selectedBlockKind = normalizeBlockKind(block?.kind || "reading");
  }

  handleKindSelection(event: Event) {
    this.selectedBlockKind = normalizeBlockKind((event.currentTarget as HTMLSelectElement).value);
  }

  handleRubricSelection(event: Event) {
    this.selectedRubricSlug = (event.currentTarget as HTMLSelectElement).value;
  }

  handleSubmissionSelection(event: Event) {
    this.selectedSubmissionId = Number((event.currentTarget as HTMLSelectElement).value || 0);
  }

  handleNotificationSelection(event: Event) {
    this.selectedNotificationSlug = (event.currentTarget as HTMLSelectElement).value;
  }

  async handleSubmit(
    event: Event,
    action: "upsert-course" | "upsert-run" | "upsert-block" | "upsert-rubric" | "upsert-notification-template"
  ) {
    event.preventDefault();
    this.errorMessage = "";
    this.message = "";

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    this.syncRichEditors(form, formData);
    const activeBlock = this.resolveActiveBlock();
    let payload: Record<string, unknown> = Object.fromEntries(formData.entries());

    try {
      if (action === "upsert-run") {
        payload = {
          ...payload,
          community_manifest: JSON.stringify(
            buildCommunityManifestFromForm(
              formData,
              String(payload.title || this.snapshot?.runs[0]?.title || "Cohorte abierta")
            )
          ),
          revenue_share_manifest: JSON.stringify(
            buildRevenueShareManifestFromForm(formData)
          ),
          oneroster_manifest: JSON.stringify(
            buildOneRosterManifestFromForm(formData)
          )
        };
      }

      if (action === "upsert-block") {
        payload = buildAdminBlockPayload(formData, {
          kind: String(payload.kind || this.selectedBlockKind || activeBlock?.kind || "reading"),
          durationMinutes: Number(payload.duration_minutes || activeBlock?.duration_minutes || 15)
        });

        this.selectedBlockSlug = String(payload.block_slug || this.selectedBlockSlug || "");
        this.selectedBlockKind = normalizeBlockKind(String(payload.kind || this.selectedBlockKind || "reading"));
      }

      if (action === "upsert-rubric") {
        payload = {
          course_slug: this.courseSlug,
          ...buildAdminRubricPayload(formData)
        };
        this.selectedRubricSlug = String(payload.rubric_slug || this.selectedRubricSlug || "");
      }

      if (action === "upsert-notification-template") {
        payload = buildAdminNotificationTemplatePayload(formData);
        this.selectedNotificationSlug = String(payload.template_slug || this.selectedNotificationSlug || "");
      }

      if (!isBrowserLiveMode()) {
        this.message = `Modo demo: ${action} preparado sin persistencia remota.`;
        await this.loadSnapshot();
        return;
      }

      await upsertAdminCatalogEntity(action, payload);
      this.message = `${action} ejecutado correctamente.`;
      await this.loadSnapshot();
    } catch (error) {
      this.errorMessage = (error as Error).message;
    }
  }

  syncRichEditors(form: HTMLFormElement, formData: FormData) {
    const editors = Array.from(
      form.querySelectorAll<HTMLElement & { fieldName?: string; value?: string }>("rich-text-editor")
    );

    editors.forEach((editor) => {
      if (!editor.fieldName) {
        return;
      }

      formData.set(editor.fieldName, editor.value || "");
    });
  }

  async handleNotificationDispatch(mode: "dispatch-template" | "process-due") {
    this.errorMessage = "";
    this.message = "";

    try {
      const activeTemplate = this.resolveActiveNotificationTemplate();
      const activeRun = this.snapshot?.runs[0];
      if (!activeRun) {
        throw new Error("No hay una cohorte activa para procesar notificaciones.");
      }

      if (!isBrowserLiveMode()) {
        this.message = mode === "dispatch-template"
          ? "Modo demo: envio manual preparado sin persistencia remota."
          : "Modo demo: secuencia de cohorte preparada sin persistencia remota.";
        return;
      }

      if (mode === "dispatch-template") {
        if (!activeTemplate) {
          throw new Error("No hay plantilla activa para enviar.");
        }

        await dispatchNotificationTemplateForBrowser(activeRun.slug, activeTemplate.slug);
        this.message = "Plantilla enviada correctamente.";
      } else {
        await processDueNotificationsForBrowser(activeRun.slug);
        this.message = "Secuencia de cohorte procesada correctamente.";
      }

      await this.loadSnapshot();
    } catch (error) {
      this.errorMessage = (error as Error).message;
    }
  }

  async handleOneRosterSync() {
    this.errorMessage = "";
    this.message = "";

    try {
      const activeRun = this.snapshot?.runs[0];
      if (!activeRun) {
        throw new Error("No hay una cohorte activa para sincronizar con OneRoster.");
      }

      if (!isBrowserLiveMode()) {
        this.message = "Modo demo: corrida OneRoster preparada sin persistencia remota.";
        return;
      }

      const result = await syncOneRosterRunForBrowser(activeRun.slug);
      this.message = `OneRoster ${result.status}: ${result.processed_seats} seats procesados, ${result.matched_seats} con match, ${result.failed_seats} con error.`;
      await this.loadSnapshot();
    } catch (error) {
      this.errorMessage = (error as Error).message;
    }
  }

  async handleReviewSubmission(event: Event) {
    event.preventDefault();
    this.errorMessage = "";
    this.message = "";

    const submission = this.resolveActiveSubmission();
    if (!submission) {
      this.errorMessage = "No hay entrega activa para revisar.";
      return;
    }

    const rubric = this.snapshot?.rubrics.find((entry) => entry.slug === submission.rubricSlug);
    if (!rubric) {
      this.errorMessage = "La entrega activa no tiene una rubrica resoluble.";
      return;
    }

    try {
      const form = event.currentTarget as HTMLFormElement;
      const payload = buildProjectSubmissionReviewPayload(new FormData(form), rubric);

      if (!isBrowserLiveMode()) {
        this.message = "Modo demo: revision preparada sin persistencia remota.";
        await this.loadSnapshot();
        return;
      }

      await upsertAdminCatalogEntity("review-project-submission", payload);
      this.message = "Revision manual guardada correctamente.";
      await this.loadSnapshot();
    } catch (error) {
      this.errorMessage = (error as Error).message;
    }
  }

  renderSignedOut() {
    return html`
      <div class="panel">
        <h3>Acceso requerido</h3>
        <p>Para usar la operacion real necesitas una sesion valida y un rol teacher, admin u owner.</p>
        <a href="/acceso?next=/admin">Ir a acceso</a>
      </div>
    `;
  }

  renderKindSpecificFields(
    kind: string,
    authoring: RendererManifestAuthoringModel,
    rubricOptions: AdminCatalogSnapshot["rubrics"]
  ) {
    switch (normalizeBlockKind(kind)) {
      case "video":
        return html`
          <label>URL principal del video<input name="video_src" value="${authoring.video.src}" /></label>
          <label>Transcript / captions URL<input name="video_transcript_url" value="${authoring.video.transcriptUrl}" /></label>
          <label>Duracion del video (seg)
            <input type="number" name="video_duration_s" min="60" value="${String(authoring.video.durationSeconds)}" />
          </label>
        `;
      case "quiz":
        return html`
          <label>
            Preguntas del quiz (JSON)
            <textarea name="quiz_questions_json">${authoring.quiz.questionsJson}</textarea>
          </label>
          <label>Passing score
            <input type="number" name="quiz_passing_score" min="0" max="100" value="${String(authoring.quiz.passingScore)}" />
          </label>
          <label>Limite de tiempo (seg)
            <input type="number" name="quiz_time_limit_s" min="60" value="${String(authoring.quiz.timeLimitSeconds)}" />
          </label>
        `;
      case "interactive":
        return html`
          <label>
            Modo de herramienta
            <select name="interactive_lti_tool_mode">
              <option value="none" ?selected=${authoring.interactive.toolMode === "none"}>Sin LTI</option>
              <option value="mock" ?selected=${authoring.interactive.toolMode === "mock"}>Sandbox LTI del campus</option>
              <option value="custom" ?selected=${authoring.interactive.toolMode === "custom"}>Tool externo configurado</option>
            </select>
          </label>
          <label>Titulo visible de la herramienta<input name="interactive_lti_title" value="${authoring.interactive.title}" /></label>
          <label>OIDC login initiation URL<input name="interactive_lti_login_initiation_url" value="${authoring.interactive.loginInitiationUrl}" /></label>
          <label>Target link URI<input name="interactive_lti_target_link_uri" value="${authoring.interactive.targetLinkUri}" /></label>
          <label>Client ID<input name="interactive_lti_client_id" value="${authoring.interactive.clientId}" /></label>
          <label>Deployment ID<input name="interactive_lti_deployment_id" value="${authoring.interactive.deploymentId}" /></label>
          <label>Resource link ID<input name="interactive_lti_resource_link_id" value="${authoring.interactive.resourceLinkId}" /></label>
          <label>
            Presentacion del launch
            <select name="interactive_lti_launch_presentation">
              <option value="window" ?selected=${authoring.interactive.launchPresentation === "window"}>Nueva ventana</option>
              <option value="iframe" ?selected=${authoring.interactive.launchPresentation === "iframe"}>Iframe embebido</option>
            </select>
          </label>
          <label>
            Custom parameters (JSON)
            <textarea name="interactive_lti_custom_parameters_json">${authoring.interactive.customParametersJson}</textarea>
          </label>
          <label>H5P content ID<input name="interactive_h5p_content_id" value="${authoring.interactive.h5pContentId}" /></label>
        `;
      case "project":
        return html`
          <rich-text-editor
            field-name="project_brief_md"
            .value=${authoring.project.briefMarkdown}
            placeholder="Escribe el brief, inserta imagenes y deja enlaces de apoyo sin abrir JSON."
            course-slug=${this.courseSlug}
            block-slug=${this.selectedBlockSlug || "nuevo-bloque"}
          ></rich-text-editor>
          <label>Formato principal de entrega
            <input name="project_submission_format" value="${authoring.project.submissionFormat}" />
          </label>
          <label>
            Rubrica vinculada
            <select name="project_rubric_id">
              <option value="">Sin rubrica asignada</option>
              ${rubricOptions.map((rubric) => html`
                <option value=${rubric.slug} ?selected=${authoring.project.rubricId === rubric.slug}>
                  ${rubric.title}
                </option>
              `)}
            </select>
          </label>
        `;
      case "reading":
      default:
        return html`
          <rich-text-editor
            field-name="reading_markdown"
            .value=${authoring.reading.markdown}
            placeholder="Redacta la lectura, incrusta imagenes y deja recursos enlazados desde aqui."
            course-slug=${this.courseSlug}
            block-slug=${this.selectedBlockSlug || "nuevo-bloque"}
          ></rich-text-editor>
          <label>Tiempo estimado (min)
            <input type="number" name="reading_estimated_minutes" min="1" value="${String(authoring.reading.estimatedMinutes)}" />
          </label>
          <label>Reading level<input name="reading_level" value="${authoring.reading.readingLevel}" /></label>
        `;
    }
  }

  renderRendererSummary(
    kind: string,
    authoring: RendererManifestAuthoringModel,
    voiceDictationEnabled: boolean,
    rubricOptions: AdminCatalogSnapshot["rubrics"]
  ) {
    const selectedRubric = rubricOptions.find((entry) => entry.slug === authoring.project.rubricId);
    const summaryLines = [
      `Component: ${authoring.component}`,
      `Role: ${authoring.a11yRole || "sin role explicito"}`,
      `Aria label: ${authoring.ariaLabel || "sin aria label explicito"}`,
      `Offline capable: ${authoring.offlineCapable ? "si" : "no"}`,
      `Dictado por voz: ${voiceDictationEnabled ? "si" : "no"}`
    ];

    switch (normalizeBlockKind(kind)) {
      case "video":
        summaryLines.push(
          `Fuente principal: ${authoring.video.src || "pendiente"}`,
          `Duracion: ${authoring.video.durationSeconds} segundos`
        );
        break;
      case "quiz":
        summaryLines.push(
          `Passing score: ${authoring.quiz.passingScore}`,
          `Tiempo limite: ${authoring.quiz.timeLimitSeconds} segundos`
        );
        break;
      case "interactive":
        summaryLines.push(
          `Modo LTI: ${authoring.interactive.toolMode}`,
          `Login initiation: ${authoring.interactive.loginInitiationUrl || "pendiente"}`,
          `Target link: ${authoring.interactive.targetLinkUri || authoring.interactive.ltiLaunchUrl || "pendiente"}`,
          `Client ID: ${authoring.interactive.clientId || "pendiente"}`,
          `Deployment ID: ${authoring.interactive.deploymentId || "pendiente"}`,
          `Resource link ID: ${authoring.interactive.resourceLinkId || "pendiente"}`,
          `Presentacion: ${authoring.interactive.launchPresentation}`,
          `H5P content: ${authoring.interactive.h5pContentId || "no definido"}`
        );
        break;
      case "project":
        summaryLines.push(
          `Formato de entrega: ${authoring.project.submissionFormat}`,
          `Rubrica: ${selectedRubric?.title || authoring.project.rubricId || "pendiente"}`
        );
        break;
      case "reading":
      default:
        summaryLines.push(
          `Tiempo estimado: ${authoring.reading.estimatedMinutes} minutos`,
          `Reading level: ${authoring.reading.readingLevel}`
        );
        break;
    }

    return html`
      <ul>
        ${summaryLines.map((line) => html`<li>${line}</li>`)}
      </ul>
    `;
  }

  renderForms() {
    const snapshot = this.snapshot;

    if (!snapshot) {
      return null;
    }

    const snapshotData: AdminCatalogSnapshot = snapshot;

    const course = snapshotData.course;
    const run = snapshotData.runs[0];
    const block = this.resolveActiveBlock();
    const activeRubric = this.resolveActiveRubric();
    const activeSubmission = this.resolveActiveSubmission();
    const activeNotificationTemplate = this.resolveActiveNotificationTemplate();
    const selectedKind = normalizeBlockKind(this.selectedBlockKind || block?.kind || "reading");
    const defaultContract = getDefaultBlockCatalogContract(selectedKind);
    const competenciesManifest = snapshotData.competencies.length
      ? snapshotData.competencies
      : defaultCompetenciesManifest;
    const runsCount = snapshotData.runs.length;
    const blocksCount = snapshotData.blocks.length;
    const competenciesCount = snapshotData.competencies.length;
    const rubricsCount = snapshotData.rubrics.length;
    const submissionsCount = snapshotData.submissions.length;
    const reportsCount = snapshotData.teacherReports.length;
    const notificationTemplatesCount = snapshotData.notificationTemplates.length;
    const notificationDispatchesCount = snapshotData.notificationDispatches.length;
    const onerosterSyncsCount = snapshotData.onerosterSyncs.length;
    const onerosterSeatsCount = snapshotData.onerosterSeats.length;
    const authoring = resolveRendererManifestAuthoringModel(
      selectedKind,
      block?.renderer_manifest || defaultContract.rendererManifest,
      block?.duration_minutes || 15
    );
    const expressionAuthoring = resolveExpressionVariantsAuthoringModel(
      selectedKind,
      block?.expression_variants || defaultContract.expressionVariants
    );
    const rubricAuthoring = resolveRubricAuthoringModel(activeRubric);
    const submissionReview = resolveSubmissionReviewModel(activeSubmission);
    const notificationAuthoring = resolveNotificationTemplateAuthoringModel(
      activeNotificationTemplate,
      run?.slug || "power-skills-pilot-open",
      run?.title || "Cohorte abierta"
    );
    const communityAuthoring = resolveCommunityAuthoringModel(
      run?.community_manifest || null,
      run?.slug || "power-skills-pilot-open",
      run?.title || "Cohorte abierta"
    );
    const revenueShareAuthoring = resolveRevenueShareAuthoringModel(
      run?.revenue_share_manifest || null
    );
    const onerosterAuthoring = resolveOneRosterAuthoringModel(
      run?.oneroster_manifest || null
    );
    const activeRunSyncs = snapshotData.onerosterSyncs.filter((entry) => entry.runSlug === (run?.slug || ""));
    const activeRunSeats = snapshotData.onerosterSeats.filter((entry) => entry.runSlug === (run?.slug || ""));

    return html`
      <div class="message">
        Modo: ${snapshotData.access.mode} | Puede editar: ${snapshotData.access.can_edit ? "si" : "no"} | Usuario:
        ${snapshotData.access.email || this.sessionEmail || "sin sesion"} | Realtime: ${this.reportRealtimeStatus}
      </div>

      <div class="panel">
        <h3>Reporteria docente</h3>
        ${snapshotData.teacherReports.length
          ? html`
              <div class="mastery-list">
                ${snapshotData.teacherReports.map((report) => html`
                  <div class="editor-card">
                    <span class="surface-note">${report.runStatus} | ${report.runSlug}</span>
                    <h4>${report.runTitle}</h4>
                    <div class="metric-grid">
                      <div class="metric">
                        <strong>${String(report.totalLearners)}</strong>
                        <span>learners activos/completados</span>
                      </div>
                      <div class="metric">
                        <strong>${String(report.completionPercent)}%</strong>
                        <span>avance de cohortes</span>
                      </div>
                      <div class="metric">
                        <strong>${String(report.xapiStatements24h)}</strong>
                        <span>xAPI en 24h</span>
                      </div>
                      <div class="metric">
                        <strong>${String(report.atRiskLearners)}</strong>
                        <span>learners con repaso vencido</span>
                      </div>
                      <div class="metric">
                        <strong>${String(report.pendingProjectSubmissions)}</strong>
                        <span>entregas por revisar</span>
                      </div>
                      <div class="metric">
                        <strong>${String(report.badgesIssued)}</strong>
                        <span>badges emitidos</span>
                      </div>
                      <div class="metric">
                        <strong>${String(report.activeEnrollments)}</strong>
                        <span>matriculas activas</span>
                      </div>
                      <div class="metric">
                        <strong>${String(report.completedEnrollments)}</strong>
                        <span>matriculas completadas</span>
                      </div>
                    </div>
                    <ul>
                      <li>Intentos completados: ${String(report.completedAttempts)} / ${String(report.totalLearners * report.totalBlocks)}</li>
                      <li>Repasos vencidos: ${String(report.dueReviewsCount)}</li>
                      <li>Ultima actividad: ${report.lastActivityAt ? formatDateTime(report.lastActivityAt, this.locale) : "sin actividad"}</li>
                      <li>Ventana: ${formatDateTime(report.reportingWindowStartedAt, this.locale)}</li>
                    </ul>
                  </div>
                `)}
              </div>
            `
          : html`<p>No hay cohorts con datos de reporteria docente todavia.</p>`}
      </div>

      <div class="grid">
        <div class="panel">
          <h3>Programa</h3>
          <form @submit=${(event: Event) => this.handleSubmit(event, "upsert-course")}>
            <input type="hidden" name="course_slug" value="${course?.slug || this.courseSlug}" />
            <label>Titulo<input name="title" value="${course?.title || ""}" required /></label>
            <label>Resumen<textarea name="summary">${course?.summary || ""}</textarea></label>
            <label>Promesa de transformacion<textarea name="transformation_promise">${course?.transformation_promise || ""}</textarea></label>
            <label>Audiencia<input name="audience_label" value="${course?.audience_label || ""}" /></label>
            <label>Price label<input name="price_label" value="${course?.price_label || ""}" /></label>
            <label>Delivery label<input name="delivery_label" value="${course?.delivery_label || ""}" /></label>
            <label>Duration label<input name="duration_label" value="${course?.duration_label || ""}" /></label>
            <label>
              Competencies manifest (JSON)
              <textarea name="competencies_manifest">${formatJson(competenciesManifest)}</textarea>
            </label>
            <button type="submit">Guardar programa</button>
          </form>
        </div>

        <div class="panel">
          <h3>Cohorte</h3>
          <form @submit=${(event: Event) => this.handleSubmit(event, "upsert-run")}>
            <input type="hidden" name="course_slug" value="${course?.slug || this.courseSlug}" />
            <label>Run slug<input name="run_slug" value="${run?.slug || "power-skills-pilot-open"}" required /></label>
            <label>Titulo<input name="title" value="${run?.title || "Cohorte abierta"}" required /></label>
            <label>
              Estado
              <select name="status">
                <option value="draft" ?selected=${run?.status === "draft"}>draft</option>
                <option value="open" ?selected=${!run || run.status === "open"}>open</option>
                <option value="closed" ?selected=${run?.status === "closed"}>closed</option>
              </select>
            </label>
            <label>Starts at<input name="starts_at" value="${run?.starts_at || ""}" /></label>
            <label>Ends at<input name="ends_at" value="${run?.ends_at || ""}" /></label>
            <div class="editor-grid">
              <div class="editor-card">
                <span class="surface-note">comunidad</span>
                <h4>Foro y peer-review por cohorte</h4>
                <p>
                  Este slice deja la comunidad fuera del core curricular, pero operable desde la cohorte con launch LTI.
                </p>
                <label>
                  Comunidad habilitada
                  <select name="community_enabled">
                    <option value="true" ?selected=${communityAuthoring.enabled}>true</option>
                    <option value="false" ?selected=${!communityAuthoring.enabled}>false</option>
                  </select>
                </label>
                <label>Titulo visible<input name="community_title" value="${communityAuthoring.title}" /></label>
                <label>Resumen<textarea name="community_summary">${communityAuthoring.summary}</textarea></label>
                <label>CTA de entrada<input name="community_entry_label" value="${communityAuthoring.entryLabel}" /></label>
                <label>
                  Prompt de apertura
                  <textarea name="community_discussion_prompt">${communityAuthoring.discussionPrompt}</textarea>
                </label>
                <label>
                  Expectativas de participacion
                  <textarea name="community_expectations">${communityAuthoring.expectationsText}</textarea>
                </label>
                <label>
                  Peer-review activo
                  <select name="community_peer_review_enabled">
                    <option value="true" ?selected=${communityAuthoring.peerReviewEnabled}>true</option>
                    <option value="false" ?selected=${!communityAuthoring.peerReviewEnabled}>false</option>
                  </select>
                </label>
              </div>

              <div class="editor-card">
                <span class="surface-note">launch lti</span>
                <h4>Discourse via LTI 1.3</h4>
                <p>
                  Puedes dejar la cohorte en sandbox <code>mock</code> mientras llegan credenciales reales del tenant Discourse.
                </p>
                <label>
                  Modo de herramienta
                  <select name="community_lti_tool_mode">
                    <option value="none" ?selected=${communityAuthoring.toolMode === "none"}>Sin launch</option>
                    <option value="mock" ?selected=${communityAuthoring.toolMode === "mock"}>Sandbox del campus</option>
                    <option value="custom" ?selected=${communityAuthoring.toolMode === "custom"}>Tenant Discourse real</option>
                  </select>
                </label>
                <label>Titulo LTI<input name="community_lti_title" value="${communityAuthoring.ltiTitle}" /></label>
                <label>OIDC login initiation URL<input name="community_lti_login_initiation_url" value="${communityAuthoring.loginInitiationUrl}" /></label>
                <label>Target link URI<input name="community_lti_target_link_uri" value="${communityAuthoring.targetLinkUri}" /></label>
                <label>Client ID<input name="community_lti_client_id" value="${communityAuthoring.clientId}" /></label>
                <label>Deployment ID<input name="community_lti_deployment_id" value="${communityAuthoring.deploymentId}" /></label>
                <label>Resource link ID<input name="community_lti_resource_link_id" value="${communityAuthoring.resourceLinkId}" /></label>
                <label>
                  Presentacion del launch
                  <select name="community_lti_launch_presentation">
                    <option value="window" ?selected=${communityAuthoring.launchPresentation === "window"}>Nueva ventana</option>
                    <option value="iframe" ?selected=${communityAuthoring.launchPresentation === "iframe"}>Iframe embebido</option>
                  </select>
                </label>
                <label>
                  Custom parameters (JSON)
                  <textarea name="community_lti_custom_parameters_json">${communityAuthoring.customParametersJson}</textarea>
                </label>
              </div>
            </div>
            <div class="editor-grid">
              <div class="editor-card">
                <span class="surface-note">revenue share</span>
                <h4>Split para docentes invitados</h4>
                <p>
                  Este contrato deja lista la cohorte para liquidacion mensual o Stripe Connect, sin esconder el split dentro del checkout.
                </p>
                <label>
                  Revenue share habilitado
                  <select name="revenue_share_enabled">
                    <option value="true" ?selected=${revenueShareAuthoring.enabled}>true</option>
                    <option value="false" ?selected=${!revenueShareAuthoring.enabled}>false</option>
                  </select>
                </label>
                <label>
                  Settlement mode
                  <select name="revenue_share_settlement_mode">
                    <option
                      value="manual_monthly"
                      ?selected=${revenueShareAuthoring.settlementMode === "manual_monthly"}
                    >
                      manual_monthly | cierre T+15
                    </option>
                    <option
                      value="stripe_connect_destination_charge"
                      ?selected=${revenueShareAuthoring.settlementMode === "stripe_connect_destination_charge"}
                    >
                      stripe_connect_destination_charge | split inmediato
                    </option>
                  </select>
                </label>
                <label>Moneda<input name="revenue_share_currency" value="${revenueShareAuthoring.currency}" /></label>
                <div class="editor-grid">
                  <label>
                    % plataforma
                    <input
                      type="number"
                      name="revenue_share_platform_percent"
                      min="0"
                      max="100"
                      step="0.01"
                      value="${String(revenueShareAuthoring.platformPercent)}"
                    />
                  </label>
                  <label>
                    % docente
                    <input
                      type="number"
                      name="revenue_share_teacher_percent"
                      min="0"
                      max="100"
                      step="0.01"
                      value="${String(revenueShareAuthoring.teacherPercent)}"
                    />
                  </label>
                </div>
                <label>Teacher person_id<input name="revenue_share_teacher_person_id" value="${revenueShareAuthoring.teacherPersonId}" /></label>
                <label>
                  Nombre visible del docente
                  <input name="revenue_share_teacher_display_name" value="${revenueShareAuthoring.teacherDisplayName}" />
                </label>
                <label>
                  Stripe account ID
                  <input
                    name="revenue_share_teacher_stripe_account_id"
                    value="${revenueShareAuthoring.stripeAccountId}"
                    placeholder="acct_..."
                  />
                </label>
              </div>

              <div class="editor-card">
                <span class="surface-note">settlement</span>
                <h4>Ventana y modo Connect</h4>
                <p>
                  Usa modo manual mientras firmas condiciones del docente. Cambia a Connect cuando ya exista <code>acct_*</code>.
                </p>
                <label>
                  Ventana de liquidacion (dias)
                  <input
                    type="number"
                    name="revenue_share_settlement_window_days"
                    min="0"
                    value="${String(revenueShareAuthoring.settlementWindowDays)}"
                  />
                </label>
                <label>
                  Minimo liquidable (minor units)
                  <input
                    type="number"
                    name="revenue_share_minimum_amount_minor"
                    min="0"
                    value="${String(revenueShareAuthoring.minimumAmountMinor)}"
                  />
                </label>
                <label>
                  on_behalf_of en Connect
                  <select name="revenue_share_on_behalf_of">
                    <option value="true" ?selected=${revenueShareAuthoring.onBehalfOf}>true</option>
                    <option value="false" ?selected=${!revenueShareAuthoring.onBehalfOf}>false</option>
                  </select>
                </label>
                <p>${revenueShareAuthoring.summary}</p>
                <p>
                  El split Connect solo corre en live cuando la cohorte tiene <code>stripe_account_id</code> y el proyecto remoto cuenta con secretos Stripe publicados.
                </p>
              </div>
            </div>
            <div class="editor-grid">
              <div class="editor-card">
                <span class="surface-note">oneroster</span>
                <h4>Roster sync B2B por cohorte</h4>
                <p>
                  Este carril consume roster OneRoster 1.2 como consumer pull y deja cada seat auditado antes de tocar la matricula real.
                </p>
                <label>
                  OneRoster habilitado
                  <select name="oneroster_enabled">
                    <option value="true" ?selected=${onerosterAuthoring.enabled}>true</option>
                    <option value="false" ?selected=${!onerosterAuthoring.enabled}>false</option>
                  </select>
                </label>
                <label>Base URL del proveedor<input name="oneroster_base_url" value="${onerosterAuthoring.baseUrl}" placeholder="https://district.example.com/ims/oneroster/rostering/v1p2" /></label>
                <div class="editor-grid">
                  <label>school sourcedId<input name="oneroster_school_sourced_id" value="${onerosterAuthoring.schoolSourcedId}" /></label>
                  <label>class sourcedId<input name="oneroster_class_sourced_id" value="${onerosterAuthoring.classSourcedId}" /></label>
                </div>
                <label>Nombre del secreto bearer<input name="oneroster_token_secret_name" value="${onerosterAuthoring.tokenSecretName}" placeholder="ONEROSTER_POWER_SKILLS_TOKEN" /></label>
                <label>
                  Provision mode
                  <select name="oneroster_provision_mode">
                    <option value="match_only" ?selected=${onerosterAuthoring.provisionMode === "match_only"}>match_only | solo vincula emails ya existentes</option>
                    <option value="invite_missing" ?selected=${onerosterAuthoring.provisionMode === "invite_missing"}>invite_missing | invita faltantes</option>
                  </select>
                </label>
              </div>

              <div class="editor-card">
                <span class="surface-note">policy</span>
                <h4>Invites y ventana de sync</h4>
                <p>
                  Usa <code>match_only</code> como modo seguro por defecto y activa invites solo cuando el cliente ya aprobó el onboarding automático.
                </p>
                <label>Redirect post-invite<input name="oneroster_invite_redirect_path" value="${onerosterAuthoring.inviteRedirectPath}" /></label>
                <label>
                  Sincronizar roles docentes
                  <select name="oneroster_sync_teacher_roles">
                    <option value="true" ?selected=${onerosterAuthoring.syncTeacherRoles}>true</option>
                    <option value="false" ?selected=${!onerosterAuthoring.syncTeacherRoles}>false</option>
                  </select>
                </label>
                <div class="editor-grid">
                  <label>
                    Page limit
                    <input type="number" name="oneroster_request_limit" min="1" max="500" value="${String(onerosterAuthoring.requestLimit)}" />
                  </label>
                  <label>
                    Timeout ms
                    <input type="number" name="oneroster_timeout_ms" min="1000" max="60000" step="1000" value="${String(onerosterAuthoring.timeoutMs)}" />
                  </label>
                </div>
                <p>${onerosterAuthoring.summary}</p>
                <p>
                  El secreto no se guarda en base de datos; aqui solo se persiste el nombre del secret publicado en Supabase Functions.
                </p>
              </div>
            </div>
            <div class="utility">
              <button type="submit">Guardar cohorte</button>
              <button type="button" @click=${() => void this.handleOneRosterSync()}>
                Sincronizar OneRoster ahora
              </button>
            </div>
          </form>
        </div>

        <div class="panel">
          <h3>Estado OneRoster</h3>
          ${activeRunSyncs.length
            ? html`
                <div class="mastery-list">
                  ${activeRunSyncs.map((sync) => html`
                    <div class="editor-card">
                      <span class="surface-note">${sync.status} | ${sync.direction}</span>
                      <h4>${sync.runTitle}</h4>
                      <ul>
                        <li>Iniciada: ${sync.startedAt ? formatDateTime(sync.startedAt, this.locale) : "sin fecha"}</li>
                        <li>Seats procesados: ${String(sync.processedSeats)}</li>
                        <li>Match local: ${String(sync.matchedSeats)}</li>
                        <li>Invitados: ${String(sync.invitedSeats)}</li>
                        <li>Matriculados: ${String(sync.enrolledSeats)}</li>
                        <li>Docentes: ${String(sync.teacherRoleSeats)}</li>
                        <li>Saltados: ${String(sync.skippedSeats)}</li>
                        <li>Errores: ${String(sync.failedSeats)}</li>
                      </ul>
                      ${sync.errorMessage ? html`<p>${sync.errorMessage}</p>` : null}
                    </div>
                  `)}
                </div>
              `
            : html`<p>Aun no hay corridas OneRoster registradas para la cohorte activa.</p>`}

          <details>
            <summary>Seats recientes</summary>
            ${activeRunSeats.length
              ? html`
                  <div class="mastery-list">
                    ${activeRunSeats.map((seat) => html`
                      <div class="editor-card">
                        <span class="surface-note">${seat.syncState} | ${seat.roleCode}</span>
                        <h4>${seat.userName || seat.userEmail || seat.userSourcedId}</h4>
                        <ul>
                          <li>Email: ${seat.userEmail || "sin email"}</li>
                          <li>User sourcedId: ${seat.userSourcedId}</li>
                          <li>Enrollment sourcedId: ${seat.enrollmentSourcedId}</li>
                          <li>Estado externo: ${seat.externalStatus}</li>
                          <li>Ultima vez visto: ${seat.lastSeenAt ? formatDateTime(seat.lastSeenAt, this.locale) : "sin fecha"}</li>
                        </ul>
                        ${seat.syncNote ? html`<p>${seat.syncNote}</p>` : null}
                      </div>
                    `)}
                  </div>
                `
              : html`<p>No hay seats importados todavia.</p>`}
          </details>
        </div>

        <div class="panel">
          <h3>Bloque</h3>
          ${snapshotData.blocks.length
            ? html`
                <label>
                  Bloque activo
                  <select @change=${(event: Event) => this.handleBlockSelection(event)}>
                    ${snapshotData.blocks.map((entry) => html`
                      <option value=${entry.slug} ?selected=${entry.slug === block?.slug}>
                        ${entry.position}. ${entry.title}
                      </option>
                    `)}
                  </select>
                </label>
              `
            : null}
          <form @submit=${(event: Event) => this.handleSubmit(event, "upsert-block")}>
            <input type="hidden" name="course_slug" value="${course?.slug || this.courseSlug}" />
            <label>Block slug<input name="block_slug" value="${block?.slug || "nuevo-bloque"}" required /></label>
            <label>Titulo<input name="title" value="${block?.title || ""}" required /></label>
            <label>Resumen<textarea name="summary">${block?.summary || ""}</textarea></label>
            <label>Objetivo<textarea name="objective">${block?.objective || ""}</textarea></label>
            <label>Posicion<input type="number" name="position" min="1" value="${String(block?.position || 1)}" /></label>
            <label>Duracion (min)<input type="number" name="duration_minutes" min="5" value="${String(block?.duration_minutes || 15)}" /></label>
            <label>
              Competencia primaria
              <select name="competency_slug">
                ${competenciesManifest.map((competency) => html`
                  <option
                    value=${competency.slug}
                    ?selected=${(block?.competency_slug || competenciesManifest[0]?.slug || "") === competency.slug}
                  >
                    ${competency.title}
                  </option>
                `)}
              </select>
            </label>
            <label>
              Bloom level
              <select name="bloom_level">
                <option value="recordar" ?selected=${block?.bloom_level === "recordar"}>recordar</option>
                <option value="comprender" ?selected=${!block || block.bloom_level === "comprender"}>comprender</option>
                <option value="aplicar" ?selected=${block?.bloom_level === "aplicar"}>aplicar</option>
                <option value="analizar" ?selected=${block?.bloom_level === "analizar"}>analizar</option>
                <option value="evaluar" ?selected=${block?.bloom_level === "evaluar"}>evaluar</option>
                <option value="crear" ?selected=${block?.bloom_level === "crear"}>crear</option>
              </select>
            </label>
            <label>
              Tipo de bloque
              <select name="kind" @change=${(event: Event) => this.handleKindSelection(event)}>
                <option value="video" ?selected=${matchesCanonicalKind(selectedKind, "video")}>video | clase, demo o walkthrough</option>
                <option value="quiz" ?selected=${matchesCanonicalKind(selectedKind, "quiz")}>quiz | practica evaluable</option>
                <option value="reading" ?selected=${matchesCanonicalKind(selectedKind, "reading")}>reading | lectura, guia o recurso</option>
                <option value="interactive" ?selected=${matchesCanonicalKind(selectedKind, "interactive")}>interactive | experiencia guiada</option>
                <option value="project" ?selected=${matchesCanonicalKind(selectedKind, "project")}>project | entrega o cierre</option>
              </select>
            </label>
            <label>
              Publico
              <select name="is_public">
                <option value="true" ?selected=${Boolean(block?.is_public)}>true</option>
                <option value="false" ?selected=${!block?.is_public}>false</option>
              </select>
            </label>

            <div class="editor-grid">
              <div class="editor-card">
                <span class="surface-note">authoring guiado</span>
                <h4>Contenido y renderer</h4>
                <p>
                  Esta superficie cubre el caso editorial principal y luego deja el JSON completo como modo avanzado.
                </p>
                <label>Renderer component<input name="renderer_component" value="${authoring.component}" /></label>
                <label>ARIA role<input name="renderer_role" value="${authoring.a11yRole}" /></label>
                <label>ARIA label<input name="renderer_aria_label" value="${authoring.ariaLabel}" /></label>
                <label>
                  Offline capable
                  <select name="renderer_offline_capable">
                    <option value="true" ?selected=${authoring.offlineCapable}>true</option>
                    <option value="false" ?selected=${!authoring.offlineCapable}>false</option>
                  </select>
                </label>
                <label>
                  Dictado por voz en campos textuales
                  <select name="assistive_voice_dictation">
                    <option value="true" ?selected=${expressionAuthoring.voiceDictationEnabled}>true</option>
                    <option value="false" ?selected=${!expressionAuthoring.voiceDictationEnabled}>false</option>
                  </select>
                </label>
                <p>
                  Activa soporte de voz cuando el bloque acepta respuesta escrita y quieres dejarlo visible como ayuda DUA.
                </p>
                ${this.renderKindSpecificFields(selectedKind, authoring, snapshotData.rubrics)}
              </div>

              <div class="editor-card">
                <span class="surface-note">lectura rapida</span>
                <h4>Resumen del bloque</h4>
                <p>
                  El objetivo es que el docente piense en contenido y entrega, no en la forma interna del renderer manifest.
                </p>
                ${this.renderRendererSummary(
                  selectedKind,
                  authoring,
                  expressionAuthoring.voiceDictationEnabled,
                  snapshotData.rubrics
                )}
              </div>
            </div>

            <details>
              <summary>Contrato avanzado (JSON)</summary>
              <p>
                Contrato DUA minimo: modes >= 2, alt_text, accepted_formats >= 1, choice_points >= 1.
              </p>
              <label>
                Renderer manifest (JSON)
                <textarea name="renderer_manifest">${formatJson(
                  block?.renderer_manifest || defaultContract.rendererManifest
                )}</textarea>
              </label>
              <label>
                Representation variants (JSON)
                <textarea name="representation_variants">${formatJson(
                  block?.representation_variants || defaultContract.representationVariants
                )}</textarea>
              </label>
              <label>
                Expression variants (JSON)
                <textarea name="expression_variants">${formatJson(
                  block?.expression_variants || defaultContract.expressionVariants
                )}</textarea>
              </label>
              <label>
                Engagement hooks (JSON)
                <textarea name="engagement_hooks">${formatJson(
                  block?.engagement_hooks || defaultContract.engagementHooks
                )}</textarea>
              </label>
            </details>

            <button type="submit">Guardar bloque</button>
          </form>
        </div>
      </div>

      <div class="grid">
        <div class="panel">
          <h3>Rubricas</h3>
          ${snapshotData.rubrics.length
            ? html`
                <label>
                  Rubrica activa
                  <select @change=${(event: Event) => this.handleRubricSelection(event)}>
                    ${snapshotData.rubrics.map((rubric) => html`
                      <option value=${rubric.slug} ?selected=${rubric.slug === activeRubric?.slug}>
                        ${rubric.title}
                      </option>
                    `)}
                  </select>
                </label>
              `
            : null}
          <form @submit=${(event: Event) => this.handleSubmit(event, "upsert-rubric")}>
            <input type="hidden" name="course_slug" value="${course?.slug || this.courseSlug}" />
            <label>Rubric slug<input name="rubric_slug" value="${rubricAuthoring.slug}" required /></label>
            <label>Titulo<input name="rubric_title" value="${rubricAuthoring.title}" required /></label>
            <label>Resumen<textarea name="rubric_summary">${rubricAuthoring.summary}</textarea></label>
            <label>
              Estado
              <select name="rubric_status">
                <option value="draft" ?selected=${rubricAuthoring.status === "draft"}>draft</option>
                <option value="published" ?selected=${rubricAuthoring.status === "published"}>published</option>
                <option value="archived" ?selected=${rubricAuthoring.status === "archived"}>archived</option>
              </select>
            </label>
            <label>
              Escala maxima
              <input type="number" name="rubric_scale_max" min="2" max="10" value="${String(rubricAuthoring.scaleMax)}" />
            </label>
            <label>
              Criterios de la rubrica (JSON)
              <textarea name="rubric_criteria_json">${rubricAuthoring.criteriaJson}</textarea>
            </label>
            <button type="submit">Guardar rubrica</button>
          </form>
        </div>

        <div class="panel">
          <h3>Revision manual</h3>
          ${snapshotData.submissions.length
            ? html`
                <label>
                  Entrega activa
                  <select @change=${(event: Event) => this.handleSubmissionSelection(event)}>
                    ${snapshotData.submissions.map((submission) => html`
                      <option value=${String(submission.id)} ?selected=${submission.id === activeSubmission?.id}>
                        ${submission.learnerName || submission.learnerEmail || "Learner"} | ${submission.blockTitle} | ${submission.status}
                      </option>
                    `)}
                  </select>
                </label>
              `
            : html`<p>No hay entregas de proyecto registradas todavia.</p>`}
          ${activeSubmission
            ? html`
                <div class="editor-card">
                  <span class="surface-note">evidencia recibida</span>
                  <h4>${activeSubmission.blockTitle}</h4>
                  <p>${activeSubmission.learnerName || activeSubmission.learnerEmail || "Learner sin nombre"} | ${activeSubmission.rubricTitle}</p>
                  <ul>
                    <li>Estado actual: ${activeSubmission.status}</li>
                    <li>Enviada: ${formatDateTime(activeSubmission.submittedAt, this.locale)}</li>
                    <li>Evidencia URL: ${activeSubmission.submissionUrl || "sin enlace"}</li>
                  </ul>
                  ${activeSubmission.submissionText
                    ? html`<p>${activeSubmission.submissionText}</p>`
                    : html`<p>La entrega no incluye texto largo.</p>`}
                </div>
                <form @submit=${(event: Event) => this.handleReviewSubmission(event)}>
                  <input type="hidden" name="submission_id" value="${String(activeSubmission.id)}" />
                  <label>
                    Resultado
                    <select name="review_status">
                      <option value="reviewed" ?selected=${activeSubmission.status !== "changes_requested"}>reviewed</option>
                      <option value="changes_requested" ?selected=${activeSubmission.status === "changes_requested"}>changes_requested</option>
                    </select>
                  </label>
                  ${submissionReview.map((criterion) => html`
                    <div class="editor-card">
                      <h4>${criterion.title}</h4>
                      <p>${criterion.description || "Sin descripcion adicional."}</p>
                      <label>
                        Score (${activeSubmission.rubricScaleMax} max)
                        <input
                          type="number"
                          name=${`review_score_${criterion.slug}`}
                          min="0"
                          max=${String(activeSubmission.rubricScaleMax)}
                          step="1"
                          value=${String(criterion.score)}
                        />
                      </label>
                      <label>
                        Nota por criterio
                        <textarea name=${`review_note_${criterion.slug}`}>${criterion.note}</textarea>
                      </label>
                    </div>
                  `)}
                  <label>
                    Feedback global
                    <textarea name="review_note">${activeSubmission.reviewNote}</textarea>
                  </label>
                  <button type="submit">Guardar revision</button>
                </form>
              `
            : null}
        </div>
      </div>

      <div class="grid">
        <div class="panel">
          <h3>Notificaciones por cohorte</h3>
          ${snapshotData.notificationTemplates.length
            ? html`
                <label>
                  Plantilla activa
                  <select @change=${(event: Event) => this.handleNotificationSelection(event)}>
                    ${snapshotData.notificationTemplates.map((template) => html`
                      <option value=${template.slug} ?selected=${template.slug === activeNotificationTemplate?.slug}>
                        ${template.runTitle} | ${template.title}
                      </option>
                    `)}
                  </select>
                </label>
              `
            : null}
          <form @submit=${(event: Event) => this.handleSubmit(event, "upsert-notification-template")}>
            <input type="hidden" name="course_slug" value="${course?.slug || this.courseSlug}" />
            <label>
              Cohorte
              <select name="run_slug">
                ${snapshotData.runs.map((entry) => html`
                  <option value=${entry.slug} ?selected=${entry.slug === notificationAuthoring.runSlug}>
                    ${entry.title}
                  </option>
                `)}
              </select>
            </label>
            <label>Template slug<input name="template_slug" value="${notificationAuthoring.slug}" required /></label>
            <label>Titulo<input name="title" value="${notificationAuthoring.title}" required /></label>
            <label>
              Canal
              <select name="channel_code">
                <option value="email" ?selected=${notificationAuthoring.channelCode === "email"}>email</option>
                <option value="web" ?selected=${notificationAuthoring.channelCode === "web"}>web</option>
              </select>
            </label>
            <label>
              Audiencia
              <select name="audience_code">
                <option value="active" ?selected=${notificationAuthoring.audienceCode === "active"}>active</option>
                <option value="invited" ?selected=${notificationAuthoring.audienceCode === "invited"}>invited</option>
                <option value="completed" ?selected=${notificationAuthoring.audienceCode === "completed"}>completed</option>
                <option value="all" ?selected=${notificationAuthoring.audienceCode === "all"}>all</option>
              </select>
            </label>
            <label>
              Trigger
              <select name="trigger_code">
                <option value="manual" ?selected=${notificationAuthoring.triggerCode === "manual"}>manual</option>
                <option value="before_run_start" ?selected=${notificationAuthoring.triggerCode === "before_run_start"}>before_run_start</option>
                <option value="after_run_start" ?selected=${notificationAuthoring.triggerCode === "after_run_start"}>after_run_start</option>
                <option value="after_run_end" ?selected=${notificationAuthoring.triggerCode === "after_run_end"}>after_run_end</option>
              </select>
            </label>
            <div class="editor-grid">
              <label>Offset days
                <input type="number" name="offset_days" value="${String(notificationAuthoring.offsetDays)}" />
              </label>
              <label>Offset hours
                <input type="number" name="offset_hours" value="${String(notificationAuthoring.offsetHours)}" />
              </label>
            </div>
            <label>Subject template<input name="subject_template" value="${notificationAuthoring.subjectTemplate}" /></label>
            <label>Body template<textarea name="body_template">${notificationAuthoring.bodyTemplate}</textarea></label>
            <label>CTA label<input name="cta_label" value="${notificationAuthoring.ctaLabel}" /></label>
            <label>CTA url<input name="cta_url" value="${notificationAuthoring.ctaUrl}" /></label>
            <label>
              Estado
              <select name="status">
                <option value="draft" ?selected=${notificationAuthoring.status === "draft"}>draft</option>
                <option value="active" ?selected=${notificationAuthoring.status === "active"}>active</option>
                <option value="archived" ?selected=${notificationAuthoring.status === "archived"}>archived</option>
              </select>
            </label>
            <div class="utility">
              <button type="submit">Guardar plantilla</button>
              <button type="button" @click=${() => void this.handleNotificationDispatch("dispatch-template")}>
                Enviar ahora
              </button>
              <button type="button" @click=${() => void this.handleNotificationDispatch("process-due")}>
                Procesar secuencia
              </button>
            </div>
          </form>
        </div>

        <div class="panel">
          <h3>Despachos recientes</h3>
          ${snapshotData.notificationDispatches.length
            ? html`
                <div class="mastery-list">
                  ${snapshotData.notificationDispatches.map((dispatch) => html`
                    <div class="editor-card">
                      <span class="surface-note">${dispatch.channelCode} | ${dispatch.status}</span>
                      <h4>${dispatch.templateTitle}</h4>
                      <p>${dispatch.personName || dispatch.personEmail || dispatch.personId}</p>
                      <ul>
                        <li>Cohorte: ${dispatch.runTitle}</li>
                        <li>Programada: ${dispatch.scheduledFor ? formatDateTime(dispatch.scheduledFor, this.locale) : "sin fecha"}</li>
                        <li>Enviada: ${dispatch.sentAt ? formatDateTime(dispatch.sentAt, this.locale) : "pendiente"}</li>
                      </ul>
                      <p>${dispatch.renderedSubject}</p>
                      ${dispatch.errorMessage ? html`<p>${dispatch.errorMessage}</p>` : null}
                    </div>
                  `)}
                </div>
              `
            : html`<p>Aun no hay despachos registrados para la cohorte activa.</p>`}
        </div>
      </div>

      <div class="panel">
        <h3>Snapshot actual</h3>
        <ul>
          <li>Runs: ${runsCount}</li>
          <li>Blocks: ${blocksCount}</li>
          <li>Competencies: ${competenciesCount}</li>
          <li>Notification templates: ${notificationTemplatesCount}</li>
          <li>Notification dispatches: ${notificationDispatchesCount}</li>
          <li>OneRoster syncs: ${onerosterSyncsCount}</li>
          <li>OneRoster seats: ${onerosterSeatsCount}</li>
          <li>Rubrics: ${rubricsCount}</li>
          <li>Project submissions: ${submissionsCount}</li>
          <li>Teacher reports: ${reportsCount}</li>
          <li>Curso: ${course?.title || "sin curso"}</li>
          <li>Bloque activo: ${block?.title || "sin bloque"}</li>
        </ul>
      </div>
    `;
  }

  render() {
    return html`
      ${this.loading ? html`<div class="message">Cargando operacion...</div>` : null}
      ${this.message ? html`<div class="message">${this.message}</div>` : null}
      ${this.errorMessage ? html`<div class="error">${this.errorMessage}</div>` : null}
      ${!this.loading && !this.snapshot ? this.renderSignedOut() : null}
      ${!this.loading && this.snapshot ? this.renderForms() : null}
    `;
  }
}

if (!customElements.get("admin-console")) {
  customElements.define("admin-console", AdminConsoleElement);
}
