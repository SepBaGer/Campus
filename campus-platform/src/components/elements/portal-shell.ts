import { LitElement, css, html } from "lit";
import type {
  AttemptCompletionResult,
  CourseSnapshot,
  NotificationCenterSnapshot,
  PortalSnapshot
} from "../../lib/platform-types";
import { subscribeBrowserToPush, supportsBrowserPush } from "../../lib/browser-notifications";
import {
  getBrowserSession,
  initiateCommunityLaunchForBrowser,
  isBrowserLiveMode,
  issueCredentialForBrowser,
  loadCourseSnapshotForBrowser,
  loadNotificationCenterForBrowser,
  loadPortalSnapshotForBrowser,
  onBrowserAuthStateChange,
  registerWebPushForBrowser,
  signOutBrowserSession,
  updateLeaderboardOptInForBrowser,
  updateNotificationPreferenceForBrowser
} from "../../lib/browser-platform";
import {
  disableOfflineAccess,
  enableOfflineAccess,
  getOfflineActivationState,
  summarizeOfflineReadiness,
  type OfflineActivationState
} from "../../lib/offline-access";
import { applyAttemptCompletionToPortalSnapshot } from "../../lib/learning-state";
import {
  formatDateTime,
  LOCALE_CHANGE_EVENT,
  getActiveLocale,
  translate,
  translateChannelCode,
  type SupportedLocale
} from "../../lib/i18n";
import { getDemoCourseSnapshot, getDemoPortalSnapshot } from "../../lib/platform-data";

class PortalShellElement extends LitElement {
  static properties = {
    defaultCourseSlug: { type: String, attribute: "default-course-slug" },
    loading: { state: true },
    credentialBusy: { state: true },
    errorMessage: { state: true },
    actionMessage: { state: true },
    sessionEmail: { state: true },
    badgeToken: { state: true },
    portalSnapshot: { state: true },
    courseSnapshot: { state: true },
    notificationCenter: { state: true },
    notificationBusy: { state: true },
    gamificationBusy: { state: true },
    communityBusy: { state: true },
    communityLaunchUrl: { state: true },
    communityMessage: { state: true },
    offlineState: { state: true },
    offlineBusy: { state: true },
    locale: { state: true }
  };

  defaultCourseSlug = "programa-empoderamiento-power-skills";
  loading = true;
  credentialBusy = false;
  errorMessage = "";
  actionMessage = "";
  sessionEmail = "";
  badgeToken = "";
  portalSnapshot: PortalSnapshot | null = null;
  courseSnapshot: CourseSnapshot | null = null;
  notificationCenter: NotificationCenterSnapshot | null = null;
  notificationBusy = false;
  gamificationBusy = false;
  communityBusy = false;
  communityLaunchUrl = "";
  communityMessage = "";
  offlineState: OfflineActivationState | null = null;
  offlineBusy = false;
  unsubscribe?: { unsubscribe: () => void };
  locale: SupportedLocale = getActiveLocale();
  private readonly handleLocaleChange = (event: Event) => {
    this.locale = (event as CustomEvent<{ locale?: SupportedLocale }>).detail?.locale || getActiveLocale();
  };

  static styles = css`
    :host {
      display: grid;
      gap: 1rem;
      color: var(--brand-text, #0f172a);
    }

    .panel,
    .metric {
      display: grid;
      gap: 0.8rem;
      padding: 1.25rem;
      border-radius: 24px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-panel, rgba(255, 255, 255, 0.82));
      box-shadow: var(--shadow-lg, 0 18px 48px rgba(15, 23, 42, 0.08));
    }

    .grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .message,
    .error,
    .success {
      padding: 0.9rem 1rem;
      border: 1px solid transparent;
      border-radius: 16px;
    }

    .message {
      background: var(--info-bg, rgba(239, 246, 255, 0.96));
      border-color: var(--info-border, rgba(29, 78, 216, 0.14));
      color: var(--info-text, #1d4ed8);
    }

    .success {
      background: var(--positive-bg, rgba(220, 252, 231, 0.92));
      border-color: var(--positive-border, rgba(22, 101, 52, 0.18));
      color: var(--positive-text, #166534);
    }

    .error {
      background: var(--danger-bg, rgba(254, 242, 242, 0.96));
      border-color: var(--danger-border, rgba(185, 28, 28, 0.16));
      color: var(--danger-text, #b91c1c);
    }

    .utility {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    a,
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0.75rem 1rem;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 800;
      border: 1px solid transparent;
    }

    a {
      background: var(--brand-gold, #b88700);
      border-color: var(--brand-gold, #b88700);
      color: var(--brand-dark, #09162c);
    }

    button {
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      border-color: var(--brand-border-strong, rgba(184, 135, 0, 0.28));
      color: var(--brand-gold, #b88700);
      cursor: pointer;
    }

    button[disabled] {
      opacity: 0.7;
      cursor: wait;
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

    .mastery-list {
      display: grid;
      gap: 0.85rem;
    }

    .mastery-item {
      display: grid;
      gap: 0.35rem;
      padding: 0.85rem 0.95rem;
      border-radius: 18px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-soft, rgba(184, 135, 0, 0.06));
    }

    .leaderboard-list {
      display: grid;
      gap: 0.75rem;
    }

    .leaderboard-item {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.85rem;
      align-items: center;
      padding: 0.85rem 0.95rem;
      border-radius: 18px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: rgba(255, 255, 255, 0.72);
    }

    .leaderboard-item.current {
      background: rgba(184, 135, 0, 0.12);
      border-color: rgba(184, 135, 0, 0.32);
    }

    .leaderboard-rank {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 50%;
      background: var(--brand-ink, #09162c);
      color: #f8fafc;
      font-weight: 800;
    }

    @media (max-width: 860px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
    void this.loadState();
    this.unsubscribe = onBrowserAuthStateChange((session) => {
      this.sessionEmail = session?.user.email || "";
      void this.loadState();
    });
  }

  disconnectedCallback() {
    this.unsubscribe?.unsubscribe();
    window.removeEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
    super.disconnectedCallback();
  }

  async loadState() {
    this.loading = true;
    this.errorMessage = "";
    this.communityLaunchUrl = "";
    this.communityMessage = "";

    try {
      if (!isBrowserLiveMode()) {
        this.portalSnapshot = getDemoPortalSnapshot();
        this.courseSnapshot = getDemoCourseSnapshot(this.defaultCourseSlug) || null;
        this.notificationCenter = await loadNotificationCenterForBrowser();
        this.sessionEmail = "demo@campus.local";
        await this.refreshOfflineState(this.courseSnapshot);
        return;
      }

      const session = await getBrowserSession();
      this.sessionEmail = session?.user.email || "";

      if (!session) {
        this.portalSnapshot = null;
        this.courseSnapshot = null;
        this.notificationCenter = null;
        this.offlineState = null;
        this.badgeToken = "";
        this.communityMessage = "";
        return;
      }

      const [portalSnapshot, courseSnapshot, notificationCenter] = await Promise.all([
        loadPortalSnapshotForBrowser(),
        loadCourseSnapshotForBrowser(this.defaultCourseSlug),
        loadNotificationCenterForBrowser().catch(() => null)
      ]);

      this.portalSnapshot = portalSnapshot;
      this.courseSnapshot = courseSnapshot || null;
      this.notificationCenter = notificationCenter;
      await this.refreshOfflineState(this.courseSnapshot);
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.loading = false;
    }
  }

  async refreshOfflineState(courseSnapshot: CourseSnapshot | null) {
    if (!courseSnapshot) {
      this.offlineState = null;
      return;
    }

    const readiness = summarizeOfflineReadiness(courseSnapshot);
    this.offlineState = await getOfflineActivationState(
      courseSnapshot.slug,
      readiness.offlineCapableBlocks
    );
  }

  async handleSignOut() {
    await signOutBrowserSession();
    this.portalSnapshot = null;
    this.courseSnapshot = null;
    this.notificationCenter = null;
    this.sessionEmail = "";
    this.badgeToken = "";
    this.communityLaunchUrl = "";
    this.communityMessage = "";
    this.actionMessage = "";
  }

  async handleIssueCredential() {
    this.credentialBusy = true;
    this.errorMessage = "";
    this.actionMessage = "";

    try {
      const credential = await issueCredentialForBrowser();
      this.badgeToken = credential.token;
      this.actionMessage = credential.reused
        ? translate(this.locale, "portal.action.reused")
        : translate(this.locale, "portal.action.issued");
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.credentialBusy = false;
    }
  }

  async handleToggleEmailNotifications() {
    this.notificationBusy = true;
    this.errorMessage = "";
    this.actionMessage = "";

    try {
      const currentValue = Boolean(this.notificationCenter?.preferences.emailEnabled);
      await updateNotificationPreferenceForBrowser("email", !currentValue);
      this.actionMessage = !currentValue
        ? translate(this.locale, "portal.notification.email.activated")
        : translate(this.locale, "portal.notification.email.paused");
      this.notificationCenter = await loadNotificationCenterForBrowser();
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.notificationBusy = false;
    }
  }

  async handleEnableWebPush() {
    this.notificationBusy = true;
    this.errorMessage = "";
    this.actionMessage = "";

    try {
      if (!supportsBrowserPush()) {
        throw new Error(translate(this.locale, "portal.error.pushUnsupported"));
      }

      const publicKey = this.notificationCenter?.webPush.publicKey || "";
      const subscription = await subscribeBrowserToPush(publicKey);
      await registerWebPushForBrowser(subscription);
      this.notificationCenter = await loadNotificationCenterForBrowser();
      this.actionMessage = translate(this.locale, "portal.notification.web.active");
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.notificationBusy = false;
    }
  }

  async handleToggleLeaderboardOptIn() {
    if (!this.portalSnapshot?.gamification) {
      return;
    }

    this.gamificationBusy = true;
    this.errorMessage = "";
    this.actionMessage = "";

    try {
      const nextValue = !this.portalSnapshot.gamification.leaderboardOptIn;
      await updateLeaderboardOptInForBrowser(nextValue);
      this.portalSnapshot = await loadPortalSnapshotForBrowser();
      this.actionMessage = nextValue
        ? translate(this.locale, "portal.gamification.toggle.enabled")
        : translate(this.locale, "portal.gamification.toggle.disabled");
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.gamificationBusy = false;
    }
  }

  async handleOpenCommunity() {
    const community = this.courseSnapshot?.community;
    if (!community || !community.enabled) {
      this.errorMessage = translate(this.locale, "portal.community.unavailable");
      return;
    }

    if (!community.launchReady) {
      this.errorMessage = translate(this.locale, "portal.community.locked");
      return;
    }

    this.communityBusy = true;
    this.errorMessage = "";
    this.communityMessage = translate(this.locale, "portal.community.launching", {
      title: community.ltiTitle
    });

    try {
      if (!isBrowserLiveMode()) {
        this.communityLaunchUrl = "";
        this.communityMessage = translate(this.locale, "portal.community.demo", {
          title: community.ltiTitle
        });
        return;
      }

      const blankWindow = community.launchPresentation === "window"
        ? window.open("about:blank", "_blank", "noopener")
        : null;
      const launch = await initiateCommunityLaunchForBrowser({
        runSlug: community.runSlug,
        returnUrl: window.location.href
      });

      if (launch.launchPresentation === "iframe") {
        this.communityLaunchUrl = launch.launchUrl;
        this.communityMessage = translate(this.locale, "portal.community.embedded", {
          title: launch.toolTitle
        });
        return;
      }

      const openedWindow = blankWindow || window.open(launch.launchUrl, "_blank", "noopener");
      if (openedWindow) {
        openedWindow.location.href = launch.launchUrl;
        this.communityLaunchUrl = "";
        this.communityMessage = translate(this.locale, "portal.community.opened", {
          title: launch.toolTitle
        });
      } else {
        this.communityLaunchUrl = launch.launchUrl;
        this.communityMessage = translate(this.locale, "portal.community.embedded", {
          title: launch.toolTitle
        });
      }
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.communityLaunchUrl = "";
      this.communityMessage = "";
    } finally {
      this.communityBusy = false;
    }
  }

  async handleEnableOfflineAccess() {
    if (!this.courseSnapshot) {
      return;
    }

    this.offlineBusy = true;
    this.errorMessage = "";
    this.actionMessage = "";

    try {
      const result = await enableOfflineAccess({
        course: this.courseSnapshot,
        portal: this.portalSnapshot
      });
      await this.refreshOfflineState(this.courseSnapshot);
      this.actionMessage = translate(this.locale, "portal.offline.enabled", {
        routesCached: result.routesCached,
        offlineCapableBlocks: result.offlineCapableBlocks
      });
    } catch (error) {
      const message = (error as Error).message;
      this.errorMessage = message === "unsupported"
        ? translate(this.locale, "portal.offline.unsupported")
        : message;
    } finally {
      this.offlineBusy = false;
    }
  }

  async handleDisableOfflineAccess() {
    if (!this.courseSnapshot) {
      return;
    }

    this.offlineBusy = true;
    this.errorMessage = "";
    this.actionMessage = "";

    try {
      await disableOfflineAccess(this.courseSnapshot.slug);
      await this.refreshOfflineState(this.courseSnapshot);
      this.actionMessage = translate(this.locale, "portal.offline.disabled");
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.offlineBusy = false;
    }
  }

  async handleAttemptCompleted(event: Event) {
    const customEvent = event as CustomEvent<AttemptCompletionResult>;
    this.actionMessage = "";
    this.errorMessage = "";

    if (!customEvent.detail) {
      return;
    }

    if (customEvent.detail.credential?.token) {
      this.badgeToken = customEvent.detail.credential.token;
      this.actionMessage = customEvent.detail.credential.reused
        ? translate(this.locale, "portal.action.ready")
        : translate(this.locale, "portal.action.completed");
    }

    if (customEvent.detail.mode === "demo") {
      if (this.portalSnapshot) {
        this.portalSnapshot = applyAttemptCompletionToPortalSnapshot(this.portalSnapshot, customEvent.detail);
      }
      if (this.courseSnapshot) {
        await this.refreshOfflineState(this.courseSnapshot);
      }
      return;
    }

    await this.loadState();
  }

  formatActivityDate(value: string | null) {
    if (!value) {
      return translate(this.locale, "portal.gamification.lastActivity.empty");
    }

    const normalizedValue = value.includes("T") ? value : `${value}T12:00:00.000Z`;
    return formatDateTime(normalizedValue, this.locale);
  }

  formatCommunityMode(value: string) {
    return translate(this.locale, `portal.community.mode.${value}`);
  }

  renderSignedOut() {
    return html`
      <div class="panel">
        <h2>${translate(this.locale, "portal.signedOut.title")}</h2>
        <p>${translate(this.locale, "portal.signedOut.copy")}</p>
        <div class="utility">
          <a href="/acceso?next=/portal">${translate(this.locale, "portal.signedOut.cta")}</a>
          <button type="button" @click=${() => (window.location.href = "/catalogo")}>
            ${translate(this.locale, "portal.signedOut.back")}
          </button>
        </div>
      </div>
    `;
  }

  renderCredentialPanel() {
    if (this.badgeToken) {
      return html`
        <div class="panel">
          <h3>${translate(this.locale, "portal.credential.title")}</h3>
          <p>${translate(this.locale, "portal.credential.copy")}</p>
          <badge-viewer token=${this.badgeToken}></badge-viewer>
          <div class="utility">
            <a href=${`/verify/${this.badgeToken}`}>${translate(this.locale, "portal.credential.open")}</a>
          </div>
        </div>
      `;
    }

    if (!this.portalSnapshot || this.portalSnapshot.progressPercent < 100) {
      return null;
    }

    return html`
      <div class="panel">
        <h3>${translate(this.locale, "portal.completed.title")}</h3>
        <p>${translate(this.locale, "portal.completed.copy")}</p>
        <div class="utility">
          <button type="button" ?disabled=${this.credentialBusy} @click=${() => void this.handleIssueCredential()}>
            ${this.credentialBusy
              ? translate(this.locale, "portal.completed.loading")
              : translate(this.locale, "portal.completed.cta")}
          </button>
        </div>
      </div>
    `;
  }

  renderPortal() {
    if (!this.portalSnapshot) {
      return this.renderSignedOut();
    }

    const nextBlock = this.courseSnapshot?.blocks[this.portalSnapshot.completedBlocks]
      || this.courseSnapshot?.blocks[0]
      || null;
    const offlineReadiness = summarizeOfflineReadiness(this.courseSnapshot);
    const gamification = this.portalSnapshot.gamification;
    const community = this.courseSnapshot?.community || null;

    return html`
      <div class="utility">
        <button type="button" @click=${() => void this.handleSignOut()}>
          ${translate(this.locale, "portal.signOut")}
        </button>
        <span class="message">
          ${translate(this.locale, "portal.session.active", { email: this.sessionEmail || "demo@campus.local" })}
        </span>
      </div>

      ${this.actionMessage ? html`<div class="success">${this.actionMessage}</div>` : null}

      <div class="grid">
        <div class="metric">
          <h3>${this.portalSnapshot.learnerName}</h3>
          <p>${this.portalSnapshot.membershipLabel}</p>
          <progress-ring
            label=${translate(this.locale, "portal.progress.label")}
            percent=${this.portalSnapshot.progressPercent}
            detail=${translate(this.locale, "portal.progress.detail", {
              completedBlocks: this.portalSnapshot.completedBlocks,
              totalBlocks: this.portalSnapshot.totalBlocks
            })}
          ></progress-ring>
        </div>

        <div class="metric">
          <h3>${translate(this.locale, "portal.focus.title")}</h3>
          <ul>
            <li>${translate(this.locale, "portal.focus.route", { value: this.portalSnapshot.enrolledCourseTitle })}</li>
            <li>${translate(this.locale, "portal.focus.cohort", { value: this.portalSnapshot.activeRunLabel })}</li>
            <li>${translate(this.locale, "portal.focus.pace", { value: this.portalSnapshot.atRiskLabel })}</li>
            <li>${translate(this.locale, "portal.focus.reviews", { value: this.portalSnapshot.dueReviewsCount })}</li>
            <li>${translate(this.locale, "portal.focus.nextReview", {
              value: formatDateTime(this.portalSnapshot.nextReviewAt, this.locale)
            })}</li>
          </ul>
        </div>
      </div>

      ${gamification
        ? html`
            <div class="grid">
              <div class="metric">
                <h3>${translate(this.locale, "portal.gamification.title")}</h3>
                <streak-ring
                  days=${gamification.currentStreakDays}
                  target=${7}
                  label=${translate(this.locale, "portal.gamification.ringLabel")}
                  detail=${translate(this.locale, "portal.gamification.detail", {
                    days: gamification.currentStreakDays
                  })}
                ></streak-ring>
                <ul>
                  <li>${translate(this.locale, "portal.gamification.best", { value: gamification.longestStreakDays })}</li>
                  <li>${translate(this.locale, "portal.gamification.xp", { value: gamification.totalXp })}</li>
                  <li>
                    ${gamification.rankPosition
                      ? translate(this.locale, "portal.gamification.rank", { value: gamification.rankPosition })
                      : translate(this.locale, "portal.gamification.rankEmpty")}
                  </li>
                  <li>${translate(this.locale, "portal.gamification.participants", { value: gamification.participantCount })}</li>
                  <li>
                    ${translate(this.locale, "portal.gamification.lastActivity", {
                      value: this.formatActivityDate(gamification.lastActivityOn)
                    })}
                  </li>
                </ul>
              </div>

              <div class="metric">
                <h3>${translate(this.locale, "portal.leaderboard.title")}</h3>
                <p>${translate(this.locale, "portal.leaderboard.copy")}</p>
                <div class="utility">
                  <button
                    type="button"
                    ?disabled=${this.gamificationBusy}
                    @click=${() => void this.handleToggleLeaderboardOptIn()}
                  >
                    ${gamification.leaderboardOptIn
                      ? translate(this.locale, "portal.gamification.toggle.disable")
                      : translate(this.locale, "portal.gamification.toggle.enable")}
                  </button>
                </div>
                ${!gamification.leaderboardOptIn
                  ? html`<p>${translate(this.locale, "portal.leaderboard.locked")}</p>`
                  : this.portalSnapshot.leaderboard.length
                    ? html`
                        <div class="leaderboard-list">
                          ${this.portalSnapshot.leaderboard.slice(0, 5).map((entry) => html`
                            <div class="leaderboard-item ${entry.isCurrentLearner ? "current" : ""}">
                              <span class="leaderboard-rank">#${entry.rankPosition}</span>
                              <div>
                                <strong>
                                  ${entry.learnerName}
                                  ${entry.isCurrentLearner
                                    ? html`<span> · ${translate(this.locale, "portal.leaderboard.you")}</span>`
                                    : null}
                                </strong>
                                <p>${translate(this.locale, "portal.leaderboard.meta", {
                                  totalXp: entry.totalXp,
                                  currentStreakDays: entry.currentStreakDays
                                })}</p>
                              </div>
                            </div>
                          `)}
                        </div>
                      `
                    : html`<p>${translate(this.locale, "portal.leaderboard.empty")}</p>`}
              </div>
            </div>
          `
        : null}

      ${this.portalSnapshot.mastery.length
        ? html`
            <div class="panel">
              <h3>${translate(this.locale, "portal.mastery.title")}</h3>
              <div class="mastery-list">
                ${this.portalSnapshot.mastery.map((item) => html`
                  <div class="mastery-item">
                    <strong>
                      ${translate(this.locale, "portal.mastery.item", {
                        title: item.competencyTitle,
                        bloomLabel: item.bloomLabel
                      })}
                    </strong>
                    <p>${translate(this.locale, "portal.mastery.level", { percent: item.masteryPercent })}</p>
                    <p>
                      ${item.nextReviewAt
                        ? translate(this.locale, "portal.mastery.nextReview", {
                            value: formatDateTime(item.nextReviewAt, this.locale)
                          })
                        : translate(this.locale, "portal.mastery.empty")}
                    </p>
                  </div>
                `)}
              </div>
            </div>
          `
        : null}

      ${community?.enabled
        ? html`
            <div class="panel">
              <h3>${translate(this.locale, "portal.community.title")}</h3>
              <p>${community.summary}</p>
              <ul>
                <li>${translate(this.locale, "portal.community.run", { value: community.runTitle })}</li>
                <li>${translate(this.locale, "portal.community.provider", {
                  value: translate(this.locale, "portal.community.provider.discourse")
                })}</li>
                <li>${translate(this.locale, "portal.community.modes", {
                  value: community.surfaceModes.map((entry) => this.formatCommunityMode(entry)).join(" | ")
                })}</li>
                <li>
                  ${community.peerReviewEnabled
                    ? translate(this.locale, "portal.community.peerReview.on")
                    : translate(this.locale, "portal.community.peerReview.off")}
                </li>
                <li>${translate(this.locale, "portal.community.prompt", { value: community.discussionPrompt })}</li>
              </ul>
              ${community.expectations.length
                ? html`
                    <div class="mastery-list">
                      ${community.expectations.map((entry) => html`
                        <div class="mastery-item">
                          <strong>${translate(this.locale, "portal.community.expectation")}</strong>
                          <p>${entry}</p>
                        </div>
                      `)}
                    </div>
                  `
                : null}
              ${this.communityMessage ? html`<div class="message">${this.communityMessage}</div>` : null}
              <div class="utility">
                <button
                  type="button"
                  ?disabled=${this.communityBusy || !community.launchReady}
                  @click=${() => void this.handleOpenCommunity()}
                >
                  ${this.communityBusy
                    ? translate(this.locale, "portal.community.loading")
                    : translate(this.locale, "portal.community.open", {
                        value: community.entryLabel
                      })}
                </button>
              </div>
              ${!community.launchReady
                ? html`<p>${translate(this.locale, "portal.community.locked")}</p>`
                : null}
              ${this.communityLaunchUrl
                ? html`
                    <iframe
                      title=${community.ltiTitle}
                      src=${this.communityLaunchUrl}
                      style="width:100%;min-height:32rem;border:1px solid rgba(15, 23, 42, 0.12);border-radius:18px;background:#fff;"
                    ></iframe>
                  `
                : null}
            </div>
          `
        : null}

      ${this.notificationCenter
        ? html`
            <div class="panel">
              <h3>${translate(this.locale, "portal.notification.title")}</h3>
              <div class="grid">
                <div class="metric">
                  <h3>${translate(this.locale, "portal.notification.email")}</h3>
                  <p>
                    ${this.notificationCenter.preferences.emailEnabled
                      ? translate(this.locale, "portal.notification.email.on")
                      : translate(this.locale, "portal.notification.email.off")}
                  </p>
                  <div class="utility">
                    <button
                      type="button"
                      ?disabled=${this.notificationBusy}
                      @click=${() => void this.handleToggleEmailNotifications()}
                    >
                      ${this.notificationCenter.preferences.emailEnabled
                        ? translate(this.locale, "portal.notification.email.pause")
                        : translate(this.locale, "portal.notification.email.enable")}
                    </button>
                  </div>
                </div>

                <div class="metric">
                  <h3>${translate(this.locale, "portal.notification.web")}</h3>
                  <p>
                    ${this.notificationCenter.webPush.activeSubscriptions > 0
                      ? translate(this.locale, "portal.notification.web.active")
                      : this.notificationCenter.webPush.supported
                        ? translate(this.locale, "portal.notification.web.ready")
                        : translate(this.locale, "portal.notification.web.unavailable")}
                  </p>
                  <div class="utility">
                    <button
                      type="button"
                      ?disabled=${this.notificationBusy || !this.notificationCenter.webPush.supported}
                      @click=${() => void this.handleEnableWebPush()}
                    >
                      ${this.notificationCenter.webPush.activeSubscriptions > 0
                        ? translate(this.locale, "portal.notification.web.reactivate")
                        : translate(this.locale, "portal.notification.web.enable")}
                    </button>
                  </div>
                </div>
              </div>

              ${this.notificationCenter.recent.length
                ? html`
                    <div class="mastery-list">
                      ${this.notificationCenter.recent.map((entry) => html`
                        <div class="mastery-item">
                          <strong>${entry.subject}</strong>
                          <p>${entry.body}</p>
                          <p>${formatDateTime(entry.sentAt, this.locale)} | ${translateChannelCode(this.locale, entry.channelCode)}</p>
                          ${entry.ctaUrl
                            ? html`<div class="utility"><a href=${entry.ctaUrl}>${entry.ctaLabel || translate(this.locale, "portal.notification.open")}</a></div>`
                            : null}
                        </div>
                      `)}
                    </div>
                  `
                : html`<p>${translate(this.locale, "portal.notification.empty")}</p>`}
            </div>
          `
        : null}

      ${this.courseSnapshot
        ? html`
            <div class="panel">
              <h3>${translate(this.locale, "portal.offline.title")}</h3>
              <p>
                ${this.offlineState?.enabled
                  ? translate(this.locale, "portal.offline.ready", {
                      offlineCapableBlocks: this.offlineState.offlineCapableBlocks,
                      routesCached: this.offlineState.routesCached
                    })
                  : translate(this.locale, "portal.offline.copy", {
                      offlineCapableBlocks: offlineReadiness.offlineCapableBlocks
                    })}
              </p>
              <ul>
                <li>${translate(this.locale, "portal.offline.route", { value: this.courseSnapshot.title })}</li>
                <li>${translate(this.locale, "portal.offline.blocks", { value: offlineReadiness.offlineCapableBlocks })}</li>
                <li>${translate(this.locale, "portal.offline.fallback", { value: "/offline" })}</li>
                <li>
                  ${translate(this.locale, "portal.offline.cachedAt", {
                    value: this.offlineState?.cachedAt
                      ? formatDateTime(this.offlineState.cachedAt, this.locale)
                      : translate(this.locale, "portal.offline.notCached")
                  })}
                </li>
              </ul>
              <div class="utility">
                <button
                  type="button"
                  ?disabled=${this.offlineBusy || !offlineReadiness.canEnable}
                  @click=${() => void this.handleEnableOfflineAccess()}
                >
                  ${this.offlineBusy
                    ? translate(this.locale, "portal.offline.loading")
                    : translate(this.locale, "portal.offline.enable")}
                </button>
                ${this.offlineState?.enabled
                  ? html`
                      <button
                        type="button"
                        ?disabled=${this.offlineBusy}
                        @click=${() => void this.handleDisableOfflineAccess()}
                      >
                        ${translate(this.locale, "portal.offline.disable")}
                      </button>
                    `
                  : null}
              </div>
              ${!offlineReadiness.canEnable
                ? html`<p>${translate(this.locale, "portal.offline.unavailable")}</p>`
                : null}
            </div>
          `
        : null}

      ${nextBlock
        ? html`
            <div class="panel">
              <h3>${translate(this.locale, "portal.next.title")}</h3>
              <attempt-runner
                title=${nextBlock.title}
                summary=${nextBlock.summary}
                course-slug=${this.courseSnapshot?.slug || this.defaultCourseSlug}
                content-block-id=${nextBlock.id}
                block-kind=${nextBlock.kind}
                rubric-title=${nextBlock.rubricTitle}
                voice-dictation=${nextBlock.voiceDictationEnabled ? "enabled" : "disabled"}
                renderer-manifest=${JSON.stringify(nextBlock.rendererManifest)}
                @attempt-completed=${(event: Event) => void this.handleAttemptCompleted(event)}
              ></attempt-runner>
            </div>
          `
        : html`
            <div class="panel">
              <h3>${translate(this.locale, "portal.next.done")}</h3>
              <p>${translate(this.locale, "portal.next.done.copy")}</p>
            </div>
          `}

      ${this.renderCredentialPanel()}
    `;
  }

  render() {
    return html`
      ${this.loading ? html`<div class="message">${translate(this.locale, "portal.loading")}</div>` : null}
      ${this.errorMessage ? html`<div class="error">${this.errorMessage}</div>` : null}
      ${!this.loading ? this.renderPortal() : null}
    `;
  }
}

if (!customElements.get("portal-shell")) {
  customElements.define("portal-shell", PortalShellElement);
}
