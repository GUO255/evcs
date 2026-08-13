import { resolve } from "node:path";
import { materializeDevelopmentEnvironment } from "../environment/scripts/materialize-development-env";

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

export async function runDevelopmentAction(
  action: DevelopmentAction,
  dependencies: {
    materialize?: () => Promise<unknown> | unknown;
    run?: (command: string[]) => Promise<void>;
  } = {},
): Promise<void> {
  const execute = dependencies.run ?? run;

  if (action === "start" || action === "restart") {
    await (dependencies.materialize ?? (() => materializeDevelopmentEnvironment(repositoryRoot)))();
  }

  if (action === "start") {
    await execute(["bun", "run", "--filter", "@evcs/auth-web", "build"]);
    await execute(["bunx", "pm2", "start", ecosystem]);
    return;
  }
  if (action === "restart") {
    await execute(["bunx", "pm2", "restart", ecosystem, "--update-env"]);
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
}

if (import.meta.main) {
  await runDevelopmentAction(parseDevelopmentAction(process.argv[2]));
}
