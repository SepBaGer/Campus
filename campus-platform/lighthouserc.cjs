const path = require("node:path");

const baseUrl = process.env.LHCI_BASE_URL || "http://127.0.0.1:4175";
const reportDir = path.resolve(
  __dirname,
  "..",
  "workspace",
  "2026-04-10-remote-db-campus",
  "artifacts",
  "lhci",
);
const chromeProfileDir =
  process.env.LHCI_CHROME_PROFILE_DIR || path.resolve(reportDir, "tmp", "chrome-profile");

const routePaths = [
  "/",
  "/catalogo/",
  "/curso/programa-empoderamiento-power-skills/",
  "/curso/programa-empoderamiento-power-skills/preview/",
  "/acceso/",
  "/portal/",
  "/admin/",
  "/verify/",
  "/verify/demo-badge-power-skills/",
  "/lti/authorize/",
  "/offline/",
];

module.exports = {
  ci: {
    collect: {
      url: routePaths.map((routePath) => `${baseUrl}${routePath}`),
      numberOfRuns: 1,
      puppeteerScript: "./scripts/lhci-puppeteer.cjs",
      puppeteerLaunchOptions: {
        userDataDir: chromeProfileDir,
        args: [
          "--disable-default-apps",
          "--disable-extensions",
          "--disable-gpu",
          "--no-first-run",
        ],
      },
      settings: {
        preset: "desktop",
        onlyCategories: ["performance", "accessibility", "best-practices"],
        maxWaitForLoad: 45000,
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.7 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
        "speed-index": ["warn", { maxNumericValue: 3500 }],
        "categories:accessibility": ["warn", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: reportDir,
    },
  },
};
