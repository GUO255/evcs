import mysql, { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

type SourceMember = {
  teamName: string;
  responsibility: "责任人" | "组员";
  realName: string;
  phoneNumber: string;
};

type TeamRow = RowDataPacket & { id: string | number | bigint; name: string; status: number };
type MemberRow = RowDataPacket & {
  id: string | number | bigint;
  auth_user_id: string;
  real_name: string;
  phone_number: string;
  status: number;
};

const arguments_ = process.argv.slice(2);
const execute = arguments_.includes("--execute");
const inputArgument = arguments_.find((argument) => !argument.startsWith("--"));
if (!inputArgument || arguments_.some((argument) => argument.startsWith("--") && argument !== "--execute")) {
  throw new Error("Usage: bun ops/database/import-exploration-team-members.ts <members.json> [--execute]");
}

const mysqlUrl = requiredEnvironment("PLATFORM_MYSQL_URL");
const databaseHost = new URL(mysqlUrl).hostname;
if (databaseHost !== "127.0.0.1" && databaseHost !== "localhost") {
  throw new Error(`Refusing to import platform members into a non-local database host: ${databaseHost}`);
}
const authBaseUrl = new URL(requiredEnvironment("PLATFORM_AUTH_INTERNAL_BASE_URL"));
if (authBaseUrl.hostname !== "127.0.0.1" && authBaseUrl.hostname !== "localhost") {
  throw new Error(`Refusing to provision accounts through a non-local auth service: ${authBaseUrl.hostname}`);
}

const members = parseWorkbookRows(JSON.parse(await readFile(inputArgument, "utf8")) as unknown);
const connection = await mysql.createConnection(mysqlUrl);
try {
  const teamNames = [...new Set(members.map((member) => member.teamName))];
  const phoneNumbers = members.map((member) => member.phoneNumber);
  const [teams] = await connection.query<TeamRow[]>(
    `SELECT CAST(id AS CHAR) AS id, name, status
     FROM site_exploration_team
     WHERE name IN (${placeholders(teamNames.length)})
     ORDER BY id`,
    teamNames,
  );
  assertTeams(teamNames, teams);
  const [existingMembers] = await connection.query<MemberRow[]>(
    `SELECT CAST(id AS CHAR) AS id, auth_user_id, real_name, phone_number, status
     FROM platform_member FORCE INDEX (uk_platform_member_phone)
     WHERE phone_number IN (${placeholders(phoneNumbers.length)})
     ORDER BY id`,
    phoneNumbers,
  );
  const [roleRows] = await connection.query<(RowDataPacket & { id: string })[]>(
    "SELECT CAST(id AS CHAR) AS id FROM platform_role FORCE INDEX (uk_platform_role_display_name) WHERE display_name = ? LIMIT 1",
    ["勘探人员"],
  );

  console.log(JSON.stringify({
    mode: execute ? "execute-preview" : "dry-run",
    sourceMembers: members.length,
    groups: Object.fromEntries(teamNames.map((name) => [name, members.filter((member) => member.teamName === name).length])),
    existingMembers: existingMembers.map((member) => ({ id: String(member.id), realName: member.real_name, status: Number(member.status) })),
    membersToCreate: members.length - existingMembers.length,
    platformRole: roleRows.length ? "reuse:勘探人员" : "create:勘探人员",
    permission: "agents.site-selection.use",
  }, null, 2));
  if (!execute) process.exit(0);

  const provisioned = await provisionAccounts(members);
  const result = await executeImport(connection, members, provisioned);
  console.log(JSON.stringify({ mode: "execute-complete", ...result }, null, 2));
} finally {
  await connection.end();
}

async function provisionAccounts(sourceMembers: readonly SourceMember[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const member of sourceMembers) {
    const response = await fetch(new URL("/internal/platform/accounts", authBaseUrl), {
      method: "POST",
      headers: {
        authorization: `Bearer ${requiredEnvironment("PLATFORM_AUTH_INTERNAL_SECRET")}`,
        "content-type": "application/json",
        "idempotency-key": `exploration-team-${createHash("sha256").update(member.phoneNumber).digest("hex")}`,
        "x-request-id": randomUUID(),
      },
      body: JSON.stringify({ phoneNumber: member.phoneNumber }),
      signal: AbortSignal.timeout(10_000),
    });
    const payload = await response.json() as unknown;
    if (!response.ok || !isRecord(payload) || typeof payload.userId !== "string") {
      throw new Error(`Account provisioning failed for ${member.realName} with HTTP ${response.status}`);
    }
    result.set(member.phoneNumber, payload.userId);
  }
  return result;
}

async function executeImport(
  database: Awaited<ReturnType<typeof mysql.createConnection>>,
  sourceMembers: readonly SourceMember[],
  authUsersByPhone: ReadonlyMap<string, string>,
) {
  await database.beginTransaction();
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const requestId = randomUUID();
    const [[actor]] = await database.query<(RowDataPacket & { id: string; authUserId: string })[]>(`
      SELECT CAST(id AS CHAR) AS id, auth_user_id AS authUserId
      FROM platform_member
      WHERE protected_member = 1 AND status = 1
      ORDER BY id
      LIMIT 1
      FOR UPDATE
    `);
    if (!actor) throw new Error("No active protected platform member is available as the import actor");

    const teamNames = [...new Set(sourceMembers.map((member) => member.teamName))];
    const [teams] = await database.query<TeamRow[]>(
      `SELECT CAST(id AS CHAR) AS id, name, status
       FROM site_exploration_team
       WHERE name IN (${placeholders(teamNames.length)})
       ORDER BY id
       FOR UPDATE`,
      teamNames,
    );
    assertTeams(teamNames, teams);
    const teamIdByName = new Map(teams.map((team) => [team.name, String(team.id)]));

    const role = await ensureExplorationRole(database, actor.authUserId, requestId, timestamp);
    const phoneNumbers = sourceMembers.map((member) => member.phoneNumber);
    const [beforeRows] = await database.query<MemberRow[]>(
      `SELECT CAST(id AS CHAR) AS id, auth_user_id, real_name, phone_number, status
       FROM platform_member FORCE INDEX (uk_platform_member_phone)
       WHERE phone_number IN (${placeholders(phoneNumbers.length)})
       ORDER BY id
       FOR UPDATE`,
      phoneNumbers,
    );
    const beforeByPhone = new Map(beforeRows.map((row) => [row.phone_number, row]));
    for (const member of sourceMembers) {
      const existing = beforeByPhone.get(member.phoneNumber);
      if (!existing) continue;
      if (existing.auth_user_id !== authUsersByPhone.get(member.phoneNumber)) {
        throw new Error(`Existing platform member account conflict: ${member.realName}`);
      }
      if (normalizeName(existing.real_name) !== member.realName) {
        throw new Error(`Existing platform member name conflict: ${member.realName}`);
      }
    }

    const missing = sourceMembers.filter((member) => !beforeByPhone.has(member.phoneNumber));
    if (missing.length) {
      const authUserIds = missing.map((member) => requiredMapValue(authUsersByPhone, member.phoneNumber));
      const [authConflicts] = await database.query<(RowDataPacket & { authUserId: string })[]>(
        `SELECT auth_user_id AS authUserId
         FROM platform_member FORCE INDEX (uk_platform_member_auth_user)
         WHERE auth_user_id IN (${placeholders(authUserIds.length)})
         FOR UPDATE`,
        authUserIds,
      );
      if (authConflicts.length) throw new Error("A provisioned authentication account is already bound to another platform member");
      const values = missing.flatMap((member) => [
        requiredMapValue(authUsersByPhone, member.phoneNumber), member.realName, member.phoneNumber, timestamp, timestamp,
      ]);
      await database.execute<ResultSetHeader>(`
        INSERT INTO platform_member
          (auth_user_id, real_name, phone_number, email, status, protected_member, credentials_valid_after, created_at, updated_at)
        VALUES ${missing.map(() => "(?, ?, ?, NULL, 1, 0, 0, ?, ?)").join(", ")}
      `, values);
    }

    const [allRows] = await database.query<MemberRow[]>(
      `SELECT CAST(id AS CHAR) AS id, auth_user_id, real_name, phone_number, status
       FROM platform_member FORCE INDEX (uk_platform_member_phone)
       WHERE phone_number IN (${placeholders(phoneNumbers.length)})
       ORDER BY id
       FOR UPDATE`,
      phoneNumbers,
    );
    if (allRows.length !== sourceMembers.length) throw new Error("Not all workbook members were materialized");
    const memberByPhone = new Map(allRows.map((row) => [row.phone_number, row]));

    const [roleAssignments] = await database.execute<ResultSetHeader>(`
      INSERT IGNORE INTO platform_member_role (member_id, role_id, member_status, created_at)
      VALUES ${sourceMembers.map(() => "(?, ?, 1, ?)").join(", ")}
    `, sourceMembers.flatMap((member) => [String(requiredMapValue(memberByPhone, member.phoneNumber).id), role.id, timestamp]));

    const [teamAssignments] = await database.execute<ResultSetHeader>(`
      INSERT IGNORE INTO site_exploration_team_member
        (team_id, platform_member_id, created_by_member_id, created_at)
      VALUES ${sourceMembers.map(() => "(?, ?, ?, ?)").join(", ")}
    `, sourceMembers.flatMap((member) => [
      requiredMapValue(teamIdByName, member.teamName),
      String(requiredMapValue(memberByPhone, member.phoneNumber).id),
      actor.id,
      timestamp,
    ]));

    await database.execute(
      `UPDATE platform_role
       SET member_count = (SELECT COUNT(*) FROM platform_member_role WHERE role_id = ?), updated_at = ?
       WHERE id = ?`,
      [role.id, timestamp, role.id],
    );

    if (missing.length) {
      await database.execute(`
        INSERT INTO platform_authorization_audit_event
          (event_id, actor_auth_user_id, action, target_type, target_id, result, metadata_json, request_id, occurred_at, created_at, updated_at)
        VALUES ${missing.map(() => "(?, ?, 'member.create', 'member', ?, 'success', ?, ?, ?, ?, ?)").join(", ")}
      `, missing.flatMap((member) => {
        const target = requiredMapValue(memberByPhone, member.phoneNumber);
        return [
          randomUUID(), actor.authUserId, String(target.id),
          JSON.stringify({ source: "organization_workbook_import", team: member.teamName, responsibility: member.responsibility }),
          requestId, timestamp, timestamp, timestamp,
        ];
      }));
    }

    await database.commit();
    return {
      createdMembers: missing.length,
      reusedMembers: sourceMembers.length - missing.length,
      addedRoleAssignments: roleAssignments.affectedRows,
      addedTeamAssignments: teamAssignments.affectedRows,
      role: { id: role.id, name: "勘探人员", created: role.created },
      groups: teamNames,
    };
  } catch (error) {
    await database.rollback();
    throw error;
  }
}

async function ensureExplorationRole(
  database: Awaited<ReturnType<typeof mysql.createConnection>>,
  actorAuthUserId: string,
  requestId: string,
  timestamp: number,
): Promise<{ id: string; created: boolean }> {
  const [rows] = await database.query<(RowDataPacket & { id: string })[]>(
    "SELECT CAST(id AS CHAR) AS id FROM platform_role FORCE INDEX (uk_platform_role_display_name) WHERE display_name = ? LIMIT 1 FOR UPDATE",
    ["勘探人员"],
  );
  let id = rows[0]?.id;
  let created = false;
  if (!id) {
    const [insert] = await database.execute<ResultSetHeader>(`
      INSERT INTO platform_role
        (system_key, display_name, description, built_in, member_count, created_at, updated_at)
      VALUES (NULL, '勘探人员', '负责勘探站点填报与智能选址协作', 0, 0, ?, ?)
    `, [timestamp, timestamp]);
    id = String(insert.insertId);
    created = true;
  }
  await database.execute(
    "INSERT IGNORE INTO platform_role_permission (role_id, permission_code, created_at) VALUES (?, 'agents.site-selection.use', ?)",
    [id, timestamp],
  );
  if (created) {
    await database.execute(`
      INSERT INTO platform_authorization_audit_event
        (event_id, actor_auth_user_id, action, target_type, target_id, result, metadata_json, request_id, occurred_at, created_at, updated_at)
      VALUES (?, ?, 'role.create', 'role', ?, 'success', ?, ?, ?, ?, ?)
    `, [randomUUID(), actorAuthUserId, id, JSON.stringify({ source: "organization_workbook_import" }), requestId, timestamp, timestamp, timestamp]);
  }
  return { id, created };
}

function parseWorkbookRows(value: unknown): SourceMember[] {
  if (!Array.isArray(value) || value.length < 2 || !value.every(Array.isArray)) throw new Error("Workbook data must be a non-empty row matrix");
  const [header, ...rows] = value as unknown[][];
  if (JSON.stringify(header) !== JSON.stringify(["所在小组", "角色", "姓名", "手机号"])) throw new Error("Workbook header does not match the expected organization structure");
  let currentTeam = "";
  const members = rows.map((row, index): SourceMember => {
    if (row.length !== 4) throw new Error(`Workbook row ${index + 2} must contain exactly four cells`);
    if (typeof row[0] === "string" && row[0].trim()) currentTeam = row[0].trim().replace(/^项目/, "");
    const responsibility = row[1];
    const realName = normalizeName(row[2]);
    const rawPhone = String(row[3] ?? "").trim();
    if (!currentTeam || (responsibility !== "责任人" && responsibility !== "组员") || !realName || !/^1[3-9]\d{9}$/.test(rawPhone)) {
      throw new Error(`Workbook row ${index + 2} contains invalid organization data`);
    }
    return { teamName: currentTeam, responsibility, realName, phoneNumber: `+86${rawPhone}` };
  });
  if (new Set(members.map((member) => member.phoneNumber)).size !== members.length) throw new Error("Workbook contains duplicate phone numbers");
  return members;
}

function assertTeams(expectedNames: readonly string[], rows: readonly TeamRow[]): void {
  const byName = new Map(rows.map((row) => [row.name, row]));
  for (const name of expectedNames) {
    const row = byName.get(name);
    if (!row) throw new Error(`Exploration team does not exist: ${name}`);
    if (Number(row.status) !== 1) throw new Error(`Exploration team is disabled: ${name}`);
  }
}

function normalizeName(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, "").trim() : "";
}

function placeholders(count: number): string {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error("Cannot build an empty SQL placeholder list");
  return Array.from({ length: count }, () => "?").join(", ");
}

function requiredMapValue<K, V>(map: ReadonlyMap<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Missing mapped value for ${String(key)}`);
  return value;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
