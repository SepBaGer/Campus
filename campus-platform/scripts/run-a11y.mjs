import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { access } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(rootDir, "dist");
const host = "127.0.0.1";
const port = Number.parseInt(process.env.A11Y_PORT ?? "4174", 10);
const baseUrl = `http://${host}:${port}`;

const routes = [
  { label: "Home", path: "/" },
  { label: "Catalog", path: "/catalogo/" },
  { label: "Course detail", path: "/curso/programa-empoderamiento-power-skills/" },
  { label: "Free preview", path: "/curso/programa-empoderamiento-power-skills/preview/" },
  { label: "Access", path: "/acceso/" },
  { label: "Portal", path: "/portal/" },
  { label: "Admin", path: "/admin/" },
  { label: "Verifier", path: "/verify/" },
  { label: "Demo badge", path: "/verify/demo-badge-power-skills/" },
  { label: "LTI authorize", path: "/lti/authorize/" },
  { label: "Offline", path: "/offline/" },
];

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

await access(distDir).catch(() => {
  console.error("dist/ does not exist. Run `npm run build` before the a11y gate.");
  process.exit(1);
});

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
    "content-type": contentTypes.get(extname(filePath)) ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

await new Promise((resolveServer, rejectServer) => {
  server.once("error", rejectServer);
  server.listen(port, host, resolveServer);
});

function runPa11y(route) {
  const pa11yBin = resolve(rootDir, "node_modules", "pa11y", "bin", "pa11y.js");
  const url = `${baseUrl}${route.path}`;
  const args = [
    pa11yBin,
    url,
    "--standard",
    "WCAG2AA",
    "--runner",
    "axe",
    "--runner",
    "htmlcs",
    "--level",
    "error",
    "--level-cap-when-needs-review",
    "warning",
    "--threshold",
    "0",
    "--timeout",
    "45000",
    "--wait",
    "750",
  ];

  console.log(`\n[a11y] ${route.label}: ${url}`);

  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("close", (code) => resolveRun(code ?? 1));
  });
}

let failures = 0;

try {
  for (const route of routes) {
    const code = await runPa11y(route);
    if (code !== 0) {
      failures += 1;
    }
  }
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
}

if (failures > 0) {
  console.error(`\n[a11y] ${failures} route(s) failed WCAG2AA checks.`);
  process.exit(1);
}

console.log("\n[a11y] WCAG2AA gate passed for all critical routes.");
