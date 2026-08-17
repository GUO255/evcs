import type { MigrationResult } from "./raw-migration-runner";

export type MigrationScope = "all" | "core" | "platform" | "site-selection";
export type RawMigrationNamespace = "platform" | "site-selection";

export interface MigrationLaneDependencies {
  acquireLock(): Promise<void>;
  releaseLock(): Promise<void>;
  migrateAuth(): Promise<void>;
  migrateRaw(namespace: RawMigrationNamespace): Promise<MigrationResult>;
}

export async function runMigrationLanes(
  scope: MigrationScope,
  dependencies: MigrationLaneDependencies,
): Promise<MigrationResult> {
  await dependencies.acquireLock();
  try {
    if (scope === "all" || scope === "core") await dependencies.migrateAuth();

    const result: MigrationResult = { applied: [], skipped: [] };
    if (scope === "all" || scope === "core" || scope === "platform") {
      const platform = await dependencies.migrateRaw("platform");
      result.applied.push(...platform.applied);
      result.skipped.push(...platform.skipped);
    }
    if (scope === "all" || scope === "site-selection") {
      const siteSelection = await dependencies.migrateRaw("site-selection");
      result.applied.push(...siteSelection.applied);
      result.skipped.push(...siteSelection.skipped);
    }
    return result;
  } finally {
    await dependencies.releaseLock();
  }
}
