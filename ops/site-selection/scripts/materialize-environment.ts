import { resolve } from "node:path";
import { materializeRoleEnvironment } from "../../environment/generator";
import { loadProfileEnvironment } from "../../environment/profile-input";
import type { EnvironmentProfile, EnvironmentRole } from "../../environment/schema";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const outputDir = resolve(repositoryRoot, "ops/.env.generated");

export const siteSelectionEnvironmentModes = ["development"] as const;
export type SiteSelectionEnvironmentMode = (typeof siteSelectionEnvironmentModes)[number];

type Materialization = {
  profile: EnvironmentProfile;
  role: EnvironmentRole;
};

const materializations: Record<SiteSelectionEnvironmentMode, readonly Materialization[]> = {
  development: [
    { profile: "development", role: "site-selection-service-api" },
    { profile: "development", role: "site-selection-service-worker" },
    { profile: "development", role: "site-selection-web-build" },
  ],
};

export function parseSiteSelectionEnvironmentMode(value: string | undefined): SiteSelectionEnvironmentMode {
  if (!value || !siteSelectionEnvironmentModes.includes(value as SiteSelectionEnvironmentMode)) {
    throw new Error(`Usage: bun ops/site-selection/scripts/materialize-environment.ts <${siteSelectionEnvironmentModes.join("|")}>`);
  }
  return value as SiteSelectionEnvironmentMode;
}

export async function materializeSiteSelectionEnvironment(mode: SiteSelectionEnvironmentMode): Promise<void> {
  for (const input of materializations[mode]) {
    await materializeRoleEnvironment({
      profile: input.profile,
      role: input.role,
      externalValues: loadProfileEnvironment(repositoryRoot, input.profile, true),
      outputDir,
      validateRequired: true,
    });
  }
}

if (import.meta.main) {
  const mode = parseSiteSelectionEnvironmentMode(process.argv[2]);
  await materializeSiteSelectionEnvironment(mode);
}
