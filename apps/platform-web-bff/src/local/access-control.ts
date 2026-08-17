import type { Pool, RowDataPacket } from "mysql2/promise";
import { permissionCatalog, allPermissionCodes } from "./constants";
import { queryOne, queryRows, nowSeconds } from "./database";
import { errorResponse, isRecord, jsonResponse, notFound, readJsonBody, validId } from "./respond";

interface RoleRow extends RowDataPacket {
  id: string;
  system_key: string | null;
  display_name: string;
  description: string;
  built_in: number;
  member_count: string;
  created_at: number;
  updated_at: number;
}

interface MemberRow extends RowDataPacket {
  id: string;
  real_name: string;
  phone_number: string;
  email: string | null;
  status: number;
  protected_member: number;
  created_at: number;
  updated_at: number;
}

const roleCode = (id: string): string => `R${id.padStart(6, "0")}`;
const memberCode = (id: string): string => `PU${id.padStart(6, "0")}`;

export async function handleAccessControl(pool: Pool, request: Request, suffix: string): Promise<Response> {
  if (request.method === "GET" && suffix === "/permissions") {
    return jsonResponse({ groups: permissionCatalog });
  }

  const roleList = /^\/roles\/?$/u.exec(suffix);
  if (roleList && request.method === "GET") return listRoles(pool, request);
  if (roleList && request.method === "POST") return createRole(pool, request);

  const roleItem = /^\/roles\/(\d+)$/u.exec(suffix);
  if (roleItem) {
    const id = roleItem[1]!;
    if (request.method === "PATCH") return updateRole(pool, id, request);
    if (request.method === "DELETE") return deleteRole(pool, id);
  }

  const memberList = /^\/members\/?$/u.exec(suffix);
  if (memberList && request.method === "GET") return listMembers(pool, request);
  if (memberList && request.method === "POST") return createMember(pool, request);

  const memberItem = /^\/members\/(\d+)$/u.exec(suffix);
  if (memberItem && request.method === "PATCH") return updateMember(pool, memberItem[1]!, request);
  const memberStatus = /^\/members\/(\d+)\/status$/u.exec(suffix);
  if (memberStatus && request.method === "POST") return updateMemberStatus(pool, memberStatus[1]!, request);

  return notFound();
}

async function rolePermissions(pool: Pool, roleId: string): Promise<string[]> {
  const rows = await queryRows<RowDataPacket>(
    pool,
    "SELECT permission_code FROM platform_role_permission WHERE role_id = ? ORDER BY permission_code ASC",
    [roleId],
  );
  return rows.map((row) => String(row.permission_code));
}

function rolePayload(row: RoleRow, permissions: string[]): Record<string, unknown> {
  const builtIn = Number(row.built_in) === 1;
  return {
    id: row.id,
    code: roleCode(row.id),
    systemKey: builtIn ? String(row.system_key ?? "") : null,
    displayName: row.display_name,
    description: row.description,
    builtIn,
    permissions,
    memberCount: Number(row.member_count),
  };
}

async function listRoles(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 100);
  const cursor = url.searchParams.get("cursor");
  const code = url.searchParams.get("code");
  const displayName = url.searchParams.get("displayName");

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (cursor && validId(cursor)) {
    conditions.push("r.id > ?");
    params.push(cursor);
  }
  if (code) {
    conditions.push("LPAD(r.id, 6, '0') = ?");
    params.push(code.replace(/^R/u, ""));
  }
  if (displayName) {
    conditions.push("r.display_name LIKE ?");
    params.push(`${displayName}%`);
  }
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  const rows = await queryRows<RoleRow>(
    pool,
    `SELECT r.id, r.system_key, r.display_name, r.description, r.built_in, r.member_count
       FROM platform_role r${where} ORDER BY r.id ASC LIMIT ?`,
    [...params, limit + 1],
  );
  const page = rows.slice(0, limit);
  const items = [];
  for (const row of page) {
    items.push(rolePayload(row, await rolePermissions(pool, row.id)));
  }
  return jsonResponse({
    items,
    nextCursor: rows.length > limit ? rows[limit]!.id : null,
  });
}

async function readRoleInput(body: unknown): Promise<{ displayName: string; description: string; permissions: string[] } | null> {
  if (!isRecord(body)) return null;
  const displayName = body.displayName;
  const description = body.description;
  const permissions = body.permissions;
  if (
    typeof displayName !== "string" || displayName.trim() === "" || displayName.length > 64
    || typeof description !== "string" || description.length > 255
    || !Array.isArray(permissions) || permissions.length === 0
    || permissions.length > allPermissionCodes.length
    || new Set(permissions).size !== permissions.length
    || !permissions.every((permission) => typeof permission === "string" && allPermissionCodes.includes(permission))
  ) return null;
  return { displayName: displayName.trim(), description, permissions: permissions as string[] };
}

async function createRole(pool: Pool, request: Request): Promise<Response> {
  const input = await readRoleInput(await readJsonBody(request));
  if (!input) return errorResponse("invalid_request");
  try {
    const now = nowSeconds();
    const result = await pool.query(
      "INSERT INTO platform_role (system_key, display_name, description, built_in, member_count, created_at, updated_at) VALUES (NULL, ?, ?, 0, 0, ?, ?)",
      [input.displayName, input.description, now, now],
    );
    const insertId = String((result[0] as { insertId: number }).insertId);
    await replaceRolePermissions(pool, insertId, input.permissions, now);
    const row = await queryOne<RoleRow>(
      pool,
      "SELECT id, system_key, display_name, description, built_in, member_count FROM platform_role WHERE id = ?",
      [insertId],
    );
    if (!row) return errorResponse("role_not_found", 404);
    return jsonResponse(rolePayload(row, input.permissions), 201);
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return errorResponse("role_display_name_conflict", 409);
    }
    throw error;
  }
}

async function updateRole(pool: Pool, id: string, request: Request): Promise<Response> {
  const existing = await queryOne<RoleRow>(
    pool,
    "SELECT id, system_key, display_name, description, built_in, member_count FROM platform_role WHERE id = ?",
    [id],
  );
  if (!existing) return errorResponse("role_not_found", 404);
  if (Number(existing.built_in) === 1) return errorResponse("role_protected", 409);

  const input = await readRoleInput(await readJsonBody(request));
  if (!input) return errorResponse("invalid_request");
  try {
    const now = nowSeconds();
    await pool.query(
      "UPDATE platform_role SET display_name = ?, description = ?, updated_at = ? WHERE id = ?",
      [input.displayName, input.description, now, id],
    );
    await replaceRolePermissions(pool, id, input.permissions, now);
    const row = await queryOne<RoleRow>(
      pool,
      "SELECT id, system_key, display_name, description, built_in, member_count FROM platform_role WHERE id = ?",
      [id],
    );
    if (!row) return errorResponse("role_not_found", 404);
    return jsonResponse(rolePayload(row, input.permissions));
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return errorResponse("role_display_name_conflict", 409);
    }
    throw error;
  }
}

async function deleteRole(pool: Pool, id: string): Promise<Response> {
  const existing = await queryOne<RoleRow>(
    pool,
    "SELECT id, system_key, built_in, member_count FROM platform_role WHERE id = ?",
    [id],
  );
  if (!existing) return errorResponse("role_not_found", 404);
  if (Number(existing.built_in) === 1) return errorResponse("role_protected", 409);
  if (Number(existing.member_count) > 0) return errorResponse("role_in_use", 409);
  await pool.query("DELETE FROM platform_role WHERE id = ?", [id]);
  return new Response(null, { status: 204 });
}

async function replaceRolePermissions(pool: Pool, roleId: string, permissions: string[], now: number): Promise<void> {
  await pool.query("DELETE FROM platform_role_permission WHERE role_id = ?", [roleId]);
  if (permissions.length === 0) return;
  const values = permissions.map((permission) => [roleId, permission, now]);
  await pool.query(
    "INSERT INTO platform_role_permission (role_id, permission_code, created_at) VALUES ?",
    [values],
  );
}

async function memberRoles(pool: Pool, memberId: string): Promise<{ id: string; code: string; displayName: string }[]> {
  const rows = await queryRows<RoleRow>(
    pool,
    `SELECT r.id, r.display_name
       FROM platform_role r
       JOIN platform_member_role mr ON mr.role_id = r.id
      WHERE mr.member_id = ? AND mr.member_status = 1
      ORDER BY r.id ASC`,
    [memberId],
  );
  return rows.map((row) => ({ id: row.id, code: roleCode(row.id), displayName: row.display_name }));
}

async function memberPayload(pool: Pool, row: MemberRow): Promise<Record<string, unknown>> {
  const roles = await memberRoles(pool, row.id);
  return {
    id: row.id,
    code: memberCode(row.id),
    realName: row.real_name,
    phoneNumber: row.phone_number,
    email: row.email,
    roleIds: roles.map((role) => role.id),
    roles,
    status: Number(row.status) === 1 ? "active" : "disabled",
    protected: Number(row.protected_member) === 1,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

async function listMembers(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 100);
  const cursor = url.searchParams.get("cursor");
  const status = url.searchParams.get("status");
  const roleId = url.searchParams.get("roleId");
  const searchField = url.searchParams.get("searchField");
  const searchValue = url.searchParams.get("searchValue");

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (cursor && validId(cursor)) {
    conditions.push("m.id > ?");
    params.push(cursor);
  }
  if (status === "active") conditions.push("m.status = 1");
  if (status === "disabled") conditions.push("m.status = 0");
  if (roleId && validId(roleId)) {
    conditions.push("EXISTS (SELECT 1 FROM platform_member_role mr WHERE mr.member_id = m.id AND mr.role_id = ? AND mr.member_status = 1)");
    params.push(roleId);
  }
  if (searchValue) {
    if (searchField === "code") {
      conditions.push("m.id LIKE CONCAT(?, '%')");
      params.push(String(searchValue).replace(/^PU/u, ""));
    } else if (searchField === "realName") {
      conditions.push("m.real_name LIKE ?");
      params.push(`%${searchValue}%`);
    } else if (searchField === "phone") {
      conditions.push("m.phone_number LIKE ?");
      params.push(`%${searchValue}%`);
    } else if (searchField === "email") {
      conditions.push("m.email LIKE ?");
      params.push(`%${searchValue}%`);
    }
  }
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  const rows = await queryRows<MemberRow>(
    pool,
    `SELECT m.id, m.real_name, m.phone_number, m.email, m.status, m.protected_member, m.created_at, m.updated_at
       FROM platform_member m${where} ORDER BY m.id ASC LIMIT ?`,
    [...params, limit + 1],
  );
  const page = rows.slice(0, limit);
  const items = [];
  for (const row of page) items.push(await memberPayload(pool, row));

  const counts = await queryOne<RowDataPacket>(
    pool,
    `SELECT
       SUM(status = 1) AS active,
       SUM(status = 0) AS disabled,
       COUNT(*) AS total
     FROM platform_member`,
  );
  return jsonResponse({
    items,
    nextCursor: rows.length > limit ? rows[limit]!.id : null,
    statusCounts: {
      active: Number(counts?.active ?? 0),
      disabled: Number(counts?.disabled ?? 0),
      all: Number(counts?.total ?? 0),
    },
  });
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/gu, "");
  const matched = /^(?:\+?86)?(1[3-9]\d{9})$/u.exec(normalized);
  return matched ? matched[1]! : null;
}

async function readMemberInput(body: unknown): Promise<{ realName: string; phoneNumber: string; roleIds: string[] } | null> {
  if (!isRecord(body)) return null;
  const { realName, phoneNumber, roleIds } = body;
  if (typeof realName !== "string" || realName.trim() === "" || realName.length > 64) return null;
  const phone = normalizePhone(phoneNumber);
  if (!phone) return null;
  if (!Array.isArray(roleIds) || roleIds.length < 1 || roleIds.length > 8
    || new Set(roleIds).size !== roleIds.length
    || !roleIds.every((roleId) => validId(roleId))) return null;
  return { realName: realName.trim(), phoneNumber: phone, roleIds: roleIds as string[] };
}

async function assertRolesExist(pool: Pool, roleIds: string[]): Promise<boolean> {
  const placeholders = roleIds.map(() => "?").join(",");
  const rows = await queryRows<RowDataPacket>(
    pool,
    `SELECT id FROM platform_role WHERE id IN (${placeholders})`,
    roleIds,
  );
  return rows.length === roleIds.length;
}

async function createMember(pool: Pool, request: Request): Promise<Response> {
  const input = await readMemberInput(await readJsonBody(request));
  if (!input) return errorResponse("invalid_request");
  if (!(await assertRolesExist(pool, input.roleIds))) return errorResponse("role_not_found", 404);

  try {
    const now = nowSeconds();
    const result = await pool.query(
      `INSERT INTO platform_member
         (auth_user_id, real_name, phone_number, email, status, protected_member, credentials_valid_after, created_at, updated_at)
       VALUES (?, ?, ?, NULL, 1, 0, 0, ?, ?)`,
      [`local-${now}-${input.phoneNumber}`, input.realName, input.phoneNumber, now, now],
    );
    const memberId = String((result[0] as { insertId: number }).insertId);
    await setMemberRoles(pool, memberId, input.roleIds, now);
    const row = await queryOne<MemberRow>(
      pool,
      "SELECT id, real_name, phone_number, email, status, protected_member, created_at, updated_at FROM platform_member WHERE id = ?",
      [memberId],
    );
    if (!row) return errorResponse("member_not_found", 404);
    return jsonResponse(await memberPayload(pool, row), 201);
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return errorResponse("member_conflict", 409);
    }
    throw error;
  }
}

async function updateMember(pool: Pool, id: string, request: Request): Promise<Response> {
  const existing = await queryOne<MemberRow>(
    pool,
    "SELECT id FROM platform_member WHERE id = ?",
    [id],
  );
  if (!existing) return errorResponse("member_not_found", 404);

  const body = await readJsonBody(request);
  if (!isRecord(body) || typeof body.realName !== "string" || body.realName.trim() === ""
    || body.realName.length > 64 || !Array.isArray(body.roleIds)
    || body.roleIds.length < 1 || body.roleIds.length > 8
    || new Set(body.roleIds).size !== body.roleIds.length
    || !body.roleIds.every((roleId) => validId(roleId))) {
    return errorResponse("invalid_request");
  }
  if (!(await assertRolesExist(pool, body.roleIds as string[]))) return errorResponse("role_not_found", 404);

  const now = nowSeconds();
  await pool.query(
    "UPDATE platform_member SET real_name = ?, updated_at = ? WHERE id = ?",
    [String(body.realName).trim(), now, id],
  );
  await setMemberRoles(pool, id, body.roleIds as string[], now);
  const row = await queryOne<MemberRow>(
    pool,
    "SELECT id, real_name, phone_number, email, status, protected_member, created_at, updated_at FROM platform_member WHERE id = ?",
    [id],
  );
  if (!row) return errorResponse("member_not_found", 404);
  return jsonResponse(await memberPayload(pool, row));
}

async function updateMemberStatus(pool: Pool, id: string, request: Request): Promise<Response> {
  const existing = await queryOne<MemberRow>(
    pool,
    "SELECT id, status, protected_member FROM platform_member WHERE id = ?",
    [id],
  );
  if (!existing) return errorResponse("member_not_found", 404);
  if (Number(existing.protected_member) === 1) return errorResponse("forbidden", 403);

  const body = await readJsonBody(request);
  if (!isRecord(body) || (body.status !== "active" && body.status !== "disabled")) {
    return errorResponse("invalid_request");
  }
  const now = nowSeconds();
  const dbStatus = body.status === "active" ? 1 : 0;
  await pool.query(
    "UPDATE platform_member SET status = ?, credentials_valid_after = ?, updated_at = ? WHERE id = ?",
    [dbStatus, dbStatus === 0 ? now + 1 : 0, now, id],
  );
  await pool.query(
    "UPDATE platform_member_role SET member_status = ? WHERE member_id = ?",
    [dbStatus, id],
  );
  await refreshRoleMemberCounts(pool);

  const row = await queryOne<MemberRow>(
    pool,
    "SELECT id, real_name, phone_number, email, status, protected_member, created_at, updated_at FROM platform_member WHERE id = ?",
    [id],
  );
  if (!row) return errorResponse("member_not_found", 404);
  return jsonResponse(await memberPayload(pool, row));
}

async function setMemberRoles(pool: Pool, memberId: string, roleIds: string[], now: number): Promise<void> {
  await pool.query("DELETE FROM platform_member_role WHERE member_id = ?", [memberId]);
  const values = roleIds.map((roleId) => [memberId, roleId, 1, now]);
  await pool.query(
    "INSERT INTO platform_member_role (member_id, role_id, member_status, created_at) VALUES ?",
    [values],
  );
  await refreshRoleMemberCounts(pool);
}

async function refreshRoleMemberCounts(pool: Pool): Promise<void> {
  await pool.query(
    `UPDATE platform_role r
       LEFT JOIN (SELECT role_id, COUNT(*) AS count_ FROM platform_member_role WHERE member_status = 1 GROUP BY role_id) t ON t.role_id = r.id
        SET r.member_count = COALESCE(t.count_, 0)`,
  );
}
