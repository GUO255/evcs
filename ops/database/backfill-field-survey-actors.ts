import mysql, { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import {
  fieldSurveyIdentityKey,
  transformFieldSurveySubmission,
  type SourceAnswer,
  type SourceSubmission,
} from "./field-survey-import-transform";
import {
  resolveFieldSurveyImportActors,
} from "./field-survey-import-actor";

type SubmissionRow = RowDataPacket & Omit<SourceSubmission, "answers" | "attachments">;
type AnswerRow = RowDataPacket & SourceAnswer & { submissionId: string };
type SiteRow = RowDataPacket & {
  id: string;
  projectName: string;
  longitude: string | number;
  latitude: string | number;
};

const arguments_ = new Set(process.argv.slice(2));
const execute = arguments_.has("--execute");
const allowUnresolved = arguments_.has("--allow-unresolved");
if ([...arguments_].some((argument) => argument !== "--execute" && argument !== "--allow-unresolved")) {
  throw new Error("Unsupported backfill argument");
}
if (allowUnresolved && !execute) throw new Error("--allow-unresolved requires --execute");

const sourceUrl = requiredEnvironment("FIELD_SURVEY_SOURCE_MYSQL_URL");
const targetUrl = requiredEnvironment("SITE_SELECTION_V2_MYSQL_URL");
const sourceConnection = await mysql.createConnection(sourceUrl);
const targetConnection = await mysql.createConnection(targetUrl);

try {
  const [submissions] = await sourceConnection.query<SubmissionRow[]>(`
    SELECT CAST(s.id AS CHAR) AS id, s.questionnaire_version AS version, s.city,
      s.submitted_at AS submittedAt, s.updated_at AS updatedAt,
      COALESCE(CAST(s.submitted_by_user_id AS CHAR), '') AS submitterUserId,
      COALESCE(u.name, '') AS submitterName,
      COALESCE(u.phone_number, '') AS submitterPhoneNumber
    FROM questionnaire_submission s
    LEFT JOIN user u ON u.id = s.submitted_by_user_id
    WHERE s.questionnaire_code = 'field_survey' AND s.status = 2
    ORDER BY s.id
  `);
  const [answers] = await sourceConnection.query<AnswerRow[]>(`
    SELECT CAST(a.submission_id AS CHAR) AS submissionId, a.field_id AS fieldId,
      COALESCE(a.answer_value, '') AS answerValue,
      COALESCE(a.followup_value, '') AS followupValue,
      COALESCE(a.answer_json, '') AS answerJson
    FROM questionnaire_answer a
    INNER JOIN questionnaire_submission s ON s.id = a.submission_id
    WHERE s.questionnaire_code = 'field_survey' AND s.status = 2
    ORDER BY a.submission_id, a.id
  `);
  const [sites] = await targetConnection.query<SiteRow[]>(`
    SELECT CAST(id AS CHAR) AS id, project_name AS projectName, longitude, latitude
    FROM site_exploration_site
    ORDER BY id
  `);
  const answersBySubmission = groupBySubmission(answers);
  const transformed = submissions.map((submission) => transformFieldSurveySubmission({
    ...submission,
    submittedAt: Number(submission.submittedAt),
    updatedAt: Number(submission.updatedAt),
    answers: answersBySubmission.get(submission.id) ?? [],
    attachments: [],
  }));
  const siteByIdentity = uniqueSiteIdentityMap(sites);
  const sourceIdentities = new Set<string>();
  for (const item of transformed) {
    if (sourceIdentities.has(item.dedupeKey)) throw new Error(`Duplicate source site identity: ${item.target.sourceSubmissionId}`);
    sourceIdentities.add(item.dedupeKey);
    if (!siteByIdentity.has(item.dedupeKey)) throw new Error(`Local site is missing for source submission ${item.target.sourceSubmissionId}`);
  }
  if (sites.length !== transformed.length) throw new Error(`Source/local site count mismatch: ${transformed.length}/${sites.length}`);

  const resolution = await resolveFieldSurveyImportActors(
    targetConnection,
    transformed.map(({ target }) => ({
      sourceSubmissionId: target.sourceSubmissionId,
      sourceSubmitterUserId: target.sourceSubmitterUserId,
      sourceSubmitterPhoneNumber: target.sourceSubmitterPhoneNumber,
    })),
  );
  const updates = transformed.flatMap((item) => {
    const actor = resolution.actorsBySubmissionId.get(item.target.sourceSubmissionId);
    if (!actor) return [];
    return [{ siteId: siteByIdentity.get(item.dedupeKey)!, actor }];
  });

  console.log(JSON.stringify({
    mode: execute ? "execute-preview" : "dry-run",
    sourceSubmissions: transformed.length,
    matchedLocalSites: siteByIdentity.size,
    resolvedPlatformSubmissions: resolution.resolvedPlatformSubmissions,
    legacyHistorySubmissions: resolution.legacyHistorySubmissions,
    unresolved: resolution.unresolved,
    rowsToUpdate: updates.length,
  }, null, 2));
  if (!execute) process.exit(0);
  if (resolution.unresolved.length && !allowUnresolved) {
    throw new Error("Backfill has unresolved source collectors; rerun with --allow-unresolved to update only resolved records");
  }
  assertLocalTarget(targetUrl);
  const result = await executeBackfill(targetConnection, updates);
  console.log(JSON.stringify({ mode: "execute-complete", ...result }, null, 2));
} finally {
  await Promise.allSettled([sourceConnection.end(), targetConnection.end()]);
}

async function executeBackfill(
  connection: Awaited<ReturnType<typeof mysql.createConnection>>,
  updates: Array<{
    siteId: string;
    actor: { memberId: string; explorerName: string; teamId: string; teamName: string };
  }>,
) {
  await connection.beginTransaction();
  try {
    await connection.query(`
      CREATE TEMPORARY TABLE tmp_field_survey_actor_backfill (
        site_id BIGINT UNSIGNED NOT NULL,
        member_id BIGINT UNSIGNED NOT NULL,
        explorer_name VARCHAR(64) NOT NULL,
        team_id BIGINT UNSIGNED NOT NULL,
        team_name VARCHAR(64) NOT NULL,
        PRIMARY KEY (site_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);
    await connection.execute<ResultSetHeader>(`
      INSERT INTO tmp_field_survey_actor_backfill
        (site_id, member_id, explorer_name, team_id, team_name)
      VALUES ${updates.map(() => "(?, ?, ?, ?, ?)").join(", ")}
    `, updates.flatMap(({ siteId, actor }) => [
      siteId, actor.memberId, actor.explorerName, actor.teamId, actor.teamName,
    ]));
    const [sites] = await connection.execute<ResultSetHeader>(`
      UPDATE site_exploration_site site
      INNER JOIN tmp_field_survey_actor_backfill mapping ON mapping.site_id = site.id
      SET site.explorer_name = mapping.explorer_name,
        site.exploration_team = mapping.team_name,
        site.exploration_team_id = mapping.team_id,
        site.created_by_member_id = mapping.member_id,
        site.updated_by_member_id = mapping.member_id
    `);
    const [attachments] = await connection.execute<ResultSetHeader>(`
      UPDATE site_exploration_attachment attachment
      INNER JOIN tmp_field_survey_actor_backfill mapping ON mapping.site_id = attachment.site_id
      SET attachment.created_by_member_id = mapping.member_id
    `);
    const [[verified]] = await connection.query<(RowDataPacket & { count: number })[]>(`
      SELECT COUNT(*) AS count
      FROM site_exploration_site site
      INNER JOIN tmp_field_survey_actor_backfill mapping
        ON mapping.site_id = site.id
        AND mapping.member_id = site.created_by_member_id
        AND mapping.member_id = site.updated_by_member_id
        AND mapping.explorer_name = site.explorer_name
        AND mapping.team_id = site.exploration_team_id
        AND mapping.team_name = site.exploration_team
    `);
    if (Number(verified?.count) !== updates.length) throw new Error("Field survey actor backfill verification failed");
    await connection.commit();
    return { updatedSites: sites.affectedRows, updatedAttachments: attachments.affectedRows, verifiedSites: Number(verified.count) };
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

function uniqueSiteIdentityMap(rows: readonly SiteRow[]): Map<string, string> {
  const identities = new Map<string, string>();
  for (const row of rows) {
    const key = fieldSurveyIdentityKey(row.projectName, Number(row.longitude), Number(row.latitude));
    if (identities.has(key)) throw new Error(`Duplicate local site identity: ${row.id}`);
    identities.set(key, row.id);
  }
  return identities;
}

function assertLocalTarget(databaseUrl: string): void {
  const host = new URL(databaseUrl).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`Refusing to backfill a non-local database host: ${host}`);
  }
}

function groupBySubmission<Row extends { submissionId: string }>(rows: Row[]): Map<string, Omit<Row, "submissionId">[]> {
  const grouped = new Map<string, Omit<Row, "submissionId">[]>();
  for (const { submissionId, ...row } of rows) {
    const values = grouped.get(submissionId) ?? [];
    values.push(row);
    grouped.set(submissionId, values);
  }
  return grouped;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}
