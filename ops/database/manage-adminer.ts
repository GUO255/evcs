import { developmentAdminerContainer, developmentAdminerUrl } from "../pm2/status-summary";

const image = "adminer:latest";
const network = "database_default";
const databaseServer = "mysql-development";

export const adminerActions = ["start", "stop", "status"] as const;
export type AdminerAction = (typeof adminerActions)[number];

export function parseAdminerAction(value: string | undefined): AdminerAction {
  if (!value || !adminerActions.includes(value as AdminerAction)) {
    throw new Error(`Usage: bun ops/database/manage-adminer.ts <${adminerActions.join("|")}>`);
  }
  return value as AdminerAction;
}

async function run(command: string[]): Promise<number> {
  const child = Bun.spawn(command, {
    stdout: "inherit",
    stderr: "inherit",
  });
  return child.exited;
}

async function inspect(name: string): Promise<string | null> {
  const child = Bun.spawn(["docker", "container", "inspect", "--format", "{{.State.Status}}", name], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(child.stdout).text();
  const exitCode = await child.exited;
  if (exitCode !== 0) return null;
  return stdout.trim() || null;
}

export async function runAdminerAction(action: AdminerAction, dependencies?: { run?: (command: string[]) => Promise<number>; inspect?: (name: string) => Promise<string | null> }): Promise<void> {
  const execute = dependencies?.run ?? run;
  const current = dependencies?.inspect ?? inspect;

  if (action === "start") {
    const state = await current(developmentAdminerContainer);
    if (state === "running") {
      console.log(`Adminer already running at ${developmentAdminerUrl}`);
      return;
    }
    if (state) {
      await execute(["docker", "start", developmentAdminerContainer]);
      console.log(`Adminer started at ${developmentAdminerUrl}`);
      return;
    }
    const exitCode = await execute([
      "docker", "run", "-d",
      "--name", developmentAdminerContainer,
      "--network", network,
      "-e", `ADMINER_DEFAULT_SERVER=${databaseServer}`,
      "-p", "127.0.0.1:8081:8080",
      "--restart", "unless-stopped",
      image,
    ]);
    if (exitCode !== 0) throw new Error(`Adminer container failed to start (${exitCode})`);
    console.log(`Adminer started at ${developmentAdminerUrl}`);
    return;
  }

  if (action === "stop") {
    const state = await current(developmentAdminerContainer);
    if (state === null) {
      console.log(`Adminer container ${developmentAdminerContainer} does not exist`);
      return;
    }
    if (state !== "running") {
      console.log(`Adminer container is already ${state}`);
      return;
    }
    await execute(["docker", "stop", developmentAdminerContainer]);
    console.log("Adminer stopped");
    return;
  }

  const state = await current(developmentAdminerContainer);
  console.log(state === null ? "Adminer container not created" : `Adminer container ${state} at ${developmentAdminerUrl}`);
}

if (import.meta.main) {
  await runAdminerAction(parseAdminerAction(process.argv[2]));
}
