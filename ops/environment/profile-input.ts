import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { renderStableProfile } from "./generator";
import { parseEnvironmentFile } from "./parser";
import type { EnvironmentProfile } from "./schema";

export function loadProfileEnvironment(
  root: string,
  profile: EnvironmentProfile,
  includeLocal: boolean,
): Record<string, string> {
  const stableRelative = `ops/.env.${profile}`;
  const stablePath = resolve(root, stableRelative);
  if (!existsSync(stablePath) || readFileSync(stablePath, "utf8") !== renderStableProfile(profile)) {
    throw new Error(`${stableRelative} is missing or stale; run bun run env:generate.`);
  }
  const stable = parseEnvironmentFile(readFileSync(stablePath, "utf8"));
  if (!includeLocal) return stable;

  const localRelative = `ops/.env.${profile}.local`;
  const localPath = resolve(root, localRelative);
  if (!existsSync(localPath)) throw new Error(`${localRelative} is required.`);
  const local = parseEnvironmentFile(readFileSync(localPath, "utf8"));
  for (const key of Object.keys(local)) {
    if (key in stable) throw new Error(`${key} must not be defined in both ${stableRelative} and ${localRelative}.`);
  }
  return { ...stable, ...local };
}
