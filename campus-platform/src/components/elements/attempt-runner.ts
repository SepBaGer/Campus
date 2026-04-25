import { LitElement, css, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import {
  startBrowserVoiceInput,
  supportsBrowserVoiceInput,
  type BrowserVoiceInputSession,
  type VoiceInputErrorCode
} from "../../lib/browser-voice-input";
import {
  completeLearningAttempt,
  initiateLtiLaunchForBrowser,
  isBrowserLiveMode
} from "../../lib/browser-platform";
import {
  formatDateTime,
  LOCALE_CHANGE_EVENT,
  getActiveLocale,
  translate,
  type SupportedLocale
} from "../../lib/i18n";
import { resolveLtiLaunchConfig } from "../../lib/lti-config";
import type { AttemptCompletionResult } from "../../lib/platform-types";
import { renderRendererMarkdownToHtml } from "../../lib/rich-text-markdown";

type DictationField = "submissionText" | "learnerNote";

class AttemptRunnerElement extends LitElement {
  static properties = {
    title: { type: String },
    summary: { type: String },
    ctaLabel: { type: String, attribute: "cta-label" },
    courseSlug: { type: String, attribute: "course-slug" },
    badgeClassSlug: { type: String, attribute: "badge-class-slug" },
    contentBlockId: { type: Number, attribute: "content-block-id" },
    blockKind: { type: String, attribute: "block-kind" },
    rubricTitle: { type: String, attribute: "rubric-title" },
    voiceDictation: { type: String, attribute: "voice-dictation" },
    rendererManifest: { type: String, attribute: "renderer-manifest" },
    completed: { state: true },
    loading: { state: true },
    errorMessage: { state: true },
    result: { state: true },
    submissionText: { state: true },
    submissionUrl: { state: true },
    learnerNote: { state: true },
    voiceSupported: { state: true },
    voiceField: { state: true },
    voiceMessage: { state: true },
    interactiveToolBusy: { state: true },
    interactiveToolOpened: { state: true },
    interactiveLaunchUrl: { state: true },
    interactiveMessage: { state: true },
    locale: { state: true }
  };

  title = "";
  summary = "";
  ctaLabel = "";
  courseSlug = "programa-empoderamiento-power-skills";
  badgeClassSlug = "badge-power-skills-pilot";
  contentBlockId = 0;
  blockKind = "reading";
  rubricTitle = "";
  voiceDictation = "disabled";
  rendererManifest = "{}";
  completed = false;
  loading = false;
  errorMessage = "";
  result: AttemptCompletionResult | null = null;
  submissionText = "";
  submissionUrl = "";
  learnerNote = "";
  voiceSupported = false;
  voiceField: DictationField | "" = "";
  voiceMessage = "";
  interactiveToolBusy = false;
  interactiveToolOpened = false;
  interactiveLaunchUrl = "";
  interactiveMessage = "";
  locale: SupportedLocale = getActiveLocale();
  private voiceSession: BrowserVoiceInputSession | null = null;
  private readonly handleLocaleChange = (event: Event) => {
    this.locale = (event as CustomEvent<{ locale?: SupportedLocale }>).detail?.locale || getActiveLocale();
  };

  static styles = css`
    :host {
      display: grid;
      gap: 1rem;
      padding: 1.15rem;
      border-radius: 22px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-panel, rgba(255, 255, 255, 0.82));
      color: var(--brand-text, #0f172a);
    }

    h3,
    p,
    ul {
      margin: 0;
    }

    p {
      color: var(--brand-text-soft, #334155);
      line-height: 1.65;
    }

    button,
    a {
      display: inline-flex;
      min-height: 44px;
      padding: 0.75rem 1rem;
      border-radius: 18px;
      font-weight: 700;
      text-decoration: none;
      border: 1px solid transparent;
    }

    button {
      background: var(--brand-gold, #b88700);
      color: var(--brand-dark, #09162c);
      cursor: pointer;
    }

    button[disabled] {
      opacity: 0.72;
      cursor: wait;
    }

    a {
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      color: var(--brand-gold, #b88700);
      justify-content: center;
      border-color: var(--brand-border-strong, rgba(184, 135, 0, 0.28));
    }

    input,
    textarea {
      display: block;
      width: 100%;
      min-height: 44px;
      padding: 0.75rem 1rem;
      border-radius: 18px;
      background: var(--surface-input, rgba(255, 255, 255, 0.86));
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      color: var(--brand-text, #0f172a);
      font: inherit;
    }

    textarea {
      min-height: 8rem;
      resize: vertical;
    }

    label {
      display: grid;
      gap: 0.35rem;
      color: var(--brand-text-soft, #334155);
      font-weight: 700;
    }

    .stack {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .done,
    .error,
    .message {
      padding: 0.9rem 1rem;
      border: 1px solid transparent;
      border-radius: 16px;
    }

    .done {
      background: var(--positive-bg, rgba(220, 252, 231, 0.92));
      border-color: var(--positive-border, rgba(22, 101, 52, 0.18));
      color: var(--positive-text, #166534);
    }

    .error {
      background: var(--danger-bg, rgba(254, 242, 242, 0.96));
      border-color: var(--danger-border, rgba(185, 28, 28, 0.16));
      color: var(--danger-text, #b91c1c);
    }

    .message {
      background: var(--info-bg, rgba(239, 246, 255, 0.96));
      border-color: var(--info-border, rgba(29, 78, 216, 0.14));
      color: var(--info-text, #1d4ed8);
    }

    ul {
      padding-left: 1rem;
      color: var(--brand-text-soft, #334155);
      line-height: 1.7;
    }

    .submission-form {
      display: grid;
      gap: 0.85rem;
    }

    .voice-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .lesson-content {
      display: grid;
      gap: 0.8rem;
      padding: 1rem 1.05rem;
      border-radius: 18px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-card, rgba(255, 255, 255, 0.97));
    }

    .lesson-content blockquote {
      margin: 0;
      padding-left: 1rem;
      border-left: 3px solid var(--brand-gold, #b88700);
      color: var(--brand-text-soft, #334155);
    }

    .lesson-content pre {
      margin: 0;
      overflow: auto;
      padding: 0.95rem 1rem;
      border-radius: 16px;
      background: var(--surface-tint, rgba(15, 23, 42, 0.04));
    }

    .lesson-content img {
      border-radius: 16px;
      max-width: 100%;
      height: auto;
    }

    .lesson-content a {
      color: var(--brand-gold, #b88700);
      font-weight: 700;
    }

    .voice-button {
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      color: var(--brand-gold, #b88700);
      border-color: var(--brand-border-strong, rgba(184, 135, 0, 0.28));
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.voiceSupported = supportsBrowserVoiceInput();
    window.addEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
  }

  disconnectedCallback() {
    this.stopVoiceInput();
    window.removeEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
    super.disconnectedCallback();
  }

  get voiceEnabled() {
    return this.voiceDictation === "enabled";
  }

  get parsedRendererManifest() {
    try {
      return JSON.parse(this.rendererManifest || "{}");
    } catch {
      return {};
    }
  }

  get ltiLaunchConfig() {
    return resolveLtiLaunchConfig(this.parsedRendererManifest);
  }

  get interactiveLaunchReady() {
    return this.blockKind === "interactive" && this.ltiLaunchConfig.isConfigured;
  }

  get renderedLessonHtml() {
    return renderRendererMarkdownToHtml(this.blockKind, this.parsedRendererManifest);
  }

  stopVoiceInput() {
    this.voiceSession?.stop();
    this.voiceSession = null;
    this.voiceField = "";
  }

  appendTranscript(currentValue: string, transcript: string) {
    const normalizedCurrent = currentValue.trim();
    const normalizedTranscript = transcript.trim();

    if (!normalizedCurrent) {
      return normalizedTranscript;
    }

    return `${normalizedCurrent}\n${normalizedTranscript}`;
  }

  resolveVoiceErrorMessage(code: VoiceInputErrorCode) {
    switch (code) {
      case "not-allowed":
        return translate(this.locale, "attempt.voice.error.notAllowed");
      case "no-speech":
        return translate(this.locale, "attempt.voice.error.noSpeech");
      case "audio-capture":
        return translate(this.locale, "attempt.voice.error.audioCapture");
      case "network":
        return translate(this.locale, "attempt.voice.error.network");
      case "unsupported":
        return translate(this.locale, "attempt.voice.error.unsupported");
      default:
        return translate(this.locale, "attempt.voice.error.generic");
    }
  }

  async handleVoiceToggle(field: DictationField, fieldLabel: string) {
    if (!this.voiceEnabled) {
      return;
    }

    if (!this.voiceSupported) {
      this.errorMessage = translate(this.locale, "attempt.voice.error.unsupported");
      return;
    }

    if (this.voiceField === field) {
      this.stopVoiceInput();
      this.voiceMessage = "";
      return;
    }

    this.stopVoiceInput();
    this.errorMessage = "";
    this.voiceMessage = translate(this.locale, "attempt.voice.listening", { fieldLabel });

    try {
      this.voiceField = field;
      this.voiceSession = startBrowserVoiceInput({
        locale: this.locale,
        onTranscript: (transcript) => {
          const nextValue = this.appendTranscript(this[field], transcript);
          this[field] = nextValue;
          this.voiceMessage = translate(this.locale, "attempt.voice.appended", { fieldLabel });
          this.requestUpdate();
        },
        onError: (code) => {
          this.errorMessage = this.resolveVoiceErrorMessage(code);
          this.voiceField = "";
          this.voiceSession = null;
          this.requestUpdate();
        },
        onEnd: () => {
          this.voiceField = "";
          this.voiceSession = null;
          this.requestUpdate();
        }
      });
    } catch {
      this.errorMessage = translate(this.locale, "attempt.voice.error.unsupported");
      this.voiceField = "";
      this.voiceSession = null;
    }
  }

  async handleComplete() {
    this.stopVoiceInput();
    this.loading = true;
    this.errorMessage = "";

    try {
      if (!this.contentBlockId) {
        this.completed = true;
        return;
      }

      if (this.blockKind === "project" && !this.submissionText.trim() && !this.submissionUrl.trim()) {
        throw new Error(translate(this.locale, "attempt.project.missing"));
      }

      if (this.blockKind === "interactive" && this.interactiveLaunchReady && !this.interactiveToolOpened) {
        throw new Error(translate(this.locale, "attempt.interactive.notLaunched"));
      }

      const result = await completeLearningAttempt({
        contentBlockId: this.contentBlockId,
        courseSlug: this.courseSlug,
        badgeClassSlug: this.badgeClassSlug,
        submissionText: this.submissionText,
        submissionUrl: this.submissionUrl,
        learnerNote: this.learnerNote,
        payload: {
          source_component: "attempt-runner"
        }
      });

      this.result = result;
      this.completed = true;
      this.dispatchEvent(new CustomEvent<AttemptCompletionResult>("attempt-completed", {
        detail: result,
        bubbles: true,
        composed: true
      }));
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.loading = false;
    }
  }

  async handleLaunchInteractive() {
    if (!this.interactiveLaunchReady) {
      this.errorMessage = translate(this.locale, "attempt.interactive.unconfigured");
      return;
    }

    this.interactiveToolBusy = true;
    this.errorMessage = "";
    this.interactiveMessage = translate(this.locale, "attempt.interactive.launching", {
      toolTitle: this.ltiLaunchConfig.title
    });

    try {
      if (!isBrowserLiveMode()) {
        this.interactiveToolOpened = true;
        this.interactiveMessage = translate(this.locale, "attempt.interactive.demo", {
          toolTitle: this.ltiLaunchConfig.title
        });
        return;
      }

      const presentation = this.ltiLaunchConfig.launchPresentation;
      const blankWindow = presentation === "window"
        ? window.open("about:blank", "_blank", "noopener")
        : null;
      const launch = await initiateLtiLaunchForBrowser({
        contentBlockId: this.contentBlockId,
        returnUrl: window.location.href
      });

      this.interactiveToolOpened = true;

      if (launch.launchPresentation === "iframe") {
        this.interactiveLaunchUrl = launch.launchUrl;
        this.interactiveMessage = translate(this.locale, "attempt.interactive.embedded", {
          toolTitle: launch.toolTitle
        });
        return;
      }

      const openedWindow = blankWindow || window.open(launch.launchUrl, "_blank", "noopener");
      if (openedWindow) {
        openedWindow.location.href = launch.launchUrl;
        this.interactiveLaunchUrl = "";
        this.interactiveMessage = translate(this.locale, "attempt.interactive.opened", {
          toolTitle: launch.toolTitle
        });
      } else {
        this.interactiveLaunchUrl = launch.launchUrl;
        this.interactiveMessage = translate(this.locale, "attempt.interactive.embedded", {
          toolTitle: launch.toolTitle
        });
      }
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.interactiveToolOpened = false;
      this.interactiveLaunchUrl = "";
      this.interactiveMessage = "";
    } finally {
      this.interactiveToolBusy = false;
    }
  }

  renderResult() {
    if (!this.result) {
      return html`<div class="done">${translate(this.locale, "attempt.done.default")}</div>`;
    }

    const verificationPath = this.result.credential ? `/verify/${this.result.credential.token}` : "";
    const completionLabel = this.result.credential?.reused
      ? translate(this.locale, "attempt.completion.recovered")
      : this.result.credential
        ? translate(this.locale, "attempt.completion.issued")
        : this.result.reviewRequired
          ? translate(this.locale, "attempt.completion.submission")
          : translate(this.locale, "attempt.completion.progress");
    const rubricSuffix = this.result.rubricTitle
      ? translate(this.locale, "attempt.review.suffix", { rubricTitle: this.result.rubricTitle })
      : "";
    const nextReviewAt = formatDateTime(this.result.nextReviewAt, this.locale);

    return html`
      <div class="done">
        <strong>${completionLabel}</strong>
        <p>
          ${this.result.reviewRequired
            ? translate(this.locale, "attempt.review.waiting", {
                title: this.result.contentBlockTitle,
                rubricSuffix
              })
            : translate(this.locale, "attempt.progress.nextReview", {
                title: this.result.contentBlockTitle,
                nextReviewAt
              })}
        </p>
      </div>
      <ul>
        <li>
          ${translate(this.locale, "attempt.result.progress", {
            completedBlocks: this.result.completedBlocks,
            totalBlocks: this.result.totalBlocks,
            progressPercent: this.result.progressPercent
          })}
        </li>
        <li>
          ${translate(this.locale, "attempt.result.competency", {
            competencyTitle: this.result.competencyTitle,
            masteryPercent: this.result.masteryPercent
          })}
        </li>
        <li>
          ${translate(this.locale, "attempt.result.pace", {
            repetitions: this.result.repetitions,
            intervalDays: this.result.intervalDays
          })}
        </li>
        <li>${translate(this.locale, "attempt.result.status", { status: this.result.status })}</li>
        ${this.result.submissionStatus
          ? html`<li>${translate(this.locale, "attempt.result.review", { submissionStatus: this.result.submissionStatus })}</li>`
          : null}
      </ul>
      <div class="stack">
        ${verificationPath
          ? html`<a href=${verificationPath}>${translate(this.locale, "attempt.result.viewCredential")}</a>`
          : null}
        <a href="/portal">${translate(this.locale, "attempt.result.openPortal")}</a>
      </div>
    `;
  }

  renderProjectFields() {
    if (this.blockKind !== "project") {
      return null;
    }

    return html`
      <div class="submission-form">
        <div class="message">
          ${this.rubricTitle
            ? translate(this.locale, "attempt.project.rubric", { rubricTitle: this.rubricTitle })
            : translate(this.locale, "attempt.project.rubricFallback")}
        </div>
        ${this.voiceEnabled
          ? html`
              <div class="message">
                ${this.voiceSupported
                  ? translate(this.locale, "attempt.voice.tip")
                  : translate(this.locale, "attempt.voice.unsupported")}
              </div>
            `
          : null}
        ${this.voiceMessage ? html`<div class="message">${this.voiceMessage}</div>` : null}
        <label>
          ${translate(this.locale, "attempt.project.evidence")}
          <textarea
            .value=${this.submissionText}
            @input=${(event: Event) => {
              this.submissionText = (event.currentTarget as HTMLTextAreaElement).value;
            }}
          ></textarea>
        </label>
        ${this.voiceEnabled
          ? html`
              <div class="voice-toolbar">
                <button
                  class="voice-button"
                  type="button"
                  @click=${() => void this.handleVoiceToggle(
                    "submissionText",
                    translate(this.locale, "attempt.project.evidence")
                  )}
                >
                  ${this.voiceField === "submissionText"
                    ? translate(this.locale, "attempt.voice.stop")
                    : translate(this.locale, "attempt.voice.start", {
                        fieldLabel: translate(this.locale, "attempt.project.evidence")
                      })}
                </button>
              </div>
            `
          : null}
        <label>
          ${translate(this.locale, "attempt.project.supportUrl")}
          <input
            .value=${this.submissionUrl}
            @input=${(event: Event) => {
              this.submissionUrl = (event.currentTarget as HTMLInputElement).value;
            }}
          />
        </label>
        <label>
          ${translate(this.locale, "attempt.project.note")}
          <textarea
            .value=${this.learnerNote}
            @input=${(event: Event) => {
              this.learnerNote = (event.currentTarget as HTMLTextAreaElement).value;
            }}
          ></textarea>
        </label>
        ${this.voiceEnabled
          ? html`
              <div class="voice-toolbar">
                <button
                  class="voice-button"
                  type="button"
                  @click=${() => void this.handleVoiceToggle(
                    "learnerNote",
                    translate(this.locale, "attempt.project.note")
                  )}
                >
                  ${this.voiceField === "learnerNote"
                    ? translate(this.locale, "attempt.voice.stop")
                    : translate(this.locale, "attempt.voice.start", {
                        fieldLabel: translate(this.locale, "attempt.project.note")
                      })}
                </button>
              </div>
            `
          : null}
      </div>
    `;
  }

  renderLessonContent() {
    if (!this.renderedLessonHtml) {
      return null;
    }

    return html`
      <div class="lesson-content">
        ${unsafeHTML(this.renderedLessonHtml)}
      </div>
    `;
  }

  renderInteractiveFields() {
    if (this.blockKind !== "interactive") {
      return null;
    }

    const launchConfig = this.ltiLaunchConfig;
    if (!launchConfig.isConfigured) {
      return html`
        <div class="message">${translate(this.locale, "attempt.interactive.unconfigured")}</div>
      `;
    }

    return html`
      <div class="submission-form">
        <div class="message">
          ${translate(this.locale, "attempt.interactive.ready", {
            toolTitle: launchConfig.title
          })}
        </div>
        ${this.interactiveMessage ? html`<div class="message">${this.interactiveMessage}</div>` : null}
        <ul>
          <li>
            ${translate(this.locale, "attempt.interactive.presentation", {
              value: launchConfig.launchPresentation === "iframe"
                ? translate(this.locale, "attempt.interactive.presentation.iframe")
                : translate(this.locale, "attempt.interactive.presentation.window")
            })}
          </li>
          <li>${translate(this.locale, "attempt.interactive.client", { value: launchConfig.clientId })}</li>
          <li>${translate(this.locale, "attempt.interactive.resource", { value: launchConfig.resourceLinkId })}</li>
        </ul>
        <div class="stack">
          <button
            type="button"
            ?disabled=${this.interactiveToolBusy}
            @click=${() => void this.handleLaunchInteractive()}
          >
            ${this.interactiveToolBusy
              ? translate(this.locale, "attempt.interactive.launchingShort")
              : translate(this.locale, "attempt.interactive.open", {
                  toolTitle: launchConfig.title
                })}
          </button>
        </div>
        ${this.interactiveLaunchUrl
          ? html`
              <iframe
                title=${launchConfig.title}
                src=${this.interactiveLaunchUrl}
                style="width:100%;min-height:30rem;border:1px solid rgba(15, 23, 42, 0.12);border-radius:18px;background:#fff;"
              ></iframe>
            `
          : null}
      </div>
    `;
  }

  render() {
    return html`
      <h3>${this.title}</h3>
      <p>${this.summary}</p>
      ${this.loading ? html`<div class="message">${translate(this.locale, "attempt.loading")}</div>` : null}
      ${this.errorMessage ? html`<div class="error">${this.errorMessage}</div>` : null}
      ${this.completed
        ? this.renderResult()
        : html`
            ${this.renderLessonContent()}
            ${this.renderProjectFields()}
            ${this.renderInteractiveFields()}
              <button type="button" ?disabled=${this.loading} @click=${() => void this.handleComplete()}>
              ${this.blockKind === "project"
                ? translate(this.locale, "attempt.project.submit")
                : this.blockKind === "interactive" && this.interactiveLaunchReady
                  ? translate(this.locale, "attempt.interactive.complete")
                  : (this.ctaLabel || translate(this.locale, "attempt.cta"))}
            </button>
          `}
    `;
  }
}

if (!customElements.get("attempt-runner")) {
  customElements.define("attempt-runner", AttemptRunnerElement);
}
