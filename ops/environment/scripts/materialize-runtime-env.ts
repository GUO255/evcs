import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { materializeRoleEnvironment } from "../generator";
import { loadProfileEnvironment } from "../profile-input";
import { environmentProfiles, environmentRoles, type EnvironmentProfile, type EnvironmentRole } from "../schema";

type CliInput = { profile: EnvironmentProfile; role: EnvironmentRole; outputDir: string };

export function parseMaterializeArgs(argv: string[]): CliInput {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error("Materialize arguments must be flag-value pairs.");
    if (values.has(key)) throw new Error(`Duplicate materialize argument: ${key}`);
    values.set(key, value);
  }
  const profile = values.get("--profile") as EnvironmentProfile | undefined;
  const role = values.get("--role") as EnvironmentRole | undefined;
  const outputDir = values.get("--output-dir");
  const allowed = new Set(["--profile", "--role", "--output-dir"]);
  for (const key of values.keys()) if (!allowed.has(key)) throw new Error(`Unknown materialize argument: ${key}`);
  if (!profile || !environmentProfiles.includes(profile)) throw new Error("--profile must be development or production.");
  if (!role || !environmentRoles.includes(role)) throw new Error("--role is invalid.");
  if (!outputDir) throw new Error("--output-dir is required.");
  return { profile, role, outputDir };
}

if (import.meta.main) {
  const input = parseMaterializeArgs(process.argv.slice(2));
  const repositoryRoot = resolve(import.meta.dir, "../../..");
  const localInput = resolve(repositoryRoot, `ops/.env.${input.profile}.local`);
  const includeLocal = input.profile === "development" || existsSync(localInput);
  const externalValues = loadProfileEnvironment(repositoryRoot, input.profile, includeLocal);
  const output = await materializeRoleEnvironment({
    profile: input.profile,
    role: input.role,
    externalValues,
    outputDir: resolve(input.outputDir),
    validateRequired: includeLocal,
  });
  console.log(JSON.stringify({ profile: input.profile, role: input.role, output }));
}
