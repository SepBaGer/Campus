import {
  getActiveLocale,
  normalizeLocale,
  setActiveLocale,
  translateDocument
} from "../../lib/i18n";
import {
  isBrowserLiveMode,
  loadPreferredLocaleForBrowser,
  updatePreferredLocaleForBrowser
} from "../../lib/browser-platform";
import { registerCampusServiceWorker } from "../../lib/offline-access";
import { initWebVitalsRum } from "../../lib/web-vitals-rum";

const themeKey = "mdg_theme";

function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}

async function hydrateLocale() {
  let activeLocale = getActiveLocale();
  const select = document.querySelector<HTMLSelectElement>("[data-locale-select]");

  const applyLocale = (locale: string, options?: { persistRemote?: boolean }) => {
    const nextLocale = normalizeLocale(locale);
    setActiveLocale(nextLocale);
    translateDocument(document, nextLocale);

    if (select) {
      select.value = nextLocale;
    }

    if (options?.persistRemote && isBrowserLiveMode()) {
      void updatePreferredLocaleForBrowser(nextLocale).catch(() => {
        // keep local preference even if remote persistence is not available
      });
    }

    activeLocale = nextLocale;
  };

  if (select) {
    select.value = activeLocale;
    select.addEventListener("change", () => {
      applyLocale(select.value, { persistRemote: true });
    });
  }

  translateDocument(document, activeLocale);

  if (!isBrowserLiveMode()) {
    return;
  }

  try {
    const remoteLocale = await loadPreferredLocaleForBrowser();
    if (remoteLocale && remoteLocale !== activeLocale) {
      applyLocale(remoteLocale);
    }
  } catch {
    // fall back to local preference
  }
}

const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");

toggle?.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  applyTheme(nextTheme);
  localStorage.setItem(themeKey, nextTheme);
});

void registerCampusServiceWorker().catch(() => {
  // keep the rest of the chrome boot healthy if the PWA layer cannot register
});
initWebVitalsRum();
void hydrateLocale();
