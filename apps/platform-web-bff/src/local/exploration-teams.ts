import type { Pool, RowDataPacket } from "mysql2/promise";
import { queryOne, queryRows, nowSeconds } from "./database";
import { errorResponse, isRecord, jsonResponse, notFound, readJsonBody, validId } from "./respond";

interface TeamRow extends RowDataPacket {
  id: string;
  name: string;
  description: string;
  status: number;
  created_by_member_id: string;
  updated_by_member_id: string;
  created_at: number;
  updated_at: number;
  member_count: string;
}

interface MemberRelationRow extends RowDataPacket {
  id: string;
  platform_member_id: string;
  real_name: string;
  member_status: number;
  created_by_member_id: string;
  created_at: number;
}

const teamStatusOf = (value: number): "active" | "disabled" => (value === 2 ? "disabled" : "active");

async function teamWithCount(pool: Pool, teamId: string): Promise<TeamRow | null> {
  const rows = await queryRows<TeamRow>(
    pool,
    `SELECT t.id, t.name, t.description, t.status, t.created_by_member_id, t.updated_by_member_id, t.created_at, t.updated_at,
            COUNT(tm.id) AS member_count
       FROM site_exploration_team t
       LEFT JOIN site_exploration_team_member tm ON tm.team_id = t.id
      WHERE t.id = ?
      GROUP BY t.id, t.name, t.description, t.status, t.created_by_member_id, t.updated_by_member_id, t.created_at, t.updated_at`,
    [teamId],
  );
  return rows[0] ?? null;
}

function teamPayload(row: TeamRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: teamStatusOf(Number(row.status)),
    memberCount: Number(row.member_count),
    createdByMemberId: row.created_by_member_id === "0" ? "1" : row.created_by_member_id,
    updatedByMemberId: row.updated_by_member_id === "0" ? "1" : row.updated_by_member_id,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export async function handleExplorationTeams(pool: Pool, request: Request, suffix: string): Promise<Response> {
  const teamList = /^\/?$/u.exec(suffix);
  if (teamList && request.method === "GET") return listTeams(pool, request);
  if (teamList && request.method === "POST") return createTeam(pool, request);

  const candidates = /^\/member-candidates$/u.exec(suffix);
  if (candidates && request.method === "GET") return listMemberCandidates(pool, request);

  const teamItem = /^\/(\d+)$/u.exec(suffix);
  if (teamItem) {
    const teamId = teamItem[1]!;
    if (request.method === "GET") return getTeam(pool, teamId);
    if (request.method === "PATCH") return updateTeam(pool, teamId, request);
  }

  const teamStatus = /^\/(\d+)\/status$/u.exec(suffix);
  if (teamStatus && request.method === "POST") return setTeamStatus(pool, teamStatus[1]!, request);

  const members = /^\/(\d+)\/members\/?$/u.exec(suffix);
  if (members && request.method === "GET") return listMembers(pool, members[1]!, request);
  if (members && request.method === "POST") return addMember(pool, members[1]!, request);

  const memberItem = /^\/(\d+)\/members\/(\d+)$/u.exec(suffix);
  if (memberItem && request.method === "DELETE") return removeMember(pool, memberItem[1]!, memberItem[2]!);

  return notFound();
}

async function listTeams(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 100);
  const cursor = url.searchParams.get("cursor");
  const status = url.searchParams.get("status");
  const namePrefix = url.searchParams.get("namePrefix");

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (cursor && validId(cursor)) {
    conditions.push("t.id > ?");
    params.push(cursor);
  }
  if (status === "active") conditions.push("t.status = 1");
  if (status === "disabled") conditions.push("t.status = 2");
  if (namePrefix) {
    conditions.push("t.name LIKE ?");
    params.push(`${namePrefix}%`);
  }
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";

  const rows = await queryRows<TeamRow>(
    pool,
    `SELECT t.id, t.name, t.description, t.status, t.created_by_member_id, t.updated_by_member_id, t.created_at, t.updated_at,
            COUNT(tm.id) AS member_count
       FROM site_exploration_team t
       LEFT JOIN site_exploration_team_member tm ON tm.team_id = t.id
      ${where}
      GROUP BY t.id, t.name, t.description, t.status, t.created_by_member_id, t.updated_by_member_id, t.created_at, t.updated_at
      ORDER BY t.id ASC LIMIT ?`,
    [...params, limit + 1],
  );
  const page = rows.slice(0, limit);
  return jsonResponse({
    items: page.map(teamPayload),
    nextCursor: rows.length > limit ? rows[limit]!.id : null,
  });
}

function readTeamInput(body: unknown): { name: string; description: string } | null {
  if (!isRecord(body) || typeof body.name !== "string" || typeof body.description !== "string") return null;
  const name = body.name.trim();
  if (name === "" || name.length > 64 || body.description.length > 500) return null;
  return { name, description: body.description };
}

async function createTeam(pool: Pool, request: Request): Promise<Response> {
  const input = readTeamInput(await readJsonBody(request));
  if (!input) return errorResponse("invalid_request");
  try {
    const now = nowSeconds();
    const result = await pool.query(
      "INSERT INTO site_exploration_team (name, description, status, created_by_member_id, updated_by_member_id, created_at, updated_at) VALUES (?, ?, 1, 1, 1, ?, ?)",
      [input.name, input.description, now, now],
    );
    const row = await teamWithCount(pool, String((result[0] as { insertId: number }).insertId));
    if (!row) return notFound();
    return jsonResponse(teamPayload(row), 201);
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return errorResponse("exploration_team_name_exists", 409);
    }
    throw error;
  }
}

async function getTeam(pool: Pool, teamId: string): Promise<Response> {
  const row = await teamWithCount(pool, teamId);
  if (!row) return errorResponse("exploration_team_not_found", 404);
  return jsonResponse(teamPayload(row));
}

async function updateTeam(pool: Pool, teamId: string, request: Request): Promise<Response> {
  const existing = await teamWithCount(pool, teamId);
  if (!existing) return errorResponse("exploration_team_not_found", 404);

  const body = await readJsonBody(request);
  if (!isRecord(body) || typeof body.expectedUpdatedAt !== "number" || !isRecord(body.team)) {
    return errorResponse("invalid_request");
  }
  if (body.expectedUpdatedAt !== Number(existing.updated_at)) {
    return errorResponse("exploration_team_conflict", 409);
  }
  const input = readTeamInput(body.team);
  if (!input) return errorResponse("invalid_request");
  try {
    const now = nowSeconds();
    await pool.query(
      "UPDATE site_exploration_team SET name = ?, description = ?, updated_by_member_id = 1, updated_at = ? WHERE id = ?",
      [input.name, input.description, now, teamId],
    );
    const row = await teamWithCount(pool, teamId);
    if (!row) return notFound();
    return jsonResponse(teamPayload(row));
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return errorResponse("exploration_team_name_exists", 409);
    }
    throw error;
  }
}

async function setTeamStatus(pool: Pool, teamId: string, request: Request): Promise<Response> {
  const existing = await teamWithCount(pool, teamId);
  if (!existing) return errorResponse("exploration_team_not_found", 404);

  const body = await readJsonBody(request);
  if (!isRecord(body) || typeof body.expectedUpdatedAt !== "number"
    || (body.status !== "active" && body.status !== "disabled")) {
    return errorResponse("invalid_request");
  }
  if (body.expectedUpdatedAt !== Number(existing.updated_at)) {
    return errorResponse("exploration_team_conflict", 409);
  }
  const now = nowSeconds();
  await pool.query(
    "UPDATE site_exploration_team SET status = ?, updated_by_member_id = 1, updated_at = ? WHERE id = ?",
    [body.status === "active" ? 1 : 2, now, teamId],
  );
  const row = await teamWithCount(pool, teamId);
  if (!row) return notFound();
  return jsonResponse(teamPayload(row));
}

function memberPayload(row: MemberRelationRow): Record<string, unknown> {
  return {
    id: row.id,
    platformMemberId: row.platform_member_id,
    code: row.platform_member_id,
    realName: row.real_name,
    status: teamStatusOf(Number(row.member_status)),
    createdByMemberId: row.created_by_member_id === "0" ? "1" : row.created_by_member_id,
    createdAt: Number(row.created_at),
  };
}

async function listMembers(pool: Pool, teamId: string, request: Request): Promise<Response> {
  const team = await queryOne<RowDataPacket>(pool, "SELECT id FROM site_exploration_team WHERE id = ?", [teamId]);
  if (!team) return errorResponse("exploration_team_not_found", 404);

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 100);
  const cursor = url.searchParams.get("cursor");

  const conditions = ["tm.team_id = ?"];
  const params: unknown[] = [teamId];
  if (cursor && validId(cursor)) {
    conditions.push("tm.id > ?");
    params.push(cursor);
  }
  const rows = await queryRows<MemberRelationRow>(
    pool,
    `SELECT tm.id, tm.platform_member_id, m.real_name, m.status AS member_status, tm.created_by_member_id, tm.created_at
       FROM site_exploration_team_member tm
       JOIN platform_member m ON m.id = tm.platform_member_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY tm.id ASC LIMIT ?`,
    [...params, limit + 1],
  );
  return jsonResponse({
    items: rows.slice(0, limit).map(memberPayload),
    nextCursor: rows.length > limit ? rows[limit]!.id : null,
  });
}

async function addMember(pool: Pool, teamId: string, request: Request): Promise<Response> {
  const team = await queryOne<TeamRow>(pool, "SELECT id, status FROM site_exploration_team WHERE id = ?", [teamId]);
  if (!team) return errorResponse("exploration_team_not_found", 404);
  if (Number(team.status) === 2) return errorResponse("exploration_team_disabled", 409);

  const body = await readJsonBody(request);
  if (!isRecord(body) || !validId(body.platformMemberId)) return errorResponse("invalid_request");
  const platformMemberId = body.platformMemberId;

  const member = await queryOne<RowDataPacket>(
    pool,
    "SELECT id, status FROM platform_member WHERE id = ?",
    [platformMemberId],
  );
  if (!member || Number(member.status) !== 1) return errorResponse("exploration_team_member_unavailable", 409);

  try {
    const now = nowSeconds();
    const result = await pool.query(
      "INSERT INTO site_exploration_team_member (team_id, platform_member_id, created_by_member_id, created_at) VALUES (?, ?, 1, ?)",
      [teamId, platformMemberId, now],
    );
    const row = await queryOne<MemberRelationRow>(
      pool,
      `SELECT tm.id, tm.platform_member_id, m.real_name, m.status AS member_status, tm.created_by_member_id, tm.created_at
         FROM site_exploration_team_member tm
         JOIN platform_member m ON m.id = tm.platform_member_id
        WHERE tm.id = ?`,
      [String((result[0] as { insertId: number }).insertId)],
    );
    if (!row) return notFound();
    return jsonResponse(memberPayload(row), 201);
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return errorResponse("exploration_team_member_exists", 409);
    }
    throw error;
  }
}

async function removeMember(pool: Pool, teamId: string, platformMemberId: string): Promise<Response> {
  const result = await pool.query(
    "DELETE FROM site_exploration_team_member WHERE team_id = ? AND platform_member_id = ?",
    [teamId, platformMemberId],
  );
  if ((result[0] as { affectedRows: number }).affectedRows === 0) return notFound();
  return new Response(null, { status: 204 });
}

async function listMemberCandidates(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 100);
  const teamId = url.searchParams.get("teamId");
  const cursor = url.searchParams.get("cursor") ?? url.searchParams.get("memberId");
  const namePrefix = url.searchParams.get("namePrefix");

  const conditions = ["m.status = 1"];
  const params: unknown[] = [];
  if (teamId && validId(teamId)) {
    conditions.push("NOT EXISTS (SELECT 1 FROM site_exploration_team_member tm WHERE tm.team_id = ? AND tm.platform_member_id = m.id)");
    params.push(teamId);
  }
  if (cursor && validId(cursor)) {
    conditions.push("m.id > ?");
    params.push(cursor);
  }
  if (namePrefix) {
    conditions.push("m.real_name LIKE ?");
    params.push(`${namePrefix}%`);
  }
  const rows = await queryRows<RowDataPacket>(
    pool,
    `SELECT m.id AS platform_member_id, m.real_name, m.status
       FROM platform_member m
      WHERE ${conditions.join(" AND ")}
      ORDER BY m.id ASC LIMIT ?`,
    [...params, limit + 1],
  );
  const page = rows.slice(0, limit);
  return jsonResponse({
    items: page.map((row) => ({
      platformMemberId: String(row.platform_member_id),
      code: String(row.platform_member_id),
      realName: String(row.real_name),
      status: "active",
    })),
    nextCursor: rows.length > limit ? String(rows[limit]!.platform_member_id) : null,
  });
}
