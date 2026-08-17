import { describe, expect, test } from "bun:test";
import { seedPlatformOwnerRbac } from "./platform-owner-rbac-bootstrap";

describe("Platform owner RBAC BIGINT safety", () => {
  test("uses the exact decimal LAST_INSERT_ID above Number.MAX_SAFE_INTEGER", async () => {
    const hugeId = "9007199254740993";
    const assignmentParams: unknown[][] = [];
    let selectedLastId = false;
    const connection = {
      execute: async (sql: string, params: unknown[] = []) => {
        if (sql.includes("FROM auth_platform_owner")) return [[{ id: "auth-user", name: "Owner", email: "owner@example.invalid", phone_number: "+8613800138000", role: "platform-owner" }], undefined];
        if (sql.includes("uk_platform_role_system_key")) return [[{ id: "7", system_key: "platform-super-admin", display_name: "平台超级管理员", built_in: 1 }], undefined];
        if (sql.includes("uk_platform_member_auth_user") || sql.includes("uk_platform_member_phone")) return [[], undefined];
        if (sql.startsWith("INSERT INTO platform_member\n")) return [{ insertId: Number(hugeId) }, undefined];
        if (sql.includes("CAST(LAST_INSERT_ID() AS CHAR)")) { selectedLastId = true; return [[{ id: hugeId }], undefined]; }
        if (sql.startsWith("SELECT member_status")) return [[], undefined];
        if (sql.startsWith("INSERT INTO platform_member_role")) { assignmentParams.push(params); return [{ affectedRows: 1 }, undefined]; }
        if (sql.startsWith("UPDATE platform_role")) return [{ affectedRows: 1 }, undefined];
        throw new Error(`unexpected SQL: ${sql}`);
      },
    };
    await seedPlatformOwnerRbac({ connection, userId: "auth-user", phoneNumber: "+8613800138000", timestamp: 1_800_000_000 } as never);
    expect(selectedLastId).toBe(true);
    expect(assignmentParams[0]?.[0]).toBe(hugeId);
    expect(assignmentParams[0]?.[1]).toBe("7");
  });
});
