import mysql, { type Connection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { createContactPhoneCrypto } from "../../apps/site-selection-v2-service/src/site-exploration/contact-phone-crypto";
import {
  createSiteExplorationStorage,
  type SiteExplorationStorage,
} from "../../apps/site-selection-v2-service/src/site-exploration/site-exploration-storage";
import {
  assertConfirmedFieldSurveyIncrementalTarget,
  createFieldSurveyIncrementalPlan,
  createFieldSurveyDryRunReport,
  transformFieldSurveySubmission,
  type ExistingExplorationIdentity,
  type SourceAnswer,
  type SourceAttachment,
  type SourceSubmission,
} from "./field-survey-import-transform";
import {
  resolveFieldSurveyImportActors,
  type FieldSurveyImportActor,
} from "./field-survey-import-actor";

type SubmissionRow = RowDataPacket & Omit<SourceSubmission, "answers" | "attachments">;
type AnswerRow = RowDataPacket & SourceAnswer & { submissionId: string };
type AttachmentRow = RowDataPacket & SourceAttachment & { submissionId: string };
type ExistingRow = RowDataPacket & ExistingExplorationIdentity;

const arguments_ = new Set(process.argv.slice(2));
const execute = arguments_.has("--execute");
const incremental = arguments_.has("--incremental");
const allowUnresolved = arguments_.has("--allow-unresolved");
if ([...arguments_].some((argument) =>
  argument !== "--execute"
  && argument !== "--clear-local"
  && argument !== "--incremental"
  && argument !== "--allow-unresolved"
)) {
  throw new Error("Unsupported import argument");
}
const clearLocal = arguments_.has("--clear-local");
if (execute && incremental && clearLocal) {
  throw new Error("Incremental import cannot clear existing target data");
}
if (execute && incremental && !allowUnresolved) {
  throw new Error("Incremental import with unresolved collectors requires --allow-unresolved");
}
if (execute && !incremental && !clearLocal) {
  throw new Error("Formal import requires --execute and --clear-local together");
}
if (!execute && (clearLocal || allowUnresolved)) throw new Error("Execution-only import argument requires --execute");

const sourceUrl = requiredEnvironment("FIELD_SURVEY_SOURCE_MYSQL_URL");
const targetUrl = requiredEnvironment("SITE_SELECTION_V2_MYSQL_URL");
const sourceConnection = await mysql.createConnection(sourceUrl);
const targetConnection = await mysql.createConnection(targetUrl);

try {
  const [submissionRows] = await sourceConnection.query<SubmissionRow[]>(`
    SELECT
      CAST(s.id AS CHAR) AS id,
      s.questionnaire_version AS version,
      s.city,
      s.submitted_at AS submittedAt,
      s.updated_at AS updatedAt,
      COALESCE(CAST(s.submitted_by_user_id AS CHAR), '') AS submitterUserId,
      COALESCE(u.name, '') AS submitterName,
      COALESCE(u.phone_number, '') AS submitterPhoneNumber
    FROM questionnaire_submission s
    LEFT JOIN user u ON u.id = s.submitted_by_user_id
    WHERE s.questionnaire_code = 'field_survey' AND s.status = 2
    ORDER BY s.id
  `);
  const [answerRows] = await sourceConnection.query<AnswerRow[]>(`
    SELECT
      CAST(a.submission_id AS CHAR) AS submissionId,
      a.field_id AS fieldId,
      COALESCE(a.answer_value, '') AS answerValue,
      COALESCE(a.followup_value, '') AS followupValue,
      COALESCE(a.answer_json, '') AS answerJson
    FROM questionnaire_answer a
    INNER JOIN questionnaire_submission s ON s.id = a.submission_id
    WHERE s.questionnaire_code = 'field_survey' AND s.status = 2
    ORDER BY a.submission_id, a.id
  `);
  const [attachmentRows] = await sourceConnection.query<AttachmentRow[]>(`
    SELECT
      CAST(a.id AS CHAR) AS id,
      CAST(a.submission_id AS CHAR) AS submissionId,
      a.field_id AS fieldId,
      a.file_url AS fileUrl,
      a.object_key AS objectKey,
      a.original_file_name AS originalFileName,
      a.content_type AS contentType,
      CAST(a.file_size_bytes AS UNSIGNED) AS fileSizeBytes
    FROM questionnaire_attachment a
    INNER JOIN questionnaire_submission s ON s.id = a.submission_id
    WHERE s.questionnaire_code = 'field_survey' AND s.status = 2
    ORDER BY a.submission_id, a.id
  `);
  const [existingRows] = await targetConnection.query<ExistingRow[]>(`
    SELECT project_name AS projectName, longitude, latitude
    FROM site_exploration_site
    ORDER BY id
  `);

  const answersBySubmission = groupBySubmission(answerRows);
  const attachmentsBySubmission = groupBySubmission(attachmentRows);
  const duplicateAnswerFields = countDuplicateAnswerFields(answerRows);
  const transformFailures: Record<string, number> = {};
  const transformed = [];
  for (const row of submissionRows) {
    try {
      transformed.push(transformFieldSurveySubmission({
        ...row,
        submittedAt: Number(row.submittedAt),
        updatedAt: Number(row.updatedAt),
        answers: answersBySubmission.get(row.id) ?? [],
        attachments: attachmentsBySubmission.get(row.id) ?? [],
      }));
    } catch (error) {
      const code = error instanceof Error ? error.message : "unknown_transform_failure";
      transformFailures[code] = (transformFailures[code] ?? 0) + 1;
    }
  }

  const existing = existingRows.map((row) => ({
      projectName: row.projectName,
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
  }));
  const report = createFieldSurveyDryRunReport(transformed, existing);
  const incrementalPlan = createFieldSurveyIncrementalPlan(transformed, existing);
  const versions = countBy(submissionRows.map((row) => row.version));
  const allAttachmentBytes = attachmentRows.reduce((sum, row) => sum + Number(row.fileSizeBytes), 0);
  const actorResolution = await resolveFieldSurveyImportActors(
    targetConnection,
    transformed.map(({ target }) => ({
      sourceSubmissionId: target.sourceSubmissionId,
      sourceSubmitterUserId: target.sourceSubmitterUserId,
      sourceSubmitterPhoneNumber: target.sourceSubmitterPhoneNumber,
    })),
  );

  console.log(JSON.stringify({
    mode: execute ? "execute-preview" : "dry-run",
    strategy: incremental ? "incremental" : "replace-local",
    scope: { questionnaireCode: "field_survey", submissionStatus: 2 },
    source: {
      submissions: submissionRows.length,
      versions,
      answers: answerRows.length,
      attachments: attachmentRows.length,
      attachmentBytes: allAttachmentBytes,
    },
    transformed: transformed.length,
    transformFailures: sortRecord(transformFailures),
    duplicateAnswerFields,
    collectorResolution: {
      resolvedPlatformSubmissions: actorResolution.resolvedPlatformSubmissions,
      legacyHistorySubmissions: actorResolution.legacyHistorySubmissions,
      unresolved: actorResolution.unresolved,
    },
    incremental: {
      pending: incrementalPlan.pending.length,
      skippedExisting: incrementalPlan.skippedExisting.length,
    },
    ...report,
  }, null, 2));

  if (execute) {
    if (Object.keys(transformFailures).length > 0 || transformed.length !== submissionRows.length) {
      throw new Error("Cannot execute an import with transformation failures");
    }
    if (!incremental && actorResolution.unresolved.length > 0) {
      throw new Error("Cannot execute an import with unresolved source collectors");
    }
    const result = incremental
      ? await executeIncrementalImport({
        targetConnection,
        transformed,
        expectedTargetSiteCount: Number(requiredEnvironment("FIELD_SURVEY_EXPECTED_TARGET_SITE_COUNT")),
        expectedInsertCount: Number(requiredEnvironment("FIELD_SURVEY_EXPECTED_INCREMENTAL_INSERT_COUNT")),
        confirmedTarget: requiredEnvironment("FIELD_SURVEY_CONFIRMED_TARGET"),
        actorsBySubmissionId: actorResolution.actorsBySubmissionId,
      })
      : await executeImport({
        targetConnection,
        transformed,
        expectedLocalSiteCount: Number(requiredEnvironment("FIELD_SURVEY_EXPECTED_LOCAL_SITE_COUNT")),
        actorsBySubmissionId: actorResolution.actorsBySubmissionId,
      });
    console.log(JSON.stringify({ mode: "execute-complete", ...result }, null, 2));
  }
} finally {
  await Promise.allSettled([sourceConnection.end(), targetConnection.end()]);
}

async function executeIncrementalImport(input: {
  targetConnection: Connection;
  transformed: ReturnType<typeof transformFieldSurveySubmission>[];
  expectedTargetSiteCount: number;
  expectedInsertCount: number;
  confirmedTarget: string;
  actorsBySubmissionId: ReadonlyMap<string, FieldSurveyImportActor>;
}) {
  assertConfirmedFieldSurveyIncrementalTarget(targetUrl, input.confirmedTarget);
  assertExpectedCount("FIELD_SURVEY_EXPECTED_TARGET_SITE_COUNT", input.expectedTargetSiteCount);
  assertExpectedCount("FIELD_SURVEY_EXPECTED_INCREMENTAL_INSERT_COUNT", input.expectedInsertCount);

  const [[currentCount]] = await input.targetConnection.query<(RowDataPacket & { count: number })[]>(
    "SELECT COUNT(*) AS count FROM site_exploration_site",
  );
  if (Number(currentCount?.count) !== input.expectedTargetSiteCount) {
    throw new Error(`Target site count changed: expected ${input.expectedTargetSiteCount}, received ${currentCount?.count}`);
  }
  const [existingRows] = await input.targetConnection.query<ExistingRow[]>(`
    SELECT project_name AS projectName, longitude, latitude
    FROM site_exploration_site
    ORDER BY id
  `);
  const plan = createFieldSurveyIncrementalPlan(input.transformed, existingRows.map((row) => ({
    projectName: row.projectName,
    longitude: Number(row.longitude),
    latitude: Number(row.latitude),
  })));
  if (plan.pending.length !== input.expectedInsertCount) {
    throw new Error(`Incremental insert count changed: expected ${input.expectedInsertCount}, received ${plan.pending.length}`);
  }

  const [[beforeAttachmentCount]] = await input.targetConnection.query<(RowDataPacket & { count: number })[]>(
    "SELECT COUNT(*) AS count FROM site_exploration_attachment WHERE category BETWEEN 4 AND 7",
  );
  const storage = createImportStorage();
  let importedSites = 0;
  let copiedImages = 0;
  let copiedSourceAttachments = 0;
  let copiedBytes = 0;
  const attribution = { platformMember: 0, legacyHistory: 0, unresolved: 0 };
  for (const item of plan.pending) {
    const actor = input.actorsBySubmissionId.get(item.target.sourceSubmissionId);
    if (!actor) throw new Error(`Missing collector for source submission ${item.target.sourceSubmissionId}`);
    const result = await importOneSite(input.targetConnection, storage, item, actor);
    importedSites += 1;
    copiedImages += result.images;
    copiedSourceAttachments += result.sourceAttachments;
    copiedBytes += result.bytes;
    if (actor.source === "platform-member") attribution.platformMember += 1;
    else if (actor.source === "legacy-history") attribution.legacyHistory += 1;
    else attribution.unresolved += 1;
    if (importedSites % 10 === 0 || importedSites === plan.pending.length) {
      console.error(`Imported ${importedSites}/${plan.pending.length} incremental sites`);
    }
  }

  const [[siteCount]] = await input.targetConnection.query<(RowDataPacket & { count: number })[]>(
    "SELECT COUNT(*) AS count FROM site_exploration_site",
  );
  const [[attachmentCount]] = await input.targetConnection.query<(RowDataPacket & { count: number })[]>(
    "SELECT COUNT(*) AS count FROM site_exploration_attachment WHERE category BETWEEN 4 AND 7",
  );
  const expectedFinalSiteCount = input.expectedTargetSiteCount + importedSites;
  const expectedFinalAttachmentCount = Number(beforeAttachmentCount?.count) + copiedSourceAttachments;
  if (Number(siteCount?.count) !== expectedFinalSiteCount) throw new Error("Incremental site count verification failed");
  if (Number(attachmentCount?.count) !== expectedFinalAttachmentCount) {
    throw new Error("Incremental attachment count verification failed");
  }
  return {
    strategy: "incremental",
    initialSites: input.expectedTargetSiteCount,
    skippedExisting: plan.skippedExisting.length,
    importedSites,
    copiedImages,
    copiedSourceAttachments,
    copiedBytes,
    attribution,
    verifiedSites: Number(siteCount?.count),
  };
}

function assertExpectedCount(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
}

async function executeImport(input: {
  targetConnection: Connection;
  transformed: ReturnType<typeof transformFieldSurveySubmission>[];
  expectedLocalSiteCount: number;
  actorsBySubmissionId: ReadonlyMap<string, FieldSurveyImportActor>;
}) {
  assertLocalTarget(targetUrl);
  if (!Number.isSafeInteger(input.expectedLocalSiteCount) || input.expectedLocalSiteCount < 0) {
    throw new Error("FIELD_SURVEY_EXPECTED_LOCAL_SITE_COUNT must be a non-negative integer");
  }
  const [[currentCount]] = await input.targetConnection.query<(RowDataPacket & { count: number })[]>(
    "SELECT COUNT(*) AS count FROM site_exploration_site",
  );
  if (Number(currentCount?.count) !== input.expectedLocalSiteCount) {
    throw new Error(`Local site count changed: expected ${input.expectedLocalSiteCount}, received ${currentCount?.count}`);
  }
  const storage = createImportStorage();
  const oldObjectKeys = await readExistingObjectKeys(input.targetConnection);
  await clearLocalExplorationData(input.targetConnection);
  await deleteObjects(storage, oldObjectKeys);

  let importedSites = 0;
  let copiedImages = 0;
  let copiedSourceAttachments = 0;
  let copiedBytes = 0;
  for (const item of input.transformed) {
    const actor = input.actorsBySubmissionId.get(item.target.sourceSubmissionId);
    if (!actor) throw new Error(`Missing resolved collector for source submission ${item.target.sourceSubmissionId}`);
    const result = await importOneSite(input.targetConnection, storage, item, actor);
    importedSites += 1;
    copiedImages += result.images;
    copiedSourceAttachments += result.sourceAttachments;
    copiedBytes += result.bytes;
    if (importedSites % 10 === 0 || importedSites === input.transformed.length) {
      console.error(`Imported ${importedSites}/${input.transformed.length} sites`);
    }
  }

  const [[siteCount]] = await input.targetConnection.query<(RowDataPacket & { count: number })[]>(
    "SELECT COUNT(*) AS count FROM site_exploration_site",
  );
  const [[attachmentCount]] = await input.targetConnection.query<(RowDataPacket & { count: number })[]>(
    "SELECT COUNT(*) AS count FROM site_exploration_attachment WHERE category BETWEEN 4 AND 7",
  );
  if (Number(siteCount?.count) !== input.transformed.length) throw new Error("Imported site count verification failed");
  if (Number(attachmentCount?.count) !== copiedSourceAttachments) throw new Error("Imported attachment count verification failed");
  return {
    clearedLocalSites: input.expectedLocalSiteCount,
    deletedOldObjects: oldObjectKeys.length,
    importedSites,
    copiedImages,
    copiedSourceAttachments,
    copiedBytes,
    verifiedLocalSites: Number(siteCount?.count),
  };
}

function assertLocalTarget(databaseUrl: string): void {
  const url = new URL(databaseUrl);
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error(`Refusing to clear a non-local target database host: ${url.hostname}`);
  }
}

function createImportStorage(): SiteExplorationStorage {
  const region = requiredEnvironment("SITE_SELECTION_V2_OSS_REGION");
  const endpoint = requiredEnvironment("SITE_SELECTION_V2_OSS_ENDPOINT");
  const accessKeyId = requiredEnvironment("SITE_SELECTION_V2_OSS_ACCESS_KEY_ID");
  const accessKeySecret = requiredEnvironment("SITE_SELECTION_V2_OSS_ACCESS_KEY_SECRET");
  const bucket = requiredEnvironment("SITE_SELECTION_V2_OSS_BUCKET");
  const publicBaseUrl = requiredEnvironment("SITE_SELECTION_V2_OSS_PUBLIC_BASE_URL");
  return createSiteExplorationStorage({ region, endpoint, accessKeyId, accessKeySecret, bucket, publicBaseUrl });
}

async function readExistingObjectKeys(connection: Connection): Promise<string[]> {
  const [attachmentRows] = await connection.query<(RowDataPacket & { objectKey: string })[]>(
    "SELECT object_key AS objectKey FROM site_exploration_attachment ORDER BY id",
  );
  const [siteRows] = await connection.query<RowDataPacket[]>(`
    SELECT satellite_images, access_convenience_images, land_scene_images, other_structure_images,
      location_snapshot, site_boundary_snapshot, highway_distance_snapshot,
      arterial_road_distance_snapshot, nearby_truck_charging_station_snapshot,
      nearby_hotspot_area_snapshot
    FROM site_exploration_site
    ORDER BY id
  `);
  const keys = new Set(attachmentRows.map((row) => row.objectKey));
  for (const row of siteRows) collectObjectKeys(row, keys);
  for (const key of keys) {
    if (!key.startsWith("site-exploration/")) throw new Error(`Refusing to delete non-exploration object: ${key}`);
  }
  return [...keys].sort();
}

function collectObjectKeys(value: unknown, output: Set<string>): void {
  if (typeof value === "string") {
    if (!value) return;
    try { collectObjectKeys(JSON.parse(value), output); } catch { /* scalar values are not attachment metadata */ }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectObjectKeys(item, output);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.objectKey === "string" && record.objectKey) output.add(record.objectKey);
  for (const nested of Object.values(record)) collectObjectKeys(nested, output);
}

async function clearLocalExplorationData(connection: Connection): Promise<void> {
  await connection.beginTransaction();
  try {
    await connection.query(`DELETE attempt FROM site_analysis_step_attempt attempt
      INNER JOIN site_analysis_step step ON step.id = attempt.step_id
      INNER JOIN site_analysis_task task ON task.id = step.task_id
      INNER JOIN site_exploration_site site ON site.id = task.exploration_site_id`);
    await connection.query(`DELETE step FROM site_analysis_step step
      INNER JOIN site_analysis_task task ON task.id = step.task_id
      INNER JOIN site_exploration_site site ON site.id = task.exploration_site_id`);
    await connection.query(`DELETE task FROM site_analysis_task task
      INNER JOIN site_exploration_site site ON site.id = task.exploration_site_id`);
    await connection.query(`DELETE attachment FROM site_exploration_attachment attachment
      INNER JOIN site_exploration_site site ON site.id = attachment.site_id`);
    await connection.query("DELETE FROM site_exploration_site");
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function deleteObjects(storage: SiteExplorationStorage, objectKeys: string[]): Promise<void> {
  for (const objectKey of objectKeys) await storage.deleteObject(objectKey);
}

async function importOneSite(
  connection: Connection,
  storage: SiteExplorationStorage,
  item: ReturnType<typeof transformFieldSurveySubmission>,
  actor: FieldSurveyImportActor,
): Promise<{ images: number; sourceAttachments: number; bytes: number }> {
  const phoneKey = Buffer.from(requiredEnvironment("SITE_SELECTION_V2_CONTACT_PHONE_ENCRYPTION_KEY"), "base64");
  const phoneCrypto = createContactPhoneCrypto(phoneKey);
  const copiedKeys: string[] = [];
  await connection.beginTransaction();
  try {
    const target = item.target;
    const [insert] = await connection.execute<ResultSetHeader>(`
      INSERT INTO site_exploration_site (
        status, explorer_name, exploration_team, exploration_team_id, exploration_date,
        project_name, contact_name, contact_phone_encrypted, province_city, county_district,
        location_address, longitude, latitude, highway_distance_meters, site_area_square_meters,
        arterial_road_distance_meters, access_convenience, land_qualified, land_type,
        has_land_proof, has_lease_agreement, has_other_structures, ground_hardening,
        terrain_condition, capacity_description, transport_capacity_description,
        has_nearby_truck_charging_station, nearby_truck_charging_station_description,
        cooperation_mode, cooperation_terms, site_maturity, important_notes,
        created_by_member_id, updated_by_member_id, created_at, updated_at
      ) VALUES (${Array(36).fill("?").join(", ")})
    `, [
      target.status, actor.explorerName, actor.teamName, actor.teamId, target.explorationDate,
      target.projectName, target.contactName, phoneCrypto.encrypt(target.contactPhone),
      target.provinceCity, target.countyDistrict, target.locationAddress, target.longitude,
      target.latitude, target.highwayDistanceMeters, target.siteAreaSquareMeters,
      target.arterialRoadDistanceMeters, target.accessConvenience, target.landQualified,
      target.landType, target.hasLandProof, target.hasLeaseAgreement, target.hasOtherStructures,
      target.groundHardening, target.terrainCondition, target.capacityDescription,
      target.transportCapacityDescription, target.hasNearbyTruckChargingStation,
      target.nearbyTruckChargingStationDescription, target.cooperationMode,
      target.cooperationTerms, target.siteMaturity, target.importantNotes,
      actor.memberId, actor.memberId, targetDateTimestamp(target.explorationDate),
      Math.max(targetDateTimestamp(target.explorationDate), 1),
    ]);
    const siteId = String(insert.insertId);
    const imageGroups: Record<string, Array<Record<string, unknown>>> = {
      satelliteImages: [], accessConvenienceImages: [], landSceneImages: [], otherStructureImages: [],
    };
    let copiedBytes = 0;
    for (const copy of item.imageCopies) {
      const objectKey = targetObjectKey(siteId, copy.targetField, copy.contentType);
      await storage.copySourceObject(copy.objectKey, objectKey);
      copiedKeys.push(objectKey);
      copiedBytes += copy.fileSizeBytes;
      imageGroups[copy.targetField]!.push(attachmentMetadata(storage, objectKey, copy));
    }
    await connection.execute(`UPDATE site_exploration_site
      SET satellite_images = ?, access_convenience_images = ?, land_scene_images = ?, other_structure_images = ?
      WHERE id = ? LIMIT 1`, [
      JSON.stringify(imageGroups.satelliteImages),
      JSON.stringify(imageGroups.accessConvenienceImages),
      JSON.stringify(imageGroups.landSceneImages),
      JSON.stringify(imageGroups.otherStructureImages),
      siteId,
    ]);
    for (const copy of item.sourceAttachmentCopies) {
      const objectKey = targetObjectKey(siteId, copy.targetField, copy.contentType);
      await storage.copySourceObject(copy.objectKey, objectKey);
      copiedKeys.push(objectKey);
      copiedBytes += copy.fileSizeBytes;
      const metadata = attachmentMetadata(storage, objectKey, copy);
      await connection.execute(`INSERT INTO site_exploration_attachment
        (site_id, category, object_key, stored_url, original_name, content_type, file_size,
          created_by_member_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        siteId, sourceAttachmentCategory(copy.targetField), objectKey, metadata.url,
        copy.originalFileName, copy.contentType, copy.fileSizeBytes, actor.memberId,
        targetDateTimestamp(target.explorationDate), targetDateTimestamp(target.explorationDate),
      ]);
    }
    await connection.commit();
    return {
      images: item.imageCopies.length,
      sourceAttachments: item.sourceAttachmentCopies.length,
      bytes: copiedBytes,
    };
  } catch (error) {
    await connection.rollback();
    await Promise.allSettled(copiedKeys.map((objectKey) => storage.deleteObject(objectKey)));
    throw error;
  }
}

function targetObjectKey(siteId: string, field: string, contentType: string): string {
  const imagePath = imageFieldPath(field);
  const path = imagePath ?? `source-attachments/${field}`;
  const extension = contentTypeExtension(contentType);
  if (!extension) throw new Error(`Unsupported attachment content type: ${contentType}`);
  return `site-exploration/${siteId}/${path}/${randomUUID()}.${extension}`;
}

function sourceAttachmentCategory(field: string): number {
  if (field === "sourceSatelliteAttachments") return 4;
  if (field === "sourceAccessConvenienceAttachments") return 5;
  if (field === "sourceLandSceneAttachments") return 6;
  if (field === "sourceOtherStructureAttachments") return 7;
  throw new Error(`Unsupported source attachment field: ${field}`);
}

function imageFieldPath(field: string): string | null {
  if (field === "satelliteImages") return "satellite-images";
  if (field === "accessConvenienceImages") return "access-convenience-images";
  if (field === "landSceneImages") return "land-scene-images";
  if (field === "otherStructureImages") return "other-structure-images";
  return null;
}

function contentTypeExtension(contentType: string): string | null {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "video/mp4") return "mp4";
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "application/msword") return "doc";
  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (contentType === "application/vnd.ms-excel") return "xls";
  if (contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
  return null;
}

function attachmentMetadata(
  storage: SiteExplorationStorage,
  objectKey: string,
  source: SourceAttachment,
): { objectKey: string; url: string; originalName: string; contentType: string; size: number } {
  return {
    objectKey,
    url: storage.createStoredUrl(objectKey),
    originalName: source.originalFileName,
    contentType: source.contentType,
    size: source.fileSizeBytes,
  };
}

function targetDateTimestamp(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00+08:00`).getTime() / 1_000);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
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

function countDuplicateAnswerFields(rows: AnswerRow[]): number {
  const keys = new Set<string>();
  let duplicates = 0;
  for (const row of rows) {
    const key = `${row.submissionId}\u0000${row.fieldId}`;
    if (keys.has(key)) duplicates += 1;
    else keys.add(key);
  }
  return duplicates;
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return sortRecord(counts);
}

function sortRecord(value: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}
