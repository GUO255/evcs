import { createHash, randomUUID } from "node:crypto";
import mysql, { type PoolConnection, type RowDataPacket } from "mysql2/promise";

import { AuditEventStore } from "../../apps/auth-service/src/audit/audit-event-store";
import { normalizePhoneNumber } from "../../apps/auth-service/src/sms/phone-number";
import { seedPlatformOwnerRbac } from "../platform/platform-owner-rbac-bootstrap";

const SOURCE_TABLES = [
  "platform_member",
  "platform_member_role",
  "platform_role",
  "platform_role_permission",
  "site_exploration_team",
  "site_exploration_team_member",
  "auth_platform_user",
  "auth_platform_owner",
] as const;

const APPLY = Bun.argv.includes("--apply");
const databaseUrl = Bun.env.EVCS_DATABASE_URL;
if (!databaseUrl) throw new Error("EVCS_DATABASE_URL is required");
const target = new URL(databaseUrl);
if (target.protocol !== "mysql:" || target.pathname !== "/evcs") throw new Error("EVCS_DATABASE_URL must target the evcs MySQL database");

const pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 2, supportBigNumbers: true, bigNumberStrings: true });
const lockName = "evcs:repair:platform-member-identities";
const backupPrefix = `ops_backup_${new Date().toISOString().replaceAll(/[-:TZ.]/gu, "").slice(0, 14)}_identity`;

interface MemberRow extends RowDataPacket {
  id: string;
  auth_user_id: string;
  real_name: string;
  phone_number: string;
  status: number;
}

interface UserRow extends RowDataPacket {
  id: string;
  phone_number: string | null;
  role: string | null;
  banned: number;
}

interface OwnerRow extends RowDataPacket {
  id: string;
  phone_number: string;
  member_exists: number;
}

let lockConnection: PoolConnection | undefined;
try {
  lockConnection = await pool.getConnection();
  const [lockRows] = await lockConnection.query<Array<RowDataPacket & { acquired: number }>>("SELECT GET_LOCK(?, 30) AS acquired", [lockName]);
  if (Number(lockRows[0]?.acquired) !== 1) throw new Error("identity repair lock unavailable");

  const plan = await inspect(lockConnection, false);
  if (!APPLY) {
    console.log(JSON.stringify({
      mode: "dry-run",
      before: plan.before,
      createUsers: plan.createUsers,
      remapMembers: plan.remapMembers,
      keepMembers: plan.keepMembers,
      ensureOwnerMember: Number(plan.owner.member_exists) !== 1,
    }, null, 2));
    process.exitCode = 0;
  } else {
    await createBackups(lockConnection, backupPrefix);
    await lockConnection.beginTransaction();
    try {
      const lockedPlan = await inspect(lockConnection, true);
      if (JSON.stringify(plan) !== JSON.stringify(lockedPlan)) throw new Error("identity data changed after preflight");
      const repaired = await repair(lockConnection, lockedPlan);
      const verification = await verify(lockConnection, repaired.before, repaired.ownerMemberAdded);
      await lockConnection.commit();
      console.log(JSON.stringify({ mode: "applied", backupPrefix, ...repaired.summary, verification }, null, 2));
    } catch (error) {
      await lockConnection.rollback();
      throw error;
    }
  }
} finally {
  if (lockConnection) {
    await lockConnection.query("SELECT RELEASE_LOCK(?)", [lockName]).catch(() => undefined);
    lockConnection.release();
  }
  await pool.end();
}

async function inspect(connection: PoolConnection, lock: boolean) {
  const suffix = lock ? " FOR UPDATE" : "";
  const [members] = await connection.query<MemberRow[]>(
    `SELECT CAST(id AS CHAR) AS id, auth_user_id, real_name, phone_number, status FROM platform_member ORDER BY id${suffix}`,
  );
  const [users] = await connection.query<UserRow[]>(
    `SELECT id, phone_number, role, banned FROM auth_platform_user ORDER BY id${suffix}`,
  );
  const [owners] = await connection.query<OwnerRow[]>(
    `SELECT user.id, user.phone_number, CASE WHEN member.id IS NULL THEN 0 ELSE 1 END AS member_exists
     FROM auth_platform_owner owner
     INNER JOIN auth_platform_user user ON user.id = owner.auth_user_id
     LEFT JOIN platform_member member ON member.auth_user_id = user.id
     WHERE owner.singleton = 1${suffix}`,
  );
  if (owners.length !== 1 || !owners[0]?.phone_number) throw new Error("platform owner identity is missing");

  const phones = new Set<string>();
  for (const member of members) {
    let normalizedPhone: string;
    try { normalizedPhone = normalizePhoneNumber(member.phone_number); }
    catch { throw new Error(`member ${member.id} has an invalid phone number`); }
    if (normalizedPhone !== member.phone_number) throw new Error(`member ${member.id} has a non-canonical phone number`);
    if (phones.has(normalizedPhone)) throw new Error("platform member phone numbers are not unique");
    phones.add(normalizedPhone);
    if (![0, 1].includes(Number(member.status))) throw new Error(`member ${member.id} has an invalid status`);
    if (!isUuid(member.auth_user_id)) throw new Error(`member ${member.id} has an invalid auth user id`);
  }

  const userById = new Map(users.map((user) => [user.id, user]));
  const userByPhone = new Map(users.filter((user) => user.phone_number).map((user) => [user.phone_number!, user]));
  const actions = members.map((member) => {
    const byId = userById.get(member.auth_user_id);
    const byPhone = userByPhone.get(member.phone_number);
    if (byId && byId.phone_number !== member.phone_number) throw new Error(`member ${member.id} auth id belongs to another phone`);
    if (byId && byPhone && byId.id !== byPhone.id) throw new Error(`member ${member.id} has conflicting auth identities`);
    if (byId) return { memberId: member.id, action: "keep" as const, userId: byId.id };
    if (byPhone) return { memberId: member.id, action: "remap" as const, userId: byPhone.id };
    return { memberId: member.id, action: "create" as const, userId: member.auth_user_id };
  });

  const [counts] = await connection.query<Array<RowDataPacket & Record<string, string>>>(`SELECT
    (SELECT COUNT(*) FROM platform_member) AS members,
    (SELECT COUNT(*) FROM platform_member_role) AS memberRoles,
    (SELECT COUNT(*) FROM platform_role) AS roles,
    (SELECT COUNT(*) FROM platform_role_permission) AS rolePermissions,
    (SELECT COUNT(*) FROM site_exploration_team) AS teams,
    (SELECT COUNT(*) FROM site_exploration_team_member) AS teamMembers`);

  return {
    members,
    owner: owners[0],
    actions,
    before: counts[0]!,
    createUsers: actions.filter(({ action }) => action === "create").length,
    remapMembers: actions.filter(({ action }) => action === "remap").length,
    keepMembers: actions.filter(({ action }) => action === "keep").length,
  };
}

async function createBackups(connection: PoolConnection, prefix: string): Promise<void> {
  if (!/^ops_backup_\d{14}_identity$/u.test(prefix)) throw new Error("invalid backup prefix");
  for (const table of SOURCE_TABLES) {
    const backup = `${prefix}_${table}`;
    // JSON snapshots avoid recreating legacy timestamp defaults that are rejected by the
    // production server's current SQL mode while retaining every source column value.
    await connection.query(`CREATE TABLE \`${backup}\` (backup_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, payload JSON NOT NULL, PRIMARY KEY (backup_id))`);
  }
  await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
  await connection.query("START TRANSACTION WITH CONSISTENT SNAPSHOT");
  try {
    for (const table of SOURCE_TABLES) {
      const backup = `${prefix}_${table}`;
      const [columns] = await connection.query<Array<RowDataPacket & { columnName: string }>>(
        "SELECT column_name AS columnName FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position",
        [table],
      );
      if (columns.length === 0 || columns.some(({ columnName }) => !/^[a-z0-9_]+$/u.test(columnName))) throw new Error(`cannot snapshot ${table}`);
      const jsonArguments = columns.flatMap(({ columnName }) => [`'${columnName}'`, `\`${columnName}\``]).join(", ");
      await connection.query(`INSERT INTO \`${backup}\` (payload) SELECT JSON_OBJECT(${jsonArguments}) FROM \`${table}\``);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function repair(connection: PoolConnection, plan: Awaited<ReturnType<typeof inspect>>) {
  const now = Math.floor(Date.now() / 1_000);
  let createdUsers = 0;
  let remappedMembers = 0;
  for (const action of plan.actions) {
    const member = plan.members.find(({ id }) => id === action.memberId)!;
    if (action.action === "create") {
      const date = new Date(now * 1_000);
      const digest = createHash("sha256").update(member.phone_number).digest("hex");
      await connection.execute(
        `INSERT INTO auth_platform_user
         (id, name, email, email_verified, created_at, updated_at, phone_number, phone_number_verified, role, banned, ban_reason, ban_expires)
         VALUES (?, ?, ?, 0, ?, ?, ?, 0, 'user', ?, ?, NULL)`,
        [action.userId, member.real_name || "Platform user", `${digest}@repair.phone.platform.invalid`, date, date, member.phone_number, Number(member.status) === 1 ? 0 : 1, Number(member.status) === 1 ? null : "platform_member_disabled"],
      );
      await appendAudit(connection, action.userId, now);
      createdUsers += 1;
    }
    if (action.action === "remap") {
      await connection.execute("UPDATE platform_member SET auth_user_id = ? WHERE id = ? AND auth_user_id = ?", [action.userId, member.id, member.auth_user_id]);
      remappedMembers += 1;
    }
  }

  await seedPlatformOwnerRbac({ connection, userId: plan.owner.id, phoneNumber: plan.owner.phone_number, timestamp: now });
  return {
    before: plan.before,
    ownerMemberAdded: Number(plan.owner.member_exists) !== 1,
    summary: { createdUsers, remappedMembers, ownerMemberEnsured: true },
  };
}

async function appendAudit(connection: PoolConnection, userId: string, timestamp: number): Promise<void> {
  await new AuditEventStore().append(connection, {
    eventId: randomUUID(), operationId: randomUUID(), requestId: randomUUID(),
    actorType: "operator", actorId: "identity-repair", action: "platform.account.provision",
    targetType: "auth_user", targetId: userId, result: "succeeded",
    metadata: { source: "identity-repair" }, occurredAt: timestamp,
  });
}

async function verify(connection: PoolConnection, before: Record<string, string>, ownerMemberAdded: boolean) {
  const [rows] = await connection.query<Array<RowDataPacket & Record<string, string>>>(`SELECT
    (SELECT COUNT(*) FROM platform_member) AS members,
    (SELECT COUNT(*) FROM platform_member_role) AS memberRoles,
    (SELECT COUNT(*) FROM platform_role) AS roles,
    (SELECT COUNT(*) FROM platform_role_permission) AS rolePermissions,
    (SELECT COUNT(*) FROM site_exploration_team) AS teams,
    (SELECT COUNT(*) FROM site_exploration_team_member) AS teamMembers,
    (SELECT COUNT(*) FROM platform_member member LEFT JOIN auth_platform_user user ON user.id = member.auth_user_id WHERE user.id IS NULL) AS orphanMembers,
    (SELECT COUNT(*) FROM site_exploration_team_member teamMember LEFT JOIN platform_member member ON member.id = teamMember.platform_member_id WHERE member.id IS NULL) AS brokenTeamMemberReferences,
    (SELECT COUNT(*) FROM auth_platform_owner owner LEFT JOIN platform_member member ON member.auth_user_id = owner.auth_user_id WHERE owner.singleton = 1 AND member.id IS NOT NULL) AS linkedOwners`);
  const after = rows[0]!;
  for (const key of ["roles", "rolePermissions", "teams", "teamMembers"] as const) {
    if (after[key] !== before[key]) throw new Error(`${key} changed during identity repair`);
  }
  const ownerIncrement = ownerMemberAdded ? 1 : 0;
  if (Number(after.members) !== Number(before.members) + ownerIncrement || Number(after.memberRoles) !== Number(before.memberRoles) + ownerIncrement || Number(after.orphanMembers) !== 0 || Number(after.brokenTeamMemberReferences) !== 0 || Number(after.linkedOwners) !== 1) {
    throw new Error("identity repair verification failed");
  }
  return after;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}
