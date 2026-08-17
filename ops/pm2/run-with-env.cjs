#!/usr/bin/env bun
const { existsSync, realpathSync } = require("node:fs");
const { spawn } = require("node:child_process");
const { relative, resolve, sep } = require("node:path");

const repositoryRoot = resolve(__dirname, "../..");
const envRoot = realpathSync(resolve(repositoryRoot, "ops/.env.generated"));
const [envFlag, envFileArgument, separator, ...bunArguments] = process.argv.slice(2);

function fail(message) {
  console.error(`run-with-env: ${message}`);
  process.exit(2);
}

if (envFlag !== "--env-file" || !envFileArgument || separator !== "--" || bunArguments.length === 0) {
  fail("usage: --env-file <ops/.env.generated/...env> -- <bun arguments>");
}

const envFile = resolve(repositoryRoot, envFileArgument);
if (!existsSync(envFile)) fail(`environment file does not exist: ${envFileArgument}`);

const realEnvFile = realpathSync(envFile);
const relativeEnvFile = relative(envRoot, realEnvFile);
if (relativeEnvFile === "" || relativeEnvFile === ".." || relativeEnvFile.startsWith(`..${sep}`) || resolve(envRoot, relativeEnvFile) !== realEnvFile) {
  fail("environment file must be contained within ops/.env.generated");
}

const preserved = ["PATH", "HOME", "TMPDIR", "LANG"]
  .filter((name) => process.env[name] !== undefined)
  .map((name) => `${name}=${process.env[name]}`);
const child = spawn(
  "/usr/bin/env",
  ["-i", ...preserved, "bun", "--no-env-file", `--env-file=${realEnvFile}`, ...bunArguments],
  { cwd: repositoryRoot, stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.once("error", (error) => {
  console.error(`run-with-env: ${error.message}`);
  process.exit(1);
});
child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
