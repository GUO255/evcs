import { createInterface } from "node:readline/promises";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { createDatabaseClient, type DatabaseClient } from "../../apps/auth-service/src/database/client";
import { createOwnerStore, OwnerBootstrapError } from "../../apps/auth-service/src/platform/owner-store";
import { normalizePhoneNumber } from "../../apps/auth-service/src/sms/phone-number";
import { seedPlatformOwnerRbac } from "../platform/platform-owner-rbac-bootstrap";

export type OwnerAction = "create" | "repair";
type OwnerDatabaseClient = Pick<DatabaseClient, "pool" | "close">;
type OwnerCommandArguments =
  | { readonly mode: "interactive" }
  | { readonly mode: "arguments"; readonly phoneNumber: string };

export function parseOwnerAction(value: string | undefined): OwnerAction {
  if (value === "create" || value === "repair") return value;
  throw new Error("Platform Owner action must be create or repair.");
}

export function parseOwnerCommandArguments(args: readonly string[]): OwnerCommandArguments {
  if (args.length === 0) return { mode: "interactive" };
  if (args.length === 1 && args[0]?.startsWith("--phone=")) {
    const phoneNumber = args[0].slice("--phone=".length);
    if (phoneNumber) return { mode: "arguments", phoneNumber };
  }
  if (args.length === 2 && args[0] === "--phone" && args[1]) {
    return { mode: "arguments", phoneNumber: args[1] };
  }
  throw new Error("Platform Owner command arguments are invalid.");
}

export async function verifyOwnerManagementSchema(pool: Pool): Promise<void> {
  const [databaseRows] = await pool.query<Array<RowDataPacket & { schemaName: string | null }>>("SELECT DATABASE() AS schemaName");
  if (databaseRows[0]?.schemaName !== "evcs") throw new Error("EVCS_DATABASE_URL must target the unified evcs database");
  const [tableRows] = await pool.execute<Array<RowDataPacket & { tableName: string }>>(
    `SELECT table_name AS tableName FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name IN (
       'auth_platform_user', 'auth_platform_owner', 'auth_platform_audit_event',
       'platform_role', 'platform_member', 'platform_member_role'
     )`,
  );
  if (tableRows.length !== 6) throw new Error("required owner management tables are unavailable; run database migrations first");
  const [columnRows] = await pool.execute<Array<RowDataPacket & { columnCount: number | string }>>(
    `SELECT COUNT(*) AS columnCount FROM information_schema.columns
     WHERE table_schema = DATABASE() AND (
       (table_name = 'platform_member' AND column_name = 'credentials_valid_after' AND column_type = 'int unsigned' AND is_nullable = 'NO' AND column_default = '0')
       OR (table_name = 'platform_role' AND column_name = 'member_count' AND column_type = 'bigint unsigned' AND is_nullable = 'NO' AND column_default = '0')
       OR (table_name = 'platform_role' AND column_name = 'display_name' AND column_type = 'varchar(64)' AND is_nullable = 'NO')
       OR (table_name = 'platform_role' AND column_name = 'system_key' AND column_type = 'varchar(64)' AND is_nullable = 'YES')
     )`,
  );
  if (Number(columnRows[0]?.columnCount) !== 4) throw new Error("required Platform migrations are unavailable; run database migrations first");
}

type OwnerCommandOptions = {
  readonly action: OwnerAction;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly promptPhone?: () => Promise<string>;
  readonly stdout?: (line: string) => void;
  readonly stderr?: (line: string) => void;
  readonly createClient?: (url: string) => OwnerDatabaseClient;
  readonly verifySchema?: (pool: Pool) => Promise<void>;
  readonly operate?: (action: OwnerAction, phoneNumber: string, pool: Pool) => Promise<{ readonly userId: string }>;
};

export async function executeOwnerCommand(options: OwnerCommandOptions): Promise<number> {
  const stdout = options.stdout ?? console.log;
  const stderr = options.stderr ?? console.error;
  let client: OwnerDatabaseClient | undefined;
  try {
    const parsed = parseOwnerCommandArguments(options.args);
    const rawPhone = parsed.mode === "arguments"
      ? parsed.phoneNumber
      : await (options.promptPhone ?? promptOwnerPhone)();
    let phoneNumber: string;
    try { phoneNumber = normalizePhoneNumber(rawPhone); }
    catch { throw new OwnerBootstrapError("invalid_phone"); }

    const databaseUrl = options.env.EVCS_DATABASE_URL;
    if (!databaseUrl) throw Object.assign(new Error("EVCS_DATABASE_URL is required"), { code: "database_url_required" });
    const target = new URL(databaseUrl);
    if (target.protocol !== "mysql:" || target.pathname !== "/evcs") {
      throw Object.assign(new Error("EVCS_DATABASE_URL must target the unified evcs database"), { code: "database_target_invalid" });
    }

    client = (options.createClient ?? createDatabaseClient)(databaseUrl);
    await (options.verifySchema ?? verifyOwnerManagementSchema)(client.pool);
    const result = await (options.operate ?? operateOwner)(options.action, phoneNumber, client.pool);
    stdout(JSON.stringify({ status: options.action === "create" ? "created" : "repaired", userId: result.userId }));
    return 0;
  } catch (error) {
    stderr(JSON.stringify({ error: "platform_owner_command_failed", code: ownerCommandErrorCode(error) }));
    return 1;
  } finally {
    await client?.close();
  }
}

async function operateOwner(action: OwnerAction, phoneNumber: string, pool: Pool): Promise<{ readonly userId: string }> {
  const store = createOwnerStore({ pool, onOwnerCreated: seedPlatformOwnerRbac });
  return action === "create"
    ? store.bootstrap({ phoneNumber })
    : store.repair({ phoneNumber });
}

async function promptOwnerPhone(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw Object.assign(new Error("Interactive Platform Owner command requires a TTY."), { code: "interactive_tty_required" });
  }
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await terminal.question("平台 Owner 手机号: ");
  } finally {
    terminal.close();
  }
}

function ownerCommandErrorCode(error: unknown): string {
  if (error instanceof OwnerBootstrapError) return error.code;
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") return error.code;
  return "command_failed";
}

export async function runOwnerCli(
  argv: readonly string[],
  io: { readonly stdout: (line: string) => void; readonly stderr: (line: string) => void },
): Promise<number> {
  try {
    const action = parseOwnerAction(argv[2]);
    return executeOwnerCommand({ action, args: argv.slice(3), env: process.env, ...io });
  } catch (error) {
    io.stderr(JSON.stringify({ error: "platform_owner_command_failed", code: ownerCommandErrorCode(error) }));
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = await runOwnerCli(Bun.argv, { stdout: console.log, stderr: console.error });
}
