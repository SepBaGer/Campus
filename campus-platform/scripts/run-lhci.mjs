import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { access, mkdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceReportDir = resolve(
  rootDir,
  "..",
  "workspace",
  "2026-04-10-remote-db-campus",
  "artifacts",
  "lhci",
);
const workspaceTempDir = resolve(workspaceReportDir, "tmp");
const workspaceChromeProfileDir = resolve(workspaceTempDir, `chrome-profile-${process.pid}`);
const distDir = resolve(rootDir, "dist");
const host = "127.0.0.1";
const port = Number.parseInt(process.env.LHCI_PORT ?? "4175", 10);
const baseUrl = `http://${host}:${port}`;

const contentTypes = new Map([
  [".avif", "image/avif"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

await access(distDir).catch(() => {
  console.error("dist/ does not exist. Run `npm run build` before the performance gate.");
  process.exit(1);
});

await mkdir(workspaceReportDir, { recursive: true });
await mkdir(workspaceTempDir, { recursive: true });
await rm(workspaceChromeProfileDir, { recursive: true, force: true, maxRetries: 5 }).catch(() => {
  // A previous interrupted Chrome profile can be ignored because each run gets a unique path.
});
await mkdir(workspaceChromeProfileDir, { recursive: true });

function resolveRequestPath(requestUrl = "/") {
  const url = new URL(requestUrl, baseUrl);
  const decodedPath = decodeURIComponent(url.pathname);
  const safePath = normalize(decodedPath).replace(/^([/\\])+/, "");
  let candidate = resolve(distDir, safePath);

  if (!candidate.startsWith(`${distDir}${sep}`) && candidate !== distDir) {
    return null;
  }

  if (existsSync(candidate) && statSync(candidate).isDirectory()) {
    candidate = join(candidate, "index.html");
  }

  if (!existsSync(candidate) && !extname(candidate)) {
    const indexCandidate = join(candidate, "index.html");
    if (existsSync(indexCandidate)) {
      candidate = indexCandidate;
    }
  }

  return existsSync(candidate) ? candidate : null;
}

const server = createServer((request, response) => {
  const filePath = resolveRequestPath(request.url);

  if (!filePath) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "cache-control": "public, max-age=31536000, immutable",
    "content-type": contentTypes.get(extname(filePath)) ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

await new Promise((resolveServer, rejectServer) => {
  server.once("error", rejectServer);
  server.listen(port, host, resolveServer);
});

function runLhci() {
  const lhciBin = resolve(rootDir, "node_modules", "@lhci", "cli", "src", "cli.js");
  const args = [lhciBin, "autorun", "--config", "./lighthouserc.cjs"];

  console.log(`[perf] Lighthouse CI base URL: ${baseUrl}`);
  console.log(`[perf] Lighthouse reports: ${workspaceReportDir}`);
  console.log(`[perf] Lighthouse temp dir: ${workspaceTempDir}`);
  console.log(`[perf] Lighthouse Chrome profile: ${workspaceChromeProfileDir}`);

  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      env: {
        ...process.env,
        LHCI_BASE_URL: baseUrl,
        LHCI_CHROME_PROFILE_DIR: workspaceChromeProfileDir,
        NO_COLOR: "1",
        TEMP: workspaceTempDir,
        TMP: workspaceTempDir,
        TMPDIR: workspaceTempDir,
      },
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("close", (code) => resolveRun(code ?? 1));
  });
}

let exitCode = 1;

try {
  exitCode = await runLhci();
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
  await rm(workspaceChromeProfileDir, { recursive: true, force: true, maxRetries: 5 }).catch(
    (error) => {
      console.warn(`[perf] Could not remove Chrome profile ${workspaceChromeProfileDir}: ${error.message}`);
    },
  );
}

if (exitCode !== 0) {
  console.error("\n[perf] Lighthouse CI performance gate failed.");
  process.exit(exitCode);
}

console.log("\n[perf] Lighthouse CI performance gate passed.");
