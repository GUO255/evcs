import { describe, expect, test } from "bun:test";
import { applyRawMigrationsAlreadyLocked, runRawMigrations, type MigrationConnection, type RawMigration } from "../raw-migration-runner";

class FakeConnection implements MigrationConnection {
  readonly ledger = new Map<string, { checksum: string; status: "in_progress" | "applied" | "failed" }>();
  readonly appliedSql: string[] = [];
  lockAvailable = true;
  released = 0;
  failSql?: string;
  failAppliedUpdate = false;
  ledgerSchema: "missing" | "legacy" | "upgrade_pending" | "current" | "unknown" = "missing";
  ledgerAlterations = 0;

  async execute(sql: string, params: readonly unknown[] = []): Promise<readonly Record<string, unknown>[]> {
    if (sql.startsWith("SELECT GET_LOCK")) return [{ acquired: this.lockAvailable ? 1 : 0 }];
    if (sql.startsWith("SELECT RELEASE_LOCK")) { this.released++; return [{ released: 1 }]; }
    if (sql.startsWith("CREATE TABLE IF NOT EXISTS `_evcs_migrations`")) {
      if (this.ledgerSchema === "missing") this.ledgerSchema = "current";
      return [];
    }
    if (sql.startsWith("SELECT `COLUMN_NAME`")) {
      const nullable = (COLUMN_NAME: string, IS_NULLABLE: "YES" | "NO") => ({
        COLUMN_NAME,
        IS_NULLABLE,
        DATA_TYPE: COLUMN_NAME === "id" ? "varchar" : COLUMN_NAME === "checksum" ? "char" : COLUMN_NAME === "error_message" ? "text" : COLUMN_NAME.endsWith("_at") ? "timestamp" : COLUMN_NAME === "status" ? "varchar" : "unknown",
      });
      if (this.ledgerSchema === "legacy") return [nullable("id", "NO"), nullable("checksum", "NO"), nullable("applied_at", "NO")];
      if (this.ledgerSchema === "unknown") return [nullable("id", "NO"), nullable("checksum", "NO"), nullable("applied_at", "NO"), nullable("mystery", "YES")];
      if (this.ledgerSchema === "upgrade_pending") return [nullable("id", "NO"), nullable("checksum", "NO"), nullable("status", "YES"), nullable("error_message", "YES"), nullable("attempted_at", "YES"), nullable("applied_at", "NO")];
      return [nullable("id", "NO"), nullable("checksum", "NO"), nullable("status", "NO"), nullable("error_message", "YES"), nullable("attempted_at", "NO"), nullable("applied_at", "YES")];
    }
    if (sql.startsWith("ALTER TABLE `_evcs_migrations`\n      ADD COLUMN")) { this.ledgerAlterations++; this.ledgerSchema = "upgrade_pending"; return []; }
    if (sql.startsWith("UPDATE `_evcs_migrations` SET `status` = 'applied', `attempted_at`")) return [];
    if (sql.startsWith("ALTER TABLE `_evcs_migrations`\n    MODIFY COLUMN")) { this.ledgerAlterations++; this.ledgerSchema = "current"; return []; }
    if (sql.startsWith("SELECT `checksum`, `status`")) {
      const record = this.ledger.get(String(params[0]));
      return record ? [record] : [];
    }
    if (sql.startsWith("INSERT INTO `_evcs_migrations`")) {
      this.ledger.set(String(params[0]), { checksum: String(params[1]), status: "in_progress" });
      return [];
    }
    if (sql.startsWith("UPDATE `_evcs_migrations` SET `status` = 'applied'")) {
      if (this.failAppliedUpdate) throw new Error("injected applied update failure");
      this.ledger.get(String(params[0]))!.status = "applied";
      return [];
    }
    if (sql.startsWith("UPDATE `_evcs_migrations` SET `status` = 'failed'")) {
      this.ledger.get(String(params[1]))!.status = "failed";
      return [];
    }
    this.appliedSql.push(sql);
    if (sql === this.failSql) throw new Error("injected SQL failure");
    return [];
  }
}

const migrations = (...sql: string[]): RawMigration[] => sql.map((contents, index) => ({
  id: `${String(index + 1).padStart(4, "0")}.sql`,
  bytes: new TextEncoder().encode(contents),
}));

describe("raw migration runner", () => {
  test("namespaces ledger identifiers without changing migration result IDs", async () => {
    const connection = new FakeConnection();
    const files: RawMigration[] = [{
      id: "0001_platform_rbac.sql",
      bytes: new TextEncoder().encode("CREATE TABLE one (id INT)"),
    }];

    expect(await applyRawMigrationsAlreadyLocked(connection, "platform", files)).toEqual({
      applied: ["0001_platform_rbac.sql"],
      skipped: [],
    });

    const insertedLedgerId = [...connection.ledger.keys()][0];
    expect(insertedLedgerId).toBe("platform/0001_platform_rbac.sql");
    expect(await applyRawMigrationsAlreadyLocked(connection, "platform", files)).toEqual({
      applied: [],
      skipped: ["0001_platform_rbac.sql"],
    });
  });

  test("refuses when the advisory lock is held", async () => {
    const connection = new FakeConnection();
    connection.lockAvailable = false;
    await expect(runRawMigrations(connection, migrations("CREATE TABLE one (id INT)"))).rejects.toThrow("migration lock");
    expect(connection.appliedSql).toEqual([]);
  });

  test("records identifier and SHA-256 after first application and makes the second run a no-op", async () => {
    const connection = new FakeConnection();
    const files = migrations("CREATE TABLE one (id INT)");
    expect(await runRawMigrations(connection, files)).toEqual({ applied: ["0001.sql"], skipped: [] });
    expect([...connection.ledger.keys()]).toEqual(["site-selection/0001.sql"]);
    const record = connection.ledger.get("site-selection/0001.sql");
    expect(record?.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(record?.status).toBe("applied");
    expect(await runRawMigrations(connection, files)).toEqual({ applied: [], skipped: ["0001.sql"] });
    expect(connection.appliedSql).toHaveLength(1);
  });

  test("fails closed when an applied migration checksum drifts", async () => {
    const connection = new FakeConnection();
    await runRawMigrations(connection, migrations("SELECT 1"));
    await expect(runRawMigrations(connection, migrations("SELECT 2"))).rejects.toThrow("checksum drift");
  });

  test("records failed SQL as failed and releases the lock", async () => {
    const connection = new FakeConnection();
    connection.failSql = "BROKEN";
    const files = migrations("BROKEN");
    await expect(runRawMigrations(connection, files)).rejects.toThrow("0001.sql");
    expect(connection.ledger.get("site-selection/0001.sql")?.status).toBe("failed");
    expect(connection.released).toBe(1);
    connection.failSql = undefined;
    await expect(runRawMigrations(connection, files)).rejects.toThrow("failed");
    expect(connection.appliedSql).toEqual(["BROKEN"]);
  });

  test("leaves in-progress state when marking successful DDL as applied fails", async () => {
    const connection = new FakeConnection();
    connection.failAppliedUpdate = true;
    await expect(runRawMigrations(connection, migrations("CREATE TABLE one (id INT)"))).rejects.toThrow("inspect the schema");
    expect(connection.ledger.get("site-selection/0001.sql")?.status).toBe("in_progress");
    expect(connection.released).toBe(1);
    connection.failAppliedUpdate = false;
    await expect(runRawMigrations(connection, migrations("CREATE TABLE one (id INT)"))).rejects.toThrow("in_progress");
    expect(connection.appliedSql).toEqual(["CREATE TABLE one (id INT)"]);
  });

  test("refuses to run DDL when a prior attempt remains in progress", async () => {
    const connection = new FakeConnection();
    connection.ledger.set("site-selection/0001.sql", { checksum: "irrelevant", status: "in_progress" });
    await expect(runRawMigrations(connection, migrations("ONE"))).rejects.toThrow("in_progress");
    expect(connection.appliedSql).toEqual([]);
  });

  test("refuses to run DDL when a prior attempt is failed", async () => {
    const connection = new FakeConnection();
    connection.ledger.set("site-selection/0001.sql", { checksum: "irrelevant", status: "failed" });
    await expect(runRawMigrations(connection, migrations("ONE"))).rejects.toThrow("failed");
    expect(connection.appliedSql).toEqual([]);
  });

  test("skips previously applied files and continues with newly introduced files", async () => {
    const connection = new FakeConnection();
    await runRawMigrations(connection, migrations("ONE"));
    expect(await runRawMigrations(connection, migrations("ONE", "TWO"))).toEqual({ applied: ["0002.sql"], skipped: ["0001.sql"] });
    expect(connection.appliedSql).toEqual(["ONE", "TWO"]);
  });

  test("upgrades the legacy ledger under the migration lock before reading status", async () => {
    const connection = new FakeConnection();
    connection.ledgerSchema = "legacy";
    connection.ledger.set("site-selection/0001.sql", { checksum: new Bun.CryptoHasher("sha256").update("ONE").digest("hex"), status: "applied" });
    expect(await runRawMigrations(connection, migrations("ONE"))).toEqual({ applied: [], skipped: ["0001.sql"] });
    expect(connection.ledgerSchema).toBe("current");
    expect(connection.ledgerAlterations).toBe(2);
  });

  test("rejects unknown ledger schema drift", async () => {
    const connection = new FakeConnection();
    connection.ledgerSchema = "unknown";
    await expect(runRawMigrations(connection, migrations("ONE"))).rejects.toThrow("schema drift");
    expect(connection.appliedSql).toEqual([]);
  });
});
