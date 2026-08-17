import { resolve } from "node:path";

import { atomicWrite } from "../environment/generator";
import { loadProfileEnvironment } from "../environment/profile-input";
import {
  parseDevelopmentDatabaseUrl,
  renderDevelopmentDatabaseEnvironment,
} from "./development-environment";

const repositoryRoot = resolve(import.meta.dir, "../..");
const generatedEnvironment = "ops/.env.generated/development.database.env";
const composeFile = "ops/database/compose.yaml";

export async function materializeDevelopmentDatabaseEnvironment(root = repositoryRoot): Promise<string> {
  const input = loadProfileEnvironment(root, "development", true);
  const configuration = parseDevelopmentDatabaseUrl(input.EVCS_DATABASE_URL);
  const output = resolve(root, generatedEnvironment);
  await atomicWrite(output, renderDevelopmentDatabaseEnvironment(configuration));
  return output;
}

async function run(command: readonly string[], root: string): Promise<void> {
  const child = Bun.spawn(command, { cwd: root, stdin: "inherit", stdout: "inherit", stderr: "inherit" });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`${command.join(" ")} failed with exit code ${exitCode}`);
}

export async function runDevelopmentDatabaseAction(action: string | undefined, root = repositoryRoot): Promise<void> {
  if (!action || !["start", "stop", "migrate"].includes(action)) {
    throw new Error("Usage: bun ops/database/manage-development.ts <start|stop|migrate>");
  }
  const environmentFile = await materializeDevelopmentDatabaseEnvironment(root);
  if (action === "migrate") {
    await run(["bun", "--no-env-file", `--env-file=${environmentFile}`, "ops/database/migrate.ts"], root);
    return;
  }
  const composeAction = action === "start" ? ["up", "-d", "mysql-development"] : ["stop", "mysql-development"];
  await run([
    "docker", "compose", "--env-file", environmentFile,
    "--profile", "development", "-f", composeFile, ...composeAction,
  ], root);
}

if (import.meta.main) await runDevelopmentDatabaseAction(process.argv[2]);
