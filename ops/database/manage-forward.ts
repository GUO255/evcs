import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { connect } from "node:net";
import { dirname, join, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dir, "../..");

export const developmentHostMysqlPort = 3307;
export const developmentColimaMysqlPort = 3306;
export const developmentForwardPidFile = join(repositoryRoot, "ops/.state/db-forward.pid");

export const forwardActions = ["start", "stop", "status"] as const;
export type ForwardAction = (typeof forwardActions)[number];

export function parseForwardAction(value: string | undefined): ForwardAction {
  if (!value || !forwardActions.includes(value as ForwardAction)) {
    throw new Error(`Usage: bun ops/database/manage-forward.ts <${forwardActions.join("|")}>`);
  }
  return value as ForwardAction;
}

export interface ForwardDependencies {
  probe: (port: number) => Promise<boolean>;
  listenerPid: (port: number) => Promise<number | null>;
  spawnDetached: (command: string[]) => number | null;
  terminate: (pid: number) => Promise<boolean>;
  readPid: () => number | null;
  writePid: (pid: number) => void;
  clearPid: () => void;
  colimaSshConfig: () => string | null;
}

async function probeTcp(port: number): Promise<boolean> {
  return new Promise((resolveProbe) => {
    const socket = connect({ host: "127.0.0.1", port });
    socket.setTimeout(2000);
    socket.once("connect", () => {
      socket.destroy();
      resolveProbe(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolveProbe(false);
    });
    socket.once("error", () => resolveProbe(false));
  });
}

async function listenerPidOf(port: number): Promise<number | null> {
  const child = Bun.spawn(["lsof", "-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const [stdout, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    child.exited,
  ]);
  if (exitCode !== 0) return null;
  const pid = Number.parseInt(stdout.trim().split("\n")[0] ?? "", 10);
  return Number.isFinite(pid) ? pid : null;
}

function spawnDetached(command: string[]): number | null {
  const child = Bun.spawn(command, {
    detached: true,
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
  });
  child.unref();
  return child.pid ?? null;
}

async function terminateProcess(pid: number): Promise<boolean> {
  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}

function readForwardPid(): number | null {
  try {
    const pid = Number.parseInt(readFileSync(developmentForwardPidFile, "utf8").trim(), 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function writeForwardPid(pid: number): void {
  mkdirSync(dirname(developmentForwardPidFile), { recursive: true });
  writeFileSync(developmentForwardPidFile, `${pid}\n`);
}

function clearForwardPid(): void {
  try {
    unlinkSync(developmentForwardPidFile);
  } catch {
    // pidfile already absent
  }
}

function defaultColimaSshConfig(): string | null {
  const candidate = join(homedir(), ".colima/ssh_config");
  return existsSync(candidate) ? candidate : null;
}

function defaultDependencies(): ForwardDependencies {
  return {
    probe: probeTcp,
    listenerPid: listenerPidOf,
    spawnDetached,
    terminate: terminateProcess,
    readPid: readForwardPid,
    writePid: writeForwardPid,
    clearPid: clearForwardPid,
    colimaSshConfig: defaultColimaSshConfig,
  };
}

async function waitForProbe(probe: (port: number) => Promise<boolean>, attempts = 10): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await probe(developmentHostMysqlPort)) return true;
    await Bun.sleep(200);
  }
  return probe(developmentHostMysqlPort);
}

async function startForward(dependencies: ForwardDependencies): Promise<void> {
  const alreadyActive = await dependencies.probe(developmentHostMysqlPort);
  if (alreadyActive) {
    const pid = await dependencies.listenerPid(developmentHostMysqlPort);
    if (pid !== null) dependencies.writePid(pid);
    console.log(
      `MySQL host forward already active at 127.0.0.1:${developmentHostMysqlPort}` +
        (pid !== null ? ` (pid ${pid})` : ""),
    );
    return;
  }

  const config = dependencies.colimaSshConfig();
  if (config === null) {
    throw new Error("Colima SSH config not found — start Colima with `colima start` first");
  }

  const spawnedPid = dependencies.spawnDetached([
    "ssh",
    "-F",
    config,
    "-N",
    "-L",
    `127.0.0.1:${developmentHostMysqlPort}:127.0.0.1:${developmentColimaMysqlPort}`,
    "colima",
  ]);
  if (spawnedPid === null) throw new Error("Failed to spawn ssh forward process");

  if (!(await waitForProbe(dependencies.probe))) {
    throw new Error(
      `Forward did not become active at 127.0.0.1:${developmentHostMysqlPort} — check Colima and the MySQL container`,
    );
  }

  const pid = (await dependencies.listenerPid(developmentHostMysqlPort)) ?? spawnedPid;
  dependencies.writePid(pid);
  console.log(
    `MySQL host forward started: 127.0.0.1:${developmentHostMysqlPort} -> colima:${developmentColimaMysqlPort} (pid ${pid})`,
  );
}

async function stopForward(dependencies: ForwardDependencies): Promise<void> {
  const pid = dependencies.readPid();
  if (pid === null) {
    console.log("No managed forward pidfile — MySQL host forward is not managed by this script");
    return;
  }
  const terminated = await dependencies.terminate(pid);
  if (terminated) dependencies.clearPid();
  console.log(terminated ? "MySQL host forward stopped" : `Forward process ${pid} already gone`);
}

async function statusForward(dependencies: ForwardDependencies): Promise<void> {
  const active = await dependencies.probe(developmentHostMysqlPort);
  const pid = dependencies.readPid();
  if (active) {
    console.log(
      `MySQL host forward active at 127.0.0.1:${developmentHostMysqlPort}` +
        (pid !== null ? ` (pid ${pid})` : " (not managed by this script)"),
    );
    return;
  }
  console.log(
    `MySQL host forward not active at 127.0.0.1:${developmentHostMysqlPort} — run \`bun run db:forward\``,
  );
}

export async function runForwardAction(
  action: ForwardAction,
  dependencies: ForwardDependencies = defaultDependencies(),
): Promise<void> {
  if (action === "start") return startForward(dependencies);
  if (action === "stop") return stopForward(dependencies);
  return statusForward(dependencies);
}

if (import.meta.main) {
  await runForwardAction(parseForwardAction(process.argv[2]));
}
