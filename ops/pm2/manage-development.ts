import { connect } from "node:net";
import { resolve } from "node:path";
import { materializeDevelopmentEnvironment } from "../environment/scripts/materialize-development-env";
import { collectDevelopmentStatus, renderDevelopmentStatusSummary } from "./status-summary";

const repositoryRoot = resolve(import.meta.dir, "../..");
const ecosystem = "ops/pm2/ecosystem.development.config.cjs";

export const developmentActions = ["start", "restart", "stop", "logs", "status"] as const;
export type DevelopmentAction = (typeof developmentActions)[number];

export function parseDevelopmentAction(value: string | undefined): DevelopmentAction {
  if (!value || !developmentActions.includes(value as DevelopmentAction)) {
    throw new Error(`Usage: bun ops/pm2/manage-development.ts <${developmentActions.join("|")}>`);
  }
  return value as DevelopmentAction;
}

async function run(command: string[]): Promise<void> {
  const child = Bun.spawn(command, {
    cwd: repositoryRoot,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`Development command failed (${exitCode}): ${command.join(" ")}`);
}

async function capture(command: string[]): Promise<string> {
  const child = Bun.spawn(command, {
    cwd: repositoryRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) throw new Error(`${command.join(" ")} failed (${exitCode}): ${stderr.trim()}`);
  return stdout;
}

function probeTcp(port: number): Promise<boolean> {
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

async function printDevelopmentStatusSummary(): Promise<void> {
  const snapshot = await collectDevelopmentStatus(capture, probeTcp);
  console.log(renderDevelopmentStatusSummary(snapshot));
}

export async function runDevelopmentAction(
  action: DevelopmentAction,
  dependencies: {
    materialize?: () => Promise<unknown> | unknown;
    run?: (command: string[]) => Promise<void>;
    printSummary?: () => Promise<void>;
  } = {},
): Promise<void> {
  const execute = dependencies.run ?? run;
  const printSummary = dependencies.printSummary ?? printDevelopmentStatusSummary;

  if (action === "start" || action === "restart") {
    await (dependencies.materialize ?? (() => materializeDevelopmentEnvironment(repositoryRoot)))();
  }

  if (action === "start") {
    await execute(["bun", "run", "--filter", "@evcs/auth-web", "build"]);
    await execute(["bunx", "pm2", "start", ecosystem]);
    await printSummary();
    return;
  }
  if (action === "restart") {
    await execute(["bunx", "pm2", "restart", ecosystem, "--update-env"]);
    await printSummary();
    return;
  }
  if (action === "stop") {
    await execute(["bunx", "pm2", "stop", ecosystem]);
    return;
  }
  if (action === "logs") {
    await execute(["bunx", "pm2", "logs", "evcs-development"]);
    return;
  }
  await execute(["bunx", "pm2", "status"]);
  await printSummary();
}

if (import.meta.main) {
  await runDevelopmentAction(parseDevelopmentAction(process.argv[2]));
}
