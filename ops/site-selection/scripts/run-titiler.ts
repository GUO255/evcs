const root = new URL("../../../", import.meta.url).pathname;
const python = "ops/site-selection/titiler/.venv/bin/python";
const environment = { ...process.env, DYLD_LIBRARY_PATH: "/opt/homebrew/opt/expat/lib" };
delete environment.PROJ_LIB;
delete environment.PROJ_DATA;
delete environment.GDAL_DATA;
delete environment.GDAL_DRIVER_PATH;

async function run(command: string[]) {
  const child = Bun.spawn(command, {
    cwd: root,
    stderr: "inherit",
    stdout: "inherit",
  });
  if (await child.exited) throw new Error(`${command.join(" ")} failed`);
}

async function dependenciesReady() {
  if (!(await Bun.file(`${root}${python}`).exists())) return false;
  const check = Bun.spawn([
    python,
    "-c",
    "import importlib.metadata as m; assert m.version('titiler.application') == '2.1.0'; assert m.version('uvicorn') == '0.49.0'; assert m.version('fastapi') == '0.136.3'",
  ], {
    cwd: root,
    env: environment,
    stderr: "ignore",
    stdout: "ignore",
  });
  return await check.exited === 0;
}

if (!(await dependenciesReady())) {
  await run(["bun", "ops/site-selection/scripts/setup-titiler.ts"]);
}

const server = Bun.spawn([
  python,
  "-m",
  "uvicorn",
  "titiler.application.main:app",
  "--host",
  "127.0.0.1",
  "--port",
  "8000",
], {
  cwd: root,
  env: environment,
  stderr: "inherit",
  stdout: "inherit",
});

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  server.kill("SIGTERM");
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.exitCode = await server.exited;
