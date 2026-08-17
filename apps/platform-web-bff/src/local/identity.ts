import type { Pool, RowDataPacket } from "mysql2/promise";
import { allPermissionCodes } from "./constants";
import { queryOne, queryRows, nowSeconds } from "./database";
import { errorResponse, isRecord, jsonResponse, readJsonBody } from "./respond";

interface MemberRow extends RowDataPacket {
  id: string;
  auth_user_id: string;
  real_name: string;
  phone_number: string;
  email: string | null;
  status: number;
  protected_member: number;
}

interface RoleRow extends RowDataPacket {
  id: string;
  display_name: string;
}

interface PermissionRow extends RowDataPacket {
  permission_code: string;
}

async function ensureDevelopmentMember(pool: Pool): Promise<MemberRow | null> {
  const existing = await queryOne<MemberRow>(
    pool,
    "SELECT id, auth_user_id, real_name, phone_number, email, status, protected_member FROM platform_member WHERE id = 1 LIMIT 1",
  );
  if (existing) return existing;

  const now = nowSeconds();
  await pool.query(
    `INSERT INTO platform_member
       (id, auth_user_id, real_name, phone_number, email, status, protected_member, credentials_valid_after, created_at, updated_at)
     VALUES (1, 'local-dev-admin', '开发管理员', '13800000000', NULL, 1, 1, 0, ?, ?)
     ON DUPLICATE KEY UPDATE updated_at = VALUES(updated_at)`,
    [now, now],
  );
  await pool.query(
    `INSERT IGNORE INTO platform_member_role (member_id, role_id, member_status, created_at)
     SELECT 1, id, 1, ? FROM platform_role WHERE system_key = 'platform-super-admin' LIMIT 1`,
    [now],
  );
  return queryOne<MemberRow>(
    pool,
    "SELECT id, auth_user_id, real_name, phone_number, email, status, protected_member FROM platform_member WHERE id = 1 LIMIT 1",
  );
}

export async function handlePlatformIdentity(pool: Pool): Promise<Response> {
  const member = await ensureDevelopmentMember(pool);
  if (!member) {
    return jsonResponse({
      authUserId: "1",
      authDomain: "platform",
      clientId: "platform-web-bff",
      scopes: ["platform"],
      member: {
        id: "1",
        code: "PU000001",
        realName: "开发管理员",
        phoneNumber: "13800000000",
        email: null,
        protected: true,
      },
      roles: [{ id: "1", code: "R000001", displayName: "开发管理员" }],
      permissions: allPermissionCodes,
    });
  }

  const roles = await queryRows<RoleRow>(
    pool,
    `SELECT r.id, r.display_name
       FROM platform_role r
       JOIN platform_member_role mr ON mr.role_id = r.id
      WHERE mr.member_id = ? AND mr.member_status = 1
      ORDER BY r.id ASC`,
    [member.id],
  );
  const permissions = await queryRows<PermissionRow>(
    pool,
    `SELECT DISTINCT rp.permission_code
       FROM platform_role_permission rp
       JOIN platform_member_role mr ON mr.role_id = rp.role_id
      WHERE mr.member_id = ? AND mr.member_status = 1`,
    [member.id],
  );

  return jsonResponse({
    authUserId: member.auth_user_id,
    authDomain: "platform",
    clientId: "platform-web-bff",
    scopes: ["platform"],
    member: {
      id: member.id,
      code: `PU${member.id.padStart(6, "0")}`,
      realName: member.real_name,
      phoneNumber: member.phone_number,
      email: member.email,
      protected: member.protected_member === 1,
    },
    roles: roles.map((role) => ({
      id: role.id,
      code: `R${role.id.padStart(6, "0")}`,
      displayName: role.display_name,
    })),
    permissions: permissions.length > 0
      ? permissions.map((permission) => permission.permission_code)
      : allPermissionCodes,
  });
}

export async function updatePlatformIdentity(pool: Pool, request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!isRecord(body) || typeof body.realName !== "string") return errorResponse("invalid_request");
  const realName = body.realName.trim();
  if (realName.length === 0 || realName.length > 64) return errorResponse("invalid_request");

  const member = await ensureDevelopmentMember(pool);
  if (!member) return errorResponse("forbidden", 403);

  const now = nowSeconds();
  await pool.query("UPDATE platform_member SET real_name = ?, updated_at = ? WHERE id = ?", [realName, now, member.id]);
  return jsonResponse({ id: member.id, realName });
}
