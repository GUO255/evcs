const titilerExecutable = "ops/site-selection/titiler/.venv/bin/uvicorn";
const titilerPython = "ops/site-selection/titiler/.venv/bin/python";

function isolatedBun(snapshot: string, args: string[]) {
  return [
    "bun",
    "ops/pm2/run-with-env.cjs",
    "--env-file",
    `ops/.env.generated/${snapshot}`,
    "--",
    ...args,
  ];
}

async function runSetup(command: string[], errorMessage: string) {
  const setup = Bun.spawn({
    cmd: command,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  if (await setup.exited) throw new Error(errorMessage);
}

async function hasRunningTitiler() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api", {
      signal: AbortSignal.timeout(1_000),
    });
    if (!response.ok) return false;

    const document = await response.text();
    return document.includes("/cog/tiles/");
  } catch {
    return false;
  }
}

if (!(await Bun.file(titilerExecutable).exists())) {
  console.log("[site-selection:titiler] environment not found, installing");
  await runSetup(
    ["bun", "ops/site-selection/scripts/setup-titiler.ts"],
    "TiTiler environment installation failed",
  );
}

console.log("[site-selection:worker] syncing runtime config");
await runSetup(
  isolatedBun("development.site-selection-service-worker.env", [
    "run",
    "--filter",
    "@evcs/site-selection-service",
    "sync:assessment-config",
  ]),
  "Site analysis runtime config synchronization failed",
);

const reuseTitiler = await hasRunningTitiler();
if (reuseTitiler) console.log("[site-selection:titiler] already running on 127.0.0.1:8000, reusing");

const processes = [
  {
    name: "web",
    command: isolatedBun("development.site-selection-web-build.env", [
      "run",
      "--filter",
      "@evcs/site-selection-web",
      "dev",
    ]),
  },
  {
    name: "api",
    command: isolatedBun("development.site-selection-service-api.env", [
      "run",
      "--filter",
      "@evcs/site-selection-service",
      "dev:api",
    ]),
  },
  {
    name: "worker",
    command: isolatedBun("development.site-selection-service-worker.env", [
      "run",
      "--filter",
      "@evcs/site-selection-service",
      "dev:worker",
    ]),
  },
  ...(reuseTitiler
    ? []
    : [{
        name: "titiler",
        command: [
          titilerPython,
          "-m",
          "uvicorn",
          "titiler.application.main:app",
          "--host",
          "127.0.0.1",
          "--port",
          "8000",
        ],
      }]),
] as const;

const children = processes.map(({ command, name }) => {
  console.log(`[site-selection:${name}] starting`);

  return {
    name,
    process: Bun.spawn({
      cmd: command,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }),
  };
});

let stopping = false;

async function stop(exitCode: number) {
  if (stopping) return;

  stopping = true;
  console.log("[site-selection] stopping all processes");
  children.forEach(({ process }) => process.kill());
  await Promise.all(children.map(({ process }) => process.exited));
  process.exit(exitCode);
}

process.on("SIGINT", () => void stop(0));
process.on("SIGTERM", () => void stop(0));

children.forEach(({ name, process: child }) => {
  void child.exited.then((exitCode) => {
    if (!stopping) {
      console.error(`[site-selection:${name}] exited with code ${exitCode}`);
      void stop(exitCode || 1);
    }
  });
});

await Promise.all(children.map(({ process }) => process.exited));
