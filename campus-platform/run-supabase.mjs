import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const platformRoot = dirname(fileURLToPath(import.meta.url));
const supabaseRoot = resolve(platformRoot, "supabase");
const cliPath = resolve(
  platformRoot,
  "node_modules",
  "supabase",
  "bin",
  process.platform === "win32" ? "supabase.exe" : "supabase",
);

const defaultProjectRef =
  process.env.CAMPUS_SUPABASE_PROJECT_REF || "exyewjzckgsesrsuqueh";
const args = process.argv.slice(2);

if (!existsSync(cliPath)) {
  console.error(
    "Local Supabase CLI not found. Run `npm install` in campus-platform first.",
  );
  process.exit(1);
}

const forwardedArgs = args.length > 0 ? [...args] : ["--help"];

if (
  forwardedArgs[0] === "link" &&
  !forwardedArgs.includes("--project-ref") &&
  !forwardedArgs.includes("-p")
) {
  forwardedArgs.push("--project-ref", defaultProjectRef);
}

const result = spawnSync(cliPath, forwardedArgs, {
  cwd: supabaseRoot,
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
