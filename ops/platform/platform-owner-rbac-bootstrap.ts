import type { RowDataPacket } from "mysql2/promise";
import type { OwnerCreatedTransactionContext } from "../../apps/auth-service/src/platform/owner-store";

interface OwnerRow extends RowDataPacket {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone_number: string | null;
  readonly role: string;
}

interface RoleRow extends RowDataPacket {
  readonly id: string;
  readonly system_key: string;
  readonly display_name: string;
  readonly built_in: number;
}

interface MemberRow extends RowDataPacket {
  readonly id: string;
  readonly auth_user_id: string;
  readonly real_name: string;
  readonly phone_number: string;
  readonly email: string;
  readonly status: number;
  readonly protected_member: number;
}

interface AssignmentRow extends RowDataPacket {
  readonly member_status: number;
}

export async function seedPlatformOwnerRbac(context: OwnerCreatedTransactionContext): Promise<void> {
  const { connection, userId, phoneNumber, timestamp } = context;
  const [owners] = await connection.execute<OwnerRow[]>(
    `SELECT user.id, user.name, user.email, user.phone_number, user.role
     FROM auth_platform_owner owner
     INNER JOIN auth_platform_user user ON user.id = owner.auth_user_id
     WHERE owner.singleton = 1 AND owner.auth_user_id = ?
     FOR UPDATE`,
    [userId],
  );
  const owner = owners[0];
  if (owners.length !== 1 || !owner || owner.id !== userId || owner.phone_number !== phoneNumber || owner.role !== "platform-owner") {
    throw new Error("platform owner identity is unavailable or inconsistent");
  }

  const [roles] = await connection.execute<RoleRow[]>(
    `SELECT CAST(id AS CHAR) AS id, system_key, display_name, built_in
     FROM platform_role FORCE INDEX (uk_platform_role_system_key)
     WHERE system_key = 'platform-super-admin' FOR UPDATE`,
  );
  const role = roles[0];
  if (roles.length !== 1 || !role || role.system_key !== "platform-super-admin" || role.display_name === "" || Number(role.built_in) !== 1) {
    throw new Error("platform super admin role is unavailable or inconsistent");
  }
  const roleId = canonicalUnsignedBigint(role.id);

  const [authMatches] = await connection.execute<MemberRow[]>(
    `SELECT CAST(id AS CHAR) AS id, auth_user_id, real_name, phone_number, email, status, protected_member
     FROM platform_member FORCE INDEX (uk_platform_member_auth_user)
     WHERE auth_user_id = ? FOR UPDATE`,
    [userId],
  );
  const [phoneMatches] = await connection.execute<MemberRow[]>(
    `SELECT CAST(id AS CHAR) AS id, auth_user_id, real_name, phone_number, email, status, protected_member
     FROM platform_member FORCE INDEX (uk_platform_member_phone)
     WHERE phone_number = ? FOR UPDATE`,
    [phoneNumber],
  );
  const authMatch = authMatches[0];
  const phoneMatch = phoneMatches[0];
  if ((authMatch && phoneMatch && authMatch.id !== phoneMatch.id) || (!authMatch && phoneMatch)) {
    throw new Error("platform owner member identity conflict");
  }

  let memberId: string;
  if (authMatch) {
    assertConsistentOwnerMember(authMatch, owner, phoneNumber);
    memberId = canonicalUnsignedBigint(authMatch.id);
  } else {
    await connection.execute(
      `INSERT INTO platform_member
       (auth_user_id, real_name, phone_number, email, status, protected_member, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 1, ?, ?)`,
      [userId, owner.name.slice(0, 64), phoneNumber, owner.email, timestamp, timestamp],
    );
    const [ids] = await connection.execute<Array<RowDataPacket & { id: string }>>("SELECT CAST(LAST_INSERT_ID() AS CHAR) AS id");
    memberId = canonicalUnsignedBigint(ids[0]?.id);
  }

  const [assignments] = await connection.execute<AssignmentRow[]>(
    "SELECT member_status FROM platform_member_role WHERE member_id = ? AND role_id = ? FOR UPDATE",
    [memberId, roleId],
  );
  const assignment = assignments[0];
  if (assignment) {
    if (assignments.length !== 1 || Number(assignment.member_status) !== 1) {
      throw new Error("platform owner role assignment is inconsistent");
    }
    return;
  }
  await connection.execute(
    "INSERT INTO platform_member_role (member_id, role_id, member_status, created_at) VALUES (?, ?, 1, ?)",
    [memberId, roleId, timestamp],
  );
  await connection.execute("UPDATE platform_role SET member_count = member_count + 1 WHERE id = ?", [roleId]);
}

function canonicalUnsignedBigint(value: unknown): string {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || value.length > 20 || BigInt(value) > 18_446_744_073_709_551_615n) {
    throw new Error("platform member id is not a canonical unsigned bigint");
  }
  return value;
}

function assertConsistentOwnerMember(member: MemberRow, owner: OwnerRow, phoneNumber: string): void {
  if (
    member.auth_user_id !== owner.id ||
    member.real_name !== owner.name.slice(0, 64) ||
    member.phone_number !== phoneNumber ||
    member.email !== owner.email ||
    Number(member.status) !== 1 ||
    Number(member.protected_member) !== 1
  ) {
    throw new Error("platform owner member identity conflict");
  }
}
