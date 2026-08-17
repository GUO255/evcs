import type { Connection, RowDataPacket } from "mysql2/promise";

export type FieldSurveyCollectorIdentity = {
  sourceSubmissionId: string;
  sourceSubmitterUserId: string;
  sourceSubmitterPhoneNumber: string;
};

export type FieldSurveyImportActor = {
  memberId: string;
  realName: string;
  teamId: string;
  teamName: string;
  explorerName: string;
  source: "platform-member" | "legacy-history" | "unresolved";
};

export type UnresolvedFieldSurveyCollector = {
  sourceSubmitterUserId: string;
  phoneSuffix: string;
  submissions: number;
  reason: "invalid_phone" | "member_not_found" | "member_disabled" | "active_team_assignment_not_unique";
};

export type FieldSurveyActorResolution = {
  actorsBySubmissionId: ReadonlyMap<string, FieldSurveyImportActor>;
  resolvedPlatformSubmissions: number;
  legacyHistorySubmissions: number;
  unresolved: UnresolvedFieldSurveyCollector[];
};

type PlatformAssignmentRow = RowDataPacket & {
  memberId: string;
  realName: string;
  phoneNumber: string;
  memberStatus: number;
  teamId: string | null;
  teamName: string | null;
};

export const FIELD_SURVEY_LEGACY_COLLECTOR = "问卷星历史";

export async function resolveFieldSurveyImportActors(
  connection: Connection,
  collectors: readonly FieldSurveyCollectorIdentity[],
): Promise<FieldSurveyActorResolution> {
  const collectorsByUser = groupCollectorsByUser(collectors);
  const normalizedPhones = new Set<string>();
  for (const grouped of collectorsByUser.values()) {
    const phone = grouped[0]!.sourceSubmitterPhoneNumber.trim();
    const normalized = normalizeChinesePlatformPhone(phone);
    if (normalized) normalizedPhones.add(normalized);
  }
  const assignments = normalizedPhones.size
    ? await loadPlatformAssignments(connection, [...normalizedPhones])
    : [];
  const assignmentsByPhone = groupBy(assignments, (row) => row.phoneNumber);
  const actorsBySubmissionId = new Map<string, FieldSurveyImportActor>();
  const unresolved: UnresolvedFieldSurveyCollector[] = [];
  let resolvedPlatformSubmissions = 0;
  let legacyHistorySubmissions = 0;

  for (const [sourceUserId, grouped] of collectorsByUser) {
    const rawPhones = new Set(grouped.map((collector) => collector.sourceSubmitterPhoneNumber.trim()));
    if (rawPhones.size !== 1) throw new Error(`Source collector ${sourceUserId} has inconsistent phone identities`);
    const rawPhone = [...rawPhones][0]!;
    if (rawPhone === FIELD_SURVEY_LEGACY_COLLECTOR) {
      const actor: FieldSurveyImportActor = {
        memberId: "0",
        realName: "",
        teamId: "0",
        teamName: "",
        explorerName: FIELD_SURVEY_LEGACY_COLLECTOR,
        source: "legacy-history",
      };
      for (const collector of grouped) actorsBySubmissionId.set(collector.sourceSubmissionId, actor);
      legacyHistorySubmissions += grouped.length;
      continue;
    }
    const phone = normalizeChinesePlatformPhone(rawPhone);
    if (!phone) {
      unresolved.push(unresolvedCollector(sourceUserId, rawPhone, grouped.length, "invalid_phone"));
      assignUnresolvedActors(actorsBySubmissionId, grouped, rawPhone);
      continue;
    }
    const rows = assignmentsByPhone.get(phone) ?? [];
    if (!rows.length) {
      unresolved.push(unresolvedCollector(sourceUserId, rawPhone, grouped.length, "member_not_found"));
      assignUnresolvedActors(actorsBySubmissionId, grouped, rawPhone);
      continue;
    }
    const member = rows[0]!;
    if (Number(member.memberStatus) !== 1) {
      unresolved.push(unresolvedCollector(sourceUserId, rawPhone, grouped.length, "member_disabled"));
      assignUnresolvedActors(actorsBySubmissionId, grouped, rawPhone);
      continue;
    }
    const activeTeams = rows.filter((row) => row.teamId && row.teamName);
    if (activeTeams.length !== 1) {
      unresolved.push(unresolvedCollector(sourceUserId, rawPhone, grouped.length, "active_team_assignment_not_unique"));
      assignUnresolvedActors(actorsBySubmissionId, grouped, rawPhone);
      continue;
    }
    const assignment = activeTeams[0]!;
    const actor: FieldSurveyImportActor = {
      memberId: String(member.memberId),
      realName: member.realName,
      teamId: String(assignment.teamId),
      teamName: assignment.teamName!,
      explorerName: member.realName,
      source: "platform-member",
    };
    for (const collector of grouped) actorsBySubmissionId.set(collector.sourceSubmissionId, actor);
    resolvedPlatformSubmissions += grouped.length;
  }

  return { actorsBySubmissionId, resolvedPlatformSubmissions, legacyHistorySubmissions, unresolved };
}

export function normalizeChinesePlatformPhone(value: string): string | null {
  const normalized = value.trim();
  if (/^1[3-9][0-9]{9}$/.test(normalized)) return `+86${normalized}`;
  if (/^\+861[3-9][0-9]{9}$/.test(normalized)) return normalized;
  return null;
}

function groupCollectorsByUser(collectors: readonly FieldSurveyCollectorIdentity[]): Map<string, FieldSurveyCollectorIdentity[]> {
  const grouped = new Map<string, FieldSurveyCollectorIdentity[]>();
  for (const collector of collectors) {
    if (!collector.sourceSubmissionId || !collector.sourceSubmitterUserId) throw new Error("Source submission collector identity is incomplete");
    const values = grouped.get(collector.sourceSubmitterUserId) ?? [];
    values.push(collector);
    grouped.set(collector.sourceSubmitterUserId, values);
  }
  return grouped;
}

async function loadPlatformAssignments(connection: Connection, phones: readonly string[]): Promise<PlatformAssignmentRow[]> {
  const [rows] = await connection.query<PlatformAssignmentRow[]>(`
    SELECT CAST(member.id AS CHAR) AS memberId, member.real_name AS realName,
      member.phone_number AS phoneNumber, member.status AS memberStatus,
      CAST(team.id AS CHAR) AS teamId, team.name AS teamName
    FROM platform_member member FORCE INDEX (uk_platform_member_phone)
    LEFT JOIN site_exploration_team_member membership
      ON membership.platform_member_id = member.id
    LEFT JOIN site_exploration_team team
      ON team.id = membership.team_id AND team.status = 1
    WHERE member.phone_number IN (${phones.map(() => "?").join(", ")})
    ORDER BY member.id, team.id
  `, phones);
  return rows;
}

function unresolvedCollector(
  sourceSubmitterUserId: string,
  phone: string,
  submissions: number,
  reason: UnresolvedFieldSurveyCollector["reason"],
): UnresolvedFieldSurveyCollector {
  return { sourceSubmitterUserId, phoneSuffix: phone.slice(-4), submissions, reason };
}

function assignUnresolvedActors(
  actorsBySubmissionId: Map<string, FieldSurveyImportActor>,
  collectors: readonly FieldSurveyCollectorIdentity[],
  phone: string,
): void {
  const suffix = normalizeChinesePlatformPhone(phone) ? phone.slice(-4) : "";
  const actor: FieldSurveyImportActor = {
    memberId: "0",
    realName: "",
    teamId: "0",
    teamName: "",
    explorerName: suffix ? `待关联采集人（尾号${suffix}）` : "待关联采集人",
    source: "unresolved",
  };
  for (const collector of collectors) actorsBySubmissionId.set(collector.sourceSubmissionId, actor);
}

function groupBy<T, K>(values: readonly T[], key: (value: T) => K): Map<K, T[]> {
  const grouped = new Map<K, T[]>();
  for (const value of values) {
    const bucket = grouped.get(key(value)) ?? [];
    bucket.push(value);
    grouped.set(key(value), bucket);
  }
  return grouped;
}
