export const MIGRATION_LOCK_NAME = "evcs_schema_migrations";

export interface MigrationConnection {
  execute(sql: string, params?: readonly unknown[]): Promise<readonly Record<string, unknown>[]>;
}

export interface RawMigration {
  id: string;
  bytes: Uint8Array;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

function checksum(bytes: Uint8Array): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(bytes);
  return hasher.digest("hex");
}

interface LedgerColumn {
  COLUMN_NAME: string;
  IS_NULLABLE: "YES" | "NO";
  DATA_TYPE: string;
}

const legacyLedger = new Map([
  ["id", "varchar"],
  ["checksum", "char"],
  ["applied_at", "timestamp"],
]);
const currentLedger = new Map([
  ["id", "varchar"],
  ["checksum", "char"],
  ["status", "varchar"],
  ["error_message", "text"],
  ["attempted_at", "timestamp"],
  ["applied_at", "timestamp"],
]);

async function readLedgerColumns(connection: MigrationConnection): Promise<readonly LedgerColumn[]> {
  return await connection.execute(
    "SELECT `COLUMN_NAME`, `IS_NULLABLE`, `DATA_TYPE` FROM `INFORMATION_SCHEMA`.`COLUMNS` WHERE `TABLE_SCHEMA` = DATABASE() AND `TABLE_NAME` = '_evcs_migrations' ORDER BY `ORDINAL_POSITION`",
  ) as unknown as readonly LedgerColumn[];
}

function hasExactColumns(columns: readonly LedgerColumn[], expected: ReadonlyMap<string, string>): boolean {
  return columns.length === expected.size && columns.every((column) => expected.get(column.COLUMN_NAME) === column.DATA_TYPE);
}

function isCurrentLedger(columns: readonly LedgerColumn[]): boolean {
  if (!hasExactColumns(columns, currentLedger)) return false;
  const nullable = new Map(columns.map((column) => [column.COLUMN_NAME, column.IS_NULLABLE]));
  return nullable.get("id") === "NO" && nullable.get("checksum") === "NO" && nullable.get("status") === "NO" &&
    nullable.get("error_message") === "YES" && nullable.get("attempted_at") === "NO" && nullable.get("applied_at") === "YES";
}

async function ensureMigrationLedger(connection: MigrationConnection): Promise<void> {
  await connection.execute(`CREATE TABLE IF NOT EXISTS \`_evcs_migrations\` (
    \`id\` VARCHAR(255) NOT NULL,
    \`checksum\` CHAR(64) NOT NULL,
    \`status\` VARCHAR(16) NOT NULL,
    \`error_message\` TEXT NULL,
    \`attempted_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    \`applied_at\` TIMESTAMP(6) NULL,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`);

  let columns = await readLedgerColumns(connection);
  if (isCurrentLedger(columns)) return;

  if (hasExactColumns(columns, legacyLedger)) {
    await connection.execute(`ALTER TABLE \`_evcs_migrations\`
      ADD COLUMN \`status\` VARCHAR(16) NULL AFTER \`checksum\`,
      ADD COLUMN \`error_message\` TEXT NULL AFTER \`status\`,
      ADD COLUMN \`attempted_at\` TIMESTAMP(6) NULL AFTER \`error_message\``);
    columns = await readLedgerColumns(connection);
  }

  const nullable = new Map(columns.map((column) => [column.COLUMN_NAME, column.IS_NULLABLE]));
  const upgradePending = hasExactColumns(columns, currentLedger) && nullable.get("status") === "YES" && nullable.get("attempted_at") === "YES";
  if (!upgradePending) throw new Error("_evcs_migrations schema drift detected; inspect the ledger before migrating");

  await connection.execute("UPDATE `_evcs_migrations` SET `status` = 'applied', `attempted_at` = `applied_at` WHERE `status` IS NULL");
  await connection.execute(`ALTER TABLE \`_evcs_migrations\`
    MODIFY COLUMN \`status\` VARCHAR(16) NOT NULL,
    MODIFY COLUMN \`attempted_at\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    MODIFY COLUMN \`applied_at\` TIMESTAMP(6) NULL`);
  if (!isCurrentLedger(await readLedgerColumns(connection))) {
    throw new Error("_evcs_migrations schema drift detected after upgrade");
  }
}

export async function acquireMigrationLock(connection: MigrationConnection): Promise<void> {
  const rows = await connection.execute("SELECT GET_LOCK(?, 0) AS `acquired`", [MIGRATION_LOCK_NAME]);
  if (Number(rows[0]?.acquired) !== 1) throw new Error("Unable to acquire the EVCS migration lock");
}

export async function releaseMigrationLock(connection: MigrationConnection): Promise<void> {
  await connection.execute("SELECT RELEASE_LOCK(?) AS `released`", [MIGRATION_LOCK_NAME]);
}

export async function applyRawMigrationsAlreadyLocked(
  connection: MigrationConnection,
  namespace: "platform" | "site-selection",
  migrations: readonly RawMigration[],
): Promise<MigrationResult> {
  await ensureMigrationLedger(connection);

  const result: MigrationResult = { applied: [], skipped: [] };
  for (const migration of migrations) {
    const identifier = `${namespace}/${migration.id}`;
    const expectedChecksum = checksum(migration.bytes);
    const rows = await connection.execute("SELECT `checksum`, `status` FROM `_evcs_migrations` WHERE `id` = ?", [identifier]);
    if (rows.length > 0) {
      const status = String(rows[0]?.status);
      if (status !== "applied") {
        throw new Error(`Migration ${migration.id} has persisted status ${status}; inspect and recover the schema explicitly before retrying`);
      }
      if (rows[0]?.checksum !== expectedChecksum) throw new Error(`Migration checksum drift detected for ${migration.id}`);
      result.skipped.push(migration.id);
      continue;
    }

    await connection.execute(
      "INSERT INTO `_evcs_migrations` (`id`, `checksum`, `status`) VALUES (?, ?, 'in_progress')",
      [identifier, expectedChecksum],
    );
    try {
      await connection.execute(new TextDecoder().decode(migration.bytes));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      try {
        await connection.execute(
          "UPDATE `_evcs_migrations` SET `status` = 'failed', `error_message` = ? WHERE `id` = ?",
          [message, identifier],
        );
      } catch (markCause) {
        throw new Error(`Raw migration ${migration.id} failed and remains in_progress; inspect the schema before retrying`, { cause: markCause });
      }
      throw new Error(`Raw migration ${migration.id} failed and is marked failed; inspect the schema before retrying`, { cause });
    }
    try {
      await connection.execute(
        "UPDATE `_evcs_migrations` SET `status` = 'applied', `applied_at` = CURRENT_TIMESTAMP(6), `error_message` = NULL WHERE `id` = ?",
        [identifier],
      );
    } catch (cause) {
      throw new Error(`Raw migration ${migration.id} DDL succeeded but its ledger remains in_progress; inspect the schema before retrying`, { cause });
    }
    result.applied.push(migration.id);
  }
  return result;
}

export async function runRawMigrations(
  connection: MigrationConnection,
  migrations: readonly RawMigration[],
): Promise<MigrationResult> {
  await acquireMigrationLock(connection);
  try {
    return await applyRawMigrationsAlreadyLocked(connection, "site-selection", migrations);
  } finally {
    await releaseMigrationLock(connection);
  }
}
