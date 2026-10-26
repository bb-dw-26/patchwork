import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const projects = new Set(["bbdw-checkout", "bbdw-users", "bbdw-storefront"]);

export function uploadPlan(appPath, env = process.env) {
  const cwd = resolve(appPath);
  const { name } = JSON.parse(
    readFileSync(resolve(cwd, "package.json"), "utf8"),
  );
  if (!projects.has(name))
    throw new Error("Aplicação sem upload de source maps suportado.");
  const frontend = name === "bbdw-storefront";
  const releaseKey = frontend ? "VITE_SENTRY_RELEASE" : "SENTRY_RELEASE";
  for (const key of [
    "SENTRY_AUTH_TOKEN",
    "SENTRY_ORG",
    "SENTRY_PROJECT",
    releaseKey,
  ]) {
    if (!env[key]?.trim()) throw new Error(`Configure ${key} antes do upload.`);
  }
  if (env.SENTRY_PROJECT !== name)
    throw new Error(`Use o projeto dedicado ${name}.`);
  const output = frontend ? "dist" : "dist/src";
  if (
    !existsSync(resolve(cwd, output)) ||
    !statSync(resolve(cwd, output)).isDirectory()
  ) {
    throw new Error(`Build ausente: execute npm run build em ${name}.`);
  }
  const commands = [];
  if (frontend) commands.push(["sourcemaps", "inject", output]);
  commands.push([
    "sourcemaps",
    "upload",
    output,
    "--release",
    env[releaseKey],
    ...(!frontend ? ["--url-prefix", "app:///src"] : []),
    "--validate",
    "--strict",
  ]);
  return { cwd, commands };
}

export function uploadSourceMaps(
  appPath,
  { env = process.env, run = execFileSync, cli } = {},
) {
  // Validar todo o destino antes de injetar Debug IDs ou publicar arquivos.
  const plan = uploadPlan(appPath, env);
  const executable = cli ?? require("@sentry/cli").SentryCli.getPath();
  for (const args of plan.commands)
    run(executable, args, {
      cwd: plan.cwd,
      env,
      stdio: "inherit",
      windowsHide: true,
    });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [appPath, ...extra] = process.argv.slice(2);
  if (!appPath || extra.length)
    throw new Error("Uso: npm run sentry:upload -- <pasta-da-aplicação>");
  const envFile = resolve(appPath, ".env");
  if (existsSync(envFile)) loadEnvFile(envFile);
  uploadSourceMaps(appPath);
}
