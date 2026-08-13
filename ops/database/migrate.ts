import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { runMigrationLanes, type RawMigrationNamespace } from "./migration-orchestrator";
import {
  acquireMigrationLock,
  applyRawMigrationsAlreadyLocked,
  releaseMigrationLock,
  type MigrationConnection,
  type RawMigration,
} from "./raw-migration-runner";

const databaseUrl = process.env.EVCS_DATABASE_URL;
if (!databaseUrl) throw new Error("EVCS_DATABASE_URL is required");
const migrationScope = process.env.EVCS_MIGRATION_SCOPE ?? "all";
if (
  migrationScope !== "all"
  && migrationScope !== "core"
  && migrationScope !== "platform"
  && migrationScope !== "site-selection"
) {
  throw new Error(`Unsupported EVCS_MIGRATION_SCOPE: ${migrationScope}`);
}

const authMigrations = `${import.meta.dir}/migrations/auth`;
const platformMigrations = `${import.meta.dir}/migrations/platform`;
const siteSelectionMigrations = `${import.meta.dir}/migrations/site-selection`;
const connection = await mysql.createConnection({
  uri: databaseUrl,
  multipleStatements: true,
});
const adapter: MigrationConnection = {
  async execute(sql, params = []) {
    const [rows] = await connection.query(sql, [...params]);
    return Array.isArray(rows) ? rows as Record<string, unknown>[] : [];
  },
};

async function loadRawMigrations(directory: string): Promise<RawMigration[]> {
  const files: RawMigration[] = [];
  const glob = new Bun.Glob("*.sql");
  for await (const id of glob.scan({ cwd: directory, onlyFiles: true })) {
    files.push({ id, bytes: new Uint8Array(await Bun.file(`${directory}/${id}`).arrayBuffer()) });
  }
  return files.sort((left, right) => left.id.localeCompare(right.id));
}

try {
  const result = await runMigrationLanes(migrationScope, {
    acquireLock: () => acquireMigrationLock(adapter),
    releaseLock: () => releaseMigrationLock(adapter),
    migrateAuth: () => migrate(drizzle(connection), { migrationsFolder: authMigrations }),
    migrateRaw: async (namespace: RawMigrationNamespace) => {
      const directory = namespace === "platform" ? platformMigrations : siteSelectionMigrations;
      return applyRawMigrationsAlreadyLocked(adapter, namespace, await loadRawMigrations(directory));
    },
  });
  console.log(`Database migrations complete: ${result.applied.length} raw applied, ${result.skipped.length} raw unchanged`);
} finally {
  await connection.end();
}
