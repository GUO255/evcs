import type { Pool, RowDataPacket } from "mysql2/promise";
import { analysisDimensions, explorationStatusByDbValue, explorationStatusCodes, explorationStatusDbValue, recommendationByDbValue, recommendationDbValue, type ExplorationStatus, type Recommendation } from "./constants";
import { queryOne, queryRows, nowSeconds, parseJsonColumn } from "./database";
import { startLocalAnalysisTask } from "./analysis";
import { buildDocx, buildXlsx } from "./office";
import { errorResponse, isRecord, jsonResponse, notFound, readJsonBody, validId } from "./respond";
import { createUploadSession, findStoredTicket, localObjectUrl, markTicketCompleted, storeSnapshotFile } from "./files";

interface SiteRow extends RowDataPacket {
  id: string;
  status: number;
  explorer_name: string;
  exploration_team: string;
  exploration_team_id: string;
  exploration_date: string;
  overall_score: number;
  overall_score_available: number;
  selection_recommendation: number;
  latest_analysis_task_id: string;
  project_name: string;
  contact_name: string;
  contact_phone_encrypted: string;
  province_city: string;
  county_district: string;
  location_address: string;
  longitude: string;
  latitude: string;
  location_snapshot: string;
  satellite_images: unknown;
  highway_distance_meters: number;
  highway_distance_geo_json: string;
  highway_distance_snapshot: string;
  highway_entrance: unknown;
  highway_routes: unknown;
  site_area_square_meters: string;
  site_boundary_geo_json: string;
  site_boundary_snapshot: string;
  arterial_road_distance_meters: number;
  arterial_road_distance_geo_json: string;
  arterial_road_distance_snapshot: string;
  arterial_road_traffic_geo_json: string;
  arterial_road_route_ref: string | null;
  access_convenience: number;
  access_convenience_images: unknown;
  land_qualified: number;
  land_type: number;
  land_type_description: string;
  has_land_proof: number;
  has_lease_agreement: number;
  land_scene_images: unknown;
  has_other_structures: number;
  other_structure_images: unknown;
  ground_hardening: number;
  terrain_condition: number;
  capacity_description: string;
  transport_capacity_description: string;
  nearby_truck_charging_stations: unknown;
  nearby_truck_charging_station_snapshot: string;
  nearby_task_stations: unknown;
  nearby_task_station_snapshot: string;
  nearby_hotspot_areas: unknown;
  nearby_hotspot_area_snapshot: string;
  cooperation_mode: number;
  cooperation_terms: string;
  site_maturity: number;
  important_notes: string;
  contract_date: string;
  created_by_member_id: string;
  updated_by_member_id: string;
  created_at: number;
  updated_at: number;
  power_access_method: number;
  electricity_nature: number;
  high_voltage_access_method: number;
  ten_kv_line_access_distance_meters: string | null;
  survey_recommendation: number;
  charging_pile_model: string;
  charging_pile_quantity: number | null;
  transformer_capacity: string;
  transformer_quantity: number | null;
  preliminary_design_notes: string;
  competitors: unknown;
}

interface AttachmentRow extends RowDataPacket {
  id: string;
  category: string;
  object_key: string;
  stored_url: string;
  original_name: string;
  content_type: string;
  file_size: number;
}

interface ConstructionRow extends RowDataPacket {
  construction_status: number;
  construction_entity: string;
  station_type: string;
  driver_home_provision: number;
  charging_equipment_capacity_kva: number;
  battery_swap_equipment_capacity_kva: number;
  photovoltaic_capacity_kw: number;
  energy_storage_capacity_kwh: number;
}

const choice = <T extends string>(map: Readonly<Record<string, number>>, value: unknown, fallback: number): number => (
  typeof value === "string" && value in map ? map[value]! : fallback
);

const reverseChoice = (map: Readonly<Record<number, string>>, value: number): string => map[value] ?? "";

const accessConvenienceFromDb: Readonly<Record<number, string>> = { 1: "excellent", 2: "good", 3: "average" };
const accessConvenienceToDb: Readonly<Record<string, number>> = { excellent: 1, good: 2, average: 3 };
const landTypeFromDb: Readonly<Record<number, string>> = { 1: "construction", 2: "collective-commercial", 3: "allocated", 4: "other" };
const landTypeToDb: Readonly<Record<string, number>> = { construction: 1, "collective-commercial": 2, allocated: 3, other: 4 };
const hardeningFromDb: Readonly<Record<number, string>> = { 1: "good", 2: "needs-hardening", 3: "unhardened" };
const hardeningToDb: Readonly<Record<string, number>> = { good: 1, "needs-hardening": 2, unhardened: 3 };
const terrainFromDb: Readonly<Record<number, string>> = { 1: "well-drained", 2: "flat", 3: "low-lying" };
const terrainToDb: Readonly<Record<string, number>> = { "well-drained": 1, flat: 2, "low-lying": 3 };
const cooperationFromDb: Readonly<Record<number, string>> = { 1: "service-fee-share", 2: "net-profit-share", 3: "fixed-rent" };
const cooperationToDb: Readonly<Record<string, number>> = { "service-fee-share": 1, "net-profit-share": 2, "fixed-rent": 3 };
const maturityFromDb: Readonly<Record<number, string>> = { 1: "a", 2: "b", 3: "c" };
const maturityToDb: Readonly<Record<string, number>> = { a: 1, b: 2, c: 3 };
const powerFromDb: Readonly<Record<number, string>> = { 1: "10kv", 2: "0.4kv" };
const powerToDb: Readonly<Record<string, number>> = { "10kv": 1, "0.4kv": 2 };
const electricityFromDb: Readonly<Record<number, string>> = { 1: "industrial", 2: "commercial" };
const electricityToDb: Readonly<Record<string, number>> = { industrial: 1, commercial: 2 };
const highVoltageFromDb: Readonly<Record<number, string>> = { 1: "new-box-transformer", 2: "distribution-room" };
const highVoltageToDb: Readonly<Record<string, number>> = { "new-box-transformer": 1, "distribution-room": 2 };
const surveyFromDb: Readonly<Record<number, string>> = { 1: "priority-construction", 2: "buildable", 3: "reserve", 4: "abandon" };
const surveyToDb: Readonly<Record<string, number>> = { "priority-construction": 1, buildable: 2, reserve: 3, abandon: 4 };

const attachmentFields: Readonly<Record<string, string>> = {
  "1": "landOwnershipDocuments",
  "2": "leaseAgreementDocuments",
  "3": "surveyDeterminationReports",
  "4": "sourceSatelliteAttachments",
  "5": "sourceAccessConvenienceAttachments",
  "6": "sourceLandSceneAttachments",
  "7": "sourceOtherStructureAttachments",
};

const imageColumns: Readonly<Record<string, string>> = {
  satelliteImages: "satellite_images",
  accessConvenienceImages: "access_convenience_images",
  landSceneImages: "land_scene_images",
  otherStructureImages: "other_structure_images",
};

const attachmentCategories: Readonly<Record<string, number>> = {
  landOwnershipDocuments: 1,
  leaseAgreementDocuments: 2,
  surveyDeterminationReports: 3,
  sourceSatelliteAttachments: 4,
  sourceAccessConvenienceAttachments: 5,
  sourceLandSceneAttachments: 6,
  sourceOtherStructureAttachments: 7,
};

function jsonImage(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  return value;
}

function jsonArray(value: unknown): unknown[] {
  const parsed = parseJsonColumn(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function highwayEntranceOf(value: unknown): Record<string, unknown> | null {
  const parsed = parseJsonColumn(value, null);
  if (!isRecord(parsed)) return null;
  const keys = ["poiId", "name", "address", "longitude", "latitude"];
  return keys.every((key) => key in parsed) && Object.keys(parsed).length === keys.length ? parsed : null;
}

function competitorList(value: unknown): unknown[] {
  const parsed = jsonArray(value);
  if (parsed.length === 0) {
    return [{ stationName: "", scale: "", modelQuantity: "", utilizationRate: "", electricityPrice: "" }];
  }
  return parsed;
}

function imageOf(objectKey: unknown, url: unknown, originalName: unknown, contentType: unknown, size: unknown): Record<string, unknown> | null {
  if (typeof objectKey !== "string" || typeof url !== "string") return null;
  return {
    objectKey,
    url,
    originalName: String(originalName ?? ""),
    contentType: String(contentType ?? "image/jpeg"),
    size: Number(size ?? 1),
  };
}

async function memberName(pool: Pool, memberId: string): Promise<string> {
  const row = await queryOne<RowDataPacket>(pool, "SELECT real_name FROM platform_member WHERE id = ? LIMIT 1", [memberId]);
  return row ? String(row.real_name) : "";
}

async function constructionPayload(pool: Pool, siteId: string): Promise<Record<string, unknown>> {
  const row = await queryOne<ConstructionRow>(
    pool,
    "SELECT * FROM site_exploration_construction WHERE site_id = ? LIMIT 1",
    [siteId],
  );
  if (!row) {
    return {
      constructionStatus: "",
      constructionEntity: "",
      stationType: "",
      driverHomeProvision: "",
      chargingEquipmentCapacityKva: 0,
      batterySwapEquipmentCapacityKva: 0,
      photovoltaicCapacityKw: 0,
      energyStorageCapacityKwh: 0,
    };
  }
  const statusMap: Readonly<Record<number, string>> = { 1: "not-started", 2: "under-construction", 3: "completed" };
  const provisionMap: Readonly<Record<number, string>> = { 1: "no", 2: "yes" };
  return {
    constructionStatus: statusMap[Number(row.construction_status)] ?? "",
    constructionEntity: row.construction_entity,
    stationType: row.station_type,
    driverHomeProvision: provisionMap[Number(row.driver_home_provision)] ?? "",
    chargingEquipmentCapacityKva: Number(row.charging_equipment_capacity_kva),
    batterySwapEquipmentCapacityKva: Number(row.battery_swap_equipment_capacity_kva),
    photovoltaicCapacityKw: Number(row.photovoltaic_capacity_kw),
    energyStorageCapacityKwh: Number(row.energy_storage_capacity_kwh),
  };
}

async function attachmentsPayload(pool: Pool, siteId: string): Promise<Record<string, unknown>> {
  const rows = await queryRows<AttachmentRow>(
    pool,
    "SELECT * FROM site_exploration_attachment WHERE site_id = ? ORDER BY id ASC",
    [siteId],
  );
  const payload = Object.fromEntries(Object.keys(attachmentCategories).map((field) => [field, []]));
  for (const row of rows) {
    const field = attachmentFields[String(row.category)];
    if (!field) continue;
    (payload[field] as Record<string, unknown>[]).push({
      objectKey: row.object_key,
      url: row.stored_url.startsWith("/") ? row.stored_url : localObjectUrl(row.object_key),
      originalName: row.original_name,
      contentType: row.content_type,
      size: Number(row.file_size),
    });
  }
  return payload;
}

function recordBase(row: SiteRow): Record<string, unknown> {
  const status = explorationStatusByDbValue[Number(row.status)] ?? "draft";
  return {
    id: row.id,
    status,
    explorerName: row.explorer_name,
    explorationTeamId: row.exploration_team_id === "0" ? "" : row.exploration_team_id,
    explorationTeam: row.exploration_team,
    explorationDate: row.exploration_date === "" ? new Date().toISOString().slice(0, 10) : row.exploration_date,
    overallScore: Number(row.overall_score),
    selectionRecommendation: recommendationByDbValue[Number(row.selection_recommendation)] ?? "",
    hasAnalysis: Number(row.overall_score_available) === 1,
    projectName: row.project_name,
    provinceCity: row.province_city,
    countyDistrict: row.county_district,
    locationSnapshot: jsonImage(parseJsonColumn(row.location_snapshot, null)),
    siteBoundarySnapshot: jsonImage(parseJsonColumn(row.site_boundary_snapshot, null)),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function listItemPayload(row: SiteRow): Record<string, unknown> {
  const satelliteImages = jsonArray(row.satellite_images);
  const chargingStations = jsonArray(row.nearby_truck_charging_stations);
  const hotspotAreas = jsonArray(row.nearby_hotspot_areas);
  return {
    ...recordBase(row),
    satelliteImagePreview: isRecord(satelliteImages[0]) ? satelliteImages[0] : null,
    highwayDistanceMeters: Number(row.highway_distance_meters),
    siteAreaSquareMeters: Number(row.site_area_square_meters),
    trafficVisitCount: null,
    arterialRoadDistanceMeters: Number(row.arterial_road_distance_meters),
    nearestRoadName: row.arterial_road_route_ref && row.arterial_road_route_ref !== "" ? row.arterial_road_route_ref : null,
    uniqueTrafficVehicleCount: null,
    nearbyChargingStationCount: Math.min(chargingStations.length, 20),
    nearbyHotspotAreaCount: Math.min(hotspotAreas.length, 100),
    completionCompleted: statusOf(row) === "completed" ? 1 : 0,
    completionTotal: 1,
    contractCompletionCompleted: statusOf(row) === "signed" || statusOf(row) === "under-construction" || statusOf(row) === "operating" ? 1 : 0,
    contractCompletionTotal: 1,
  };
}

function statusOf(row: SiteRow): ExplorationStatus {
  return explorationStatusByDbValue[Number(row.status)] ?? "draft";
}

async function recordPayload(pool: Pool, row: SiteRow): Promise<Record<string, unknown>> {
  const geoJson = (value: string): unknown => (value && value.trim() !== "" ? JSON.parse(value) : null);
  const snapshot = (value: string): unknown => jsonImage(parseJsonColumn(value, null));
  const imageFields = Object.fromEntries(
    Object.entries(imageColumns).map(([field, column]) => [
      field,
      jsonArray(row[column as keyof SiteRow]).map((item) => isRecord(item) ? item : null).filter(Boolean),
    ]),
  );
  return {
    ...recordBase(row),
    latestAnalysisTaskId: row.latest_analysis_task_id === "0" ? null : row.latest_analysis_task_id,
    contractDate: row.contract_date,
    construction: await constructionPayload(pool, row.id),
    contactName: row.contact_name,
    contactPhone: row.contact_phone_encrypted,
    locationAddress: row.location_address,
    longitude: Number(row.longitude),
    latitude: Number(row.latitude),
    highwayDistanceMeters: Number(row.highway_distance_meters),
    highwayDistanceGeoJson: geoJson(row.highway_distance_geo_json),
    highwayDistanceSnapshot: snapshot(row.highway_distance_snapshot),
    highwayEntrance: highwayEntranceOf(row.highway_entrance),
    highwayRoutes: jsonArray(row.highway_routes),
    siteAreaSquareMeters: Number(row.site_area_square_meters),
    siteBoundaryGeoJson: geoJson(row.site_boundary_geo_json),
    arterialRoadDistanceMeters: Number(row.arterial_road_distance_meters),
    arterialRoadDistanceGeoJson: geoJson(row.arterial_road_distance_geo_json),
    arterialRoadDistanceSnapshot: snapshot(row.arterial_road_distance_snapshot),
    arterialRoadTrafficGeoJson: geoJson(row.arterial_road_traffic_geo_json),
    accessConvenience: reverseChoice(accessConvenienceFromDb, Number(row.access_convenience)),
    landQualified: Number(row.land_qualified) === 1,
    landType: reverseChoice(landTypeFromDb, Number(row.land_type)),
    landTypeDescription: row.land_type_description,
    hasLandProof: Number(row.has_land_proof) === 1,
    hasLeaseAgreement: Number(row.has_lease_agreement) === 1,
    hasOtherStructures: Number(row.has_other_structures) === 1,
    groundHardening: reverseChoice(hardeningFromDb, Number(row.ground_hardening)),
    terrainCondition: reverseChoice(terrainFromDb, Number(row.terrain_condition)),
    capacityDescription: row.capacity_description,
    transportCapacityDescription: row.transport_capacity_description,
    nearbyTruckChargingStations: jsonArray(row.nearby_truck_charging_stations),
    nearbyTruckChargingStationSnapshot: snapshot(row.nearby_truck_charging_station_snapshot),
    nearbyTaskStations: jsonArray(row.nearby_task_stations),
    nearbyTaskStationSnapshot: snapshot(row.nearby_task_station_snapshot),
    nearbyHotspotAreas: jsonArray(row.nearby_hotspot_areas),
    nearbyHotspotAreaSnapshot: snapshot(row.nearby_hotspot_area_snapshot),
    cooperationMode: reverseChoice(cooperationFromDb, Number(row.cooperation_mode)),
    cooperationTerms: row.cooperation_terms,
    siteMaturity: reverseChoice(maturityFromDb, Number(row.site_maturity)),
    importantNotes: row.important_notes,
    powerAccessMethod: reverseChoice(powerFromDb, Number(row.power_access_method)),
    electricityNature: reverseChoice(electricityFromDb, Number(row.electricity_nature)),
    highVoltageAccessMethod: reverseChoice(highVoltageFromDb, Number(row.high_voltage_access_method)),
    tenKvLineAccessDistanceMeters: row.ten_kv_line_access_distance_meters === null ? null : Number(row.ten_kv_line_access_distance_meters),
    competitors: competitorList(row.competitors),
    surveyRecommendation: reverseChoice(surveyFromDb, Number(row.survey_recommendation)),
    chargingPileModel: row.charging_pile_model,
    chargingPileQuantity: row.charging_pile_quantity === null ? null : Number(row.charging_pile_quantity),
    transformerCapacity: row.transformer_capacity,
    transformerQuantity: row.transformer_quantity === null ? null : Number(row.transformer_quantity),
    preliminaryDesignNotes: row.preliminary_design_notes,
    createdByMemberId: row.created_by_member_id === "0" ? "1" : row.created_by_member_id,
    createdByMemberName: await memberName(pool, row.created_by_member_id === "0" ? "1" : row.created_by_member_id),
    updatedByMemberId: row.updated_by_member_id === "0" ? "1" : row.updated_by_member_id,
    updatedByMemberName: await memberName(pool, row.updated_by_member_id === "0" ? "1" : row.updated_by_member_id),
    ...imageFields,
    ...(await attachmentsPayload(pool, row.id)),
  };
}

export async function handleExplorationSites(pool: Pool, request: Request, suffix: string): Promise<Response> {
  const method = request.method;

  const list = /^\/?$/u.exec(suffix);
  if (list && method === "GET") return listSites(pool, request);
  if (list && method === "POST") return createSite(pool, request);

  const drafts = /^\/drafts$/u.exec(suffix);
  if (drafts && method === "POST") return createSite(pool, request);

  const filterOptions = /^\/filter-options$/u.exec(suffix);
  if (filterOptions && method === "GET") return filterOptionsResponse(pool);

  const map = /^\/map$/u.exec(suffix);
  if (map && method === "GET") return mapData(pool, request);

  const daily = /^\/daily$/u.exec(suffix);
  if (daily && method === "GET") return dailyList(pool, request);

  const exportAll = /^\/export$/u.exec(suffix);
  if (exportAll && method === "GET") return exportSites(pool, request);

  const bulk = /^\/bulk$/u.exec(suffix);
  if (bulk && method === "DELETE") return bulkDelete(pool, request);

  const boundarySnapshots = /^\/boundary-snapshots$/u.exec(suffix);
  if (boundarySnapshots && method === "POST") return snapshotUpload(request);
  const locationSnapshots = /^\/location-snapshots$/u.exec(suffix);
  if (locationSnapshots && method === "POST") return snapshotUpload(request);
  const nearbyStationSnapshots = /^\/nearby-station-snapshots$/u.exec(suffix);
  if (nearbyStationSnapshots && method === "POST") return snapshotUpload(request);
  const nearbyHotspotSnapshots = /^\/nearby-hotspot-area-snapshots$/u.exec(suffix);
  if (nearbyHotspotSnapshots && method === "POST") return snapshotUpload(request);

  const distanceSnapshots = /^\/distance-snapshots\/(highway-distance|arterial-road-distance)$/u.exec(suffix);
  if (distanceSnapshots && method === "POST") return snapshotUpload(request);

  const imageDelete = /^\/(\d+)\/images\/([^/]+)\/([^/]+)$/u.exec(suffix);
  if (imageDelete && method === "DELETE") return deleteImage(pool, imageDelete[1]!, decodeURIComponent(imageDelete[2]!), imageDelete[3]!, request);

  const attachmentDelete = /^\/(\d+)\/attachments\/([^/]+)\/([^/]+)$/u.exec(suffix);
  if (attachmentDelete && method === "DELETE") return deleteAttachment(pool, attachmentDelete[1]!, decodeURIComponent(attachmentDelete[2]!), attachmentDelete[3]!, request);

  const item = /^\/(\d+)$/u.exec(suffix);
  if (item) return siteItem(pool, item[1]!, request);

  const reanalyze = /^\/(\d+)\/reanalyze$/u.exec(suffix);
  if (reanalyze && method === "POST") return reanalyzeSite(pool, reanalyze[1]!);

  const report = /^\/(\d+)\/report\.docx$/u.exec(suffix);
  if (report && method === "GET") return wordReport(pool, report[1]!);

  const statusPatch = /^\/(\d+)\/status$/u.exec(suffix);
  if (statusPatch && method === "PATCH") return patchStatus(pool, statusPatch[1]!, request);

  const contractDate = /^\/(\d+)\/contract-date$/u.exec(suffix);
  if (contractDate && method === "PATCH") return patchContractDate(pool, contractDate[1]!, request);

  const construction = /^\/(\d+)\/construction$/u.exec(suffix);
  if (construction && method === "PATCH") return patchConstruction(pool, construction[1]!, request);

  const uploads = /^\/(\d+)\/uploads$/u.exec(suffix);
  if (uploads && method === "POST") return createUpload(pool, uploads[1]!, request);

  const uploadsComplete = /^\/(\d+)\/uploads\/complete$/u.exec(suffix);
  if (uploadsComplete && method === "POST") return completeUpload(pool, uploadsComplete[1]!, request);

  return notFound();
}

function siteFilters(request: Request): { conditions: string[]; params: unknown[] } {
  const url = new URL(request.url);
  const conditions: string[] = [];
  const params: unknown[] = [];
  const cursor = url.searchParams.get("cursor");
  if (cursor && validId(cursor)) {
    conditions.push("s.id > ?");
    params.push(cursor);
  }
  const status = url.searchParams.get("status");
  if (status && (explorationStatusCodes as readonly string[]).includes(status)) {
    conditions.push("s.status = ?");
    params.push(explorationStatusDbValue[status as ExplorationStatus]);
  }
  const team = url.searchParams.get("team");
  if (team) {
    conditions.push("s.exploration_team = ?");
    params.push(team);
  }
  const explorer = url.searchParams.get("explorer");
  if (explorer) {
    conditions.push("s.explorer_name = ?");
    params.push(explorer);
  }
  const city = url.searchParams.get("city");
  if (city) {
    conditions.push("s.province_city = ?");
    params.push(city);
  }
  const route = url.searchParams.get("route");
  if (route) {
    conditions.push("s.arterial_road_route_ref = ?");
    params.push(route);
  }
  const projectPrefix = url.searchParams.get("projectPrefix");
  if (projectPrefix) {
    conditions.push("s.project_name LIKE ?");
    params.push(`${projectPrefix}%`);
  }
  return { conditions, params };
}

async function listSites(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 50, 1), 100);
  const { conditions, params } = siteFilters(request);
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const rows = await queryRows<SiteRow>(
    pool,
    `SELECT * FROM site_exploration_site s${where} ORDER BY s.id ASC LIMIT ?`,
    [...params, limit + 1],
  );
  return jsonResponse({
    items: rows.slice(0, limit).map(listItemPayload),
    nextCursor: rows.length > limit ? rows[limit]!.id : null,
  });
}

async function filterOptionsResponse(pool: Pool): Promise<Response> {
  const rows = await queryRows<SiteRow>(pool, "SELECT * FROM site_exploration_site ORDER BY id ASC");
  const facet = <T extends string>(values: T[], all: T[]): { total: number; options: Array<{ value: T; count: number }> } => ({
    total: all.length,
    options: values.map((value) => ({ value, count: all.filter((entry) => entry === value).length })).filter(({ count }) => count > 0),
  });
  const statuses = rows.map(statusOf);
  const teams = rows.map((row) => row.exploration_team).filter(Boolean);
  const explorers = rows.map((row) => row.explorer_name).filter(Boolean);
  const cities = rows.map((row) => row.province_city).filter(Boolean);
  const routes = rows.map((row) => row.arterial_road_route_ref).filter((value): value is string => Boolean(value));
  return jsonResponse({
    canFilterByTeam: true,
    scopeTeamName: null,
    statuses: facet([...new Set(statuses)], statuses),
    teams: facet([...new Set(teams)], teams),
    explorers: facet([...new Set(explorers)], explorers),
    cities: facet([...new Set(cities)], cities),
    routes: facet([...new Set(routes)], routes),
  });
}

async function mapData(pool: Pool, request: Request): Promise<Response> {
  const { conditions, params } = siteFilters(request);
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const rows = await queryRows<SiteRow>(pool, `SELECT * FROM site_exploration_site s${where} ORDER BY s.id ASC`, params);
  const features: Record<string, unknown>[] = [];
  let located = 0;
  let unlocated = 0;
  const byStatus: Record<string, number> = Object.fromEntries(explorationStatusCodes.map((status) => [status, 0]));
  for (const row of rows) {
    const status = statusOf(row);
    byStatus[status] += 1;
    const longitude = Number(row.longitude);
    const latitude = Number(row.latitude);
    if (longitude === 0 || latitude === 0) {
      unlocated += 1;
      continue;
    }
    located += 1;
    const properties = {
      status,
      explorerName: row.explorer_name,
      explorationDate: row.exploration_date === "" ? new Date().toISOString().slice(0, 10) : row.exploration_date,
      overallScore: Number(row.overall_score),
      selectionRecommendation: recommendationByDbValue[Number(row.selection_recommendation)] ?? "",
      hasAnalysis: Number(row.overall_score_available) === 1,
      projectName: row.project_name,
      provinceCity: row.province_city,
      countyDistrict: row.county_district,
      locationAddress: row.location_address,
      highwayDistanceMeters: Number(row.highway_distance_meters),
      siteAreaSquareMeters: Number(row.site_area_square_meters),
      trafficVisitCount: null,
      arterialRoadDistanceMeters: Number(row.arterial_road_distance_meters),
      nearestRoadName: row.arterial_road_route_ref && row.arterial_road_route_ref !== "" ? row.arterial_road_route_ref : null,
      uniqueTrafficVehicleCount: null,
      nearbyChargingStationCount: Math.min(jsonArray(row.nearby_truck_charging_stations).length, 20),
      nearbyHotspotAreaCount: Math.min(jsonArray(row.nearby_hotspot_areas).length, 100),
    };
    features.push({
      type: "Feature",
      id: row.id,
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties,
    });
    if (row.site_boundary_geo_json && row.site_boundary_geo_json.trim() !== "") {
      try {
        const boundary = JSON.parse(row.site_boundary_geo_json) as { geometry: unknown };
        features.push({
          type: "Feature",
          id: `boundary:${row.id}`,
          geometry: boundary.geometry,
          properties,
        });
      } catch {
        // Ignore malformed stored boundaries.
      }
    }
  }
  return jsonResponse({
    scopeTeamName: null,
    data: { type: "FeatureCollection", features },
    summary: { total: rows.length, located, unlocated, byStatus },
  });
}

async function dailyList(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "100"), 1), 100);
  const cursor = url.searchParams.get("cursor");
  const conditions = ["s.exploration_date = ?"];
  const params: unknown[] = [date];
  if (cursor && validId(cursor)) {
    conditions.push("s.id > ?");
    params.push(cursor);
  }
  const rows = await queryRows<SiteRow>(
    pool,
    `SELECT * FROM site_exploration_site s WHERE ${conditions.join(" AND ")} ORDER BY s.id ASC LIMIT ?`,
    [...params, limit + 1],
  );
  return jsonResponse({
    items: rows.slice(0, limit).map((row) => ({
      id: row.id,
      projectName: row.project_name,
      provinceCity: row.province_city,
      countyDistrict: row.county_district,
      locationSnapshot: jsonImage(parseJsonColumn(row.location_snapshot, null)),
      siteBoundarySnapshot: jsonImage(parseJsonColumn(row.site_boundary_snapshot, null)),
      explorationDate: row.exploration_date,
      overallScore: Number(row.overall_score),
      selectionRecommendation: recommendationByDbValue[Number(row.selection_recommendation)] ?? "",
      updatedAt: Number(row.updated_at),
    })),
    nextCursor: rows.length > limit ? rows[limit]!.id : null,
  });
}

async function exportSites(pool: Pool, request: Request): Promise<Response> {
  const { conditions, params } = siteFilters(request);
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const rows = await queryRows<SiteRow>(pool, `SELECT * FROM site_exploration_site s${where} ORDER BY s.id ASC LIMIT 5000`, params);
  const statusLabels: Record<string, string> = {
    draft: "草稿", completed: "已勘探", signed: "签约完成", "under-construction": "建设中", operating: "运营中",
  };
  const xlsx = buildXlsx(rows.map((row) => ({
    id: row.id,
    projectName: row.project_name,
    provinceCity: row.province_city,
    countyDistrict: row.county_district,
    status: statusLabels[statusOf(row)] ?? statusOf(row),
    explorerName: row.explorer_name,
    explorationDate: row.exploration_date,
    overallScore: Number(row.overall_score),
    selectionRecommendation: recommendationByDbValue[Number(row.selection_recommendation)] ?? "",
    updatedAt: Number(row.updated_at),
  })));
  return new Response(xlsx, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent("勘探站点.xlsx")}`,
    },
  });
}

async function wordReport(pool: Pool, siteId: string): Promise<Response> {
  const row = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!row) return notFound("site_not_found");
  const record = await recordPayload(pool, row);
  const paragraphs = [
    `${String(record.projectName)} 勘探报告`,
    "",
    `所在地：${String(record.provinceCity)} ${String(record.countyDistrict)}`,
    `详细地址：${String(record.locationAddress)}`,
    `勘探人：${String(record.explorerName)}`,
    `勘探日期：${String(record.explorationDate)}`,
    `综合得分：${String(record.overallScore)}`,
    `选址建议：${String(record.selectionRecommendation)}`,
    `场地面积（平方米）：${String(record.siteAreaSquareMeters)}`,
    `距高速口距离（米）：${String(record.highwayDistanceMeters)}`,
    `距国省干道距离（米）：${String(record.arterialRoadDistanceMeters)}`,
    "",
    "本报告由本地开发环境基于 MySQL 勘探数据自动生成，不依赖云端服务。",
  ];
  const docx = buildDocx(paragraphs);
  return new Response(docx, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent("勘探报告.docx")}`,
    },
  });
}

async function siteItem(pool: Pool, siteId: string, request: Request): Promise<Response> {
  const row = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!row) return notFound("site_not_found");
  if (request.method === "GET") return jsonResponse(await recordPayload(pool, row));
  if (request.method === "PATCH") return patchSite(pool, row, request);
  if (request.method === "DELETE") {
    await pool.query("DELETE FROM site_exploration_attachment WHERE site_id = ?", [siteId]);
    await pool.query("DELETE FROM site_exploration_construction WHERE site_id = ?", [siteId]);
    await pool.query("DELETE FROM site_exploration_site WHERE id = ?", [siteId]);
    return new Response(null, { status: 204 });
  }
  return notFound();
}

async function bulkDelete(pool: Pool, request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!isRecord(body) || !Array.isArray(body.ids) || body.ids.length === 0 || !body.ids.every((id) => validId(id))) {
    return errorResponse("invalid_request");
  }
  const ids = body.ids as string[];
  const placeholders = ids.map(() => "?").join(",");
  await pool.query(`DELETE FROM site_exploration_attachment WHERE site_id IN (${placeholders})`, ids);
  await pool.query(`DELETE FROM site_exploration_construction WHERE site_id IN (${placeholders})`, ids);
  const result = await pool.query(`DELETE FROM site_exploration_site WHERE id IN (${placeholders})`, ids);
  return jsonResponse({ deletedCount: (result[0] as { affectedRows: number }).affectedRows });
}

async function reanalyzeSite(pool: Pool, siteId: string): Promise<Response> {
  const row = await queryOne<SiteRow>(pool, "SELECT id FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!row) return notFound("site_not_found");
  const result = await startLocalAnalysisTask(pool, siteId);
  if (!result) return notFound("site_not_found");
  return jsonResponse({ siteId, taskId: result.taskId });
}

async function patchStatus(pool: Pool, siteId: string, request: Request): Promise<Response> {
  const row = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!row) return notFound("site_not_found");
  const body = await readJsonBody(request);
  if (!isRecord(body) || typeof body.updatedAt !== "number" || (body.status !== "draft" && body.status !== "completed")) {
    return errorResponse("invalid_request");
  }
  if (body.updatedAt !== Number(row.updated_at)) return errorResponse("site_conflict", 409);
  await pool.query(
    "UPDATE site_exploration_site SET status = ?, updated_by_member_id = 1, updated_at = UNIX_TIMESTAMP() WHERE id = ?",
    [explorationStatusDbValue[body.status], siteId],
  );
  const updated = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!updated) return notFound("site_not_found");
  return jsonResponse(await recordPayload(pool, updated));
}

async function patchContractDate(pool: Pool, siteId: string, request: Request): Promise<Response> {
  const row = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!row) return notFound("site_not_found");
  const body = await readJsonBody(request);
  if (!isRecord(body) || typeof body.updatedAt !== "number" || typeof body.contractDate !== "string") {
    return errorResponse("invalid_request");
  }
  if (body.updatedAt !== Number(row.updated_at)) return errorResponse("site_conflict", 409);
  await pool.query(
    "UPDATE site_exploration_site SET contract_date = ?, updated_by_member_id = 1, updated_at = UNIX_TIMESTAMP() WHERE id = ?",
    [body.contractDate, siteId],
  );
  const updated = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!updated) return notFound("site_not_found");
  return jsonResponse(await recordPayload(pool, updated));
}

async function patchConstruction(pool: Pool, siteId: string, request: Request): Promise<Response> {
  const row = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!row) return notFound("site_not_found");
  const body = await readJsonBody(request);
  if (!isRecord(body) || typeof body.updatedAt !== "number" || !isRecord(body.construction)) {
    return errorResponse("invalid_request");
  }
  if (body.updatedAt !== Number(row.updated_at)) return errorResponse("site_conflict", 409);
  const construction = body.construction as Record<string, unknown>;
  const statusMap: Readonly<Record<string, number>> = { "not-started": 1, "under-construction": 2, completed: 3 };
  const provisionMap: Readonly<Record<string, number>> = { no: 1, yes: 2 };
  const now = nowSeconds();
  await pool.query(
    `INSERT INTO site_exploration_construction
       (site_id, construction_status, construction_entity, station_type, driver_home_provision,
        charging_equipment_capacity_kva, battery_swap_equipment_capacity_kva, photovoltaic_capacity_kw,
        energy_storage_capacity_kwh, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       construction_status = VALUES(construction_status), construction_entity = VALUES(construction_entity),
       station_type = VALUES(station_type), driver_home_provision = VALUES(driver_home_provision),
       charging_equipment_capacity_kva = VALUES(charging_equipment_capacity_kva),
       battery_swap_equipment_capacity_kva = VALUES(battery_swap_equipment_capacity_kva),
       photovoltaic_capacity_kw = VALUES(photovoltaic_capacity_kw),
       energy_storage_capacity_kwh = VALUES(energy_storage_capacity_kwh), updated_at = VALUES(updated_at)`,
    [
      siteId,
      statusMap[String(construction.constructionStatus)] ?? 0,
      String(construction.constructionEntity ?? ""),
      String(construction.stationType ?? ""),
      provisionMap[String(construction.driverHomeProvision)] ?? 0,
      Number(construction.chargingEquipmentCapacityKva ?? 0),
      Number(construction.batterySwapEquipmentCapacityKva ?? 0),
      Number(construction.photovoltaicCapacityKw ?? 0),
      Number(construction.energyStorageCapacityKwh ?? 0),
      now,
      now,
    ],
  );
  await pool.query("UPDATE site_exploration_site SET updated_by_member_id = 1, updated_at = UNIX_TIMESTAMP() WHERE id = ?", [siteId]);
  const updated = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!updated) return notFound("site_not_found");
  return jsonResponse(await recordPayload(pool, updated));
}

async function createSite(pool: Pool, request: Request): Promise<Response> {
  const input = await readJsonBody(request);
  if (!isRecord(input)) return errorResponse("invalid_request");
  const now = nowSeconds();
  const columns = siteInsertColumns();
  const values = siteInsertValues(input, now);
  const result = await pool.query(`INSERT INTO site_exploration_site (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`, values);
  const siteId = String((result[0] as { insertId: number }).insertId);
  const row = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!row) return notFound("site_not_found");
  return jsonResponse(await recordPayload(pool, row), 201);
}

async function patchSite(pool: Pool, row: SiteRow, request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!isRecord(body) || typeof body.updatedAt !== "number" || !isRecord(body.site)) {
    return errorResponse("invalid_request");
  }
  if (body.updatedAt !== Number(row.updated_at)) return errorResponse("site_conflict", 409);
  const input = body.site as Record<string, unknown>;
  const columns = siteInsertColumns().filter((column) => column !== "status");
  const values = siteInsertValues(input, nowSeconds()).slice(1);
  await pool.query(
    `UPDATE site_exploration_site SET ${columns.map((column) => `${column} = ?`).join(", ")} WHERE id = ?`,
    [...values, row.id],
  );
  const updated = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [row.id]);
  if (!updated) return notFound("site_not_found");
  return jsonResponse(await recordPayload(pool, updated));
}

function siteInsertColumns(): string[] {
  return [
    "status", "explorer_name", "exploration_team", "exploration_team_id", "exploration_date",
    "project_name", "contact_name", "contact_phone_encrypted", "province_city", "county_district",
    "location_address", "longitude", "latitude", "location_snapshot",
    "highway_distance_meters", "highway_distance_geo_json", "highway_distance_snapshot",
    "highway_entrance", "highway_routes",
    "site_area_square_meters", "site_boundary_geo_json", "site_boundary_snapshot",
    "arterial_road_distance_meters", "arterial_road_distance_geo_json", "arterial_road_distance_snapshot",
    "arterial_road_traffic_geo_json",
    "access_convenience",
    "land_qualified", "land_type", "land_type_description", "has_land_proof", "has_lease_agreement",
    "has_other_structures", "ground_hardening", "terrain_condition",
    "capacity_description", "transport_capacity_description",
    "nearby_truck_charging_stations", "nearby_truck_charging_station_snapshot",
    "nearby_task_stations", "nearby_task_station_snapshot",
    "nearby_hotspot_areas", "nearby_hotspot_area_snapshot",
    "cooperation_mode", "cooperation_terms", "site_maturity", "important_notes",
    "contract_date", "created_by_member_id", "updated_by_member_id", "created_at", "updated_at",
    "power_access_method", "electricity_nature", "high_voltage_access_method",
    "ten_kv_line_access_distance_meters", "survey_recommendation",
    "charging_pile_model", "charging_pile_quantity", "transformer_capacity", "transformer_quantity",
    "preliminary_design_notes", "competitors",
  ];
}

function jsonString(value: unknown): string {
  if (value === null || value === undefined) return "[]";
  return JSON.stringify(value);
}

function optionalJsonString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return JSON.stringify(value);
}

function siteInsertValues(input: Record<string, unknown>, now: number): unknown[] {
  const number = (value: unknown, fallback = 0): number => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
  const string = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
  const boolean = (value: unknown): number => (value === true ? 1 : 0);
  return [
    1,
    "开发管理员",
    "",
    0,
    new Date().toISOString().slice(0, 10),
    string(input.projectName),
    string(input.contactName),
    string(input.contactPhone),
    string(input.provinceCity),
    string(input.countyDistrict),
    string(input.locationAddress),
    number(input.longitude),
    number(input.latitude),
    optionalJsonString(input.locationSnapshot),
    number(input.highwayDistanceMeters),
    optionalJsonString(input.highwayDistanceGeoJson),
    optionalJsonString(input.highwayDistanceSnapshot),
    input.highwayEntrance ? JSON.stringify(input.highwayEntrance) : "{}",
    Array.isArray(input.highwayRoutes) ? JSON.stringify(input.highwayRoutes) : "[]",
    number(input.siteAreaSquareMeters),
    optionalJsonString(input.siteBoundaryGeoJson),
    optionalJsonString(input.siteBoundarySnapshot),
    number(input.arterialRoadDistanceMeters),
    optionalJsonString(input.arterialRoadDistanceGeoJson),
    optionalJsonString(input.arterialRoadDistanceSnapshot),
    optionalJsonString(input.arterialRoadTrafficGeoJson),
    choice(accessConvenienceToDb, input.accessConvenience, 0),
    boolean(input.landQualified),
    choice(landTypeToDb, input.landType, 0),
    string(input.landTypeDescription),
    boolean(input.hasLandProof),
    boolean(input.hasLeaseAgreement),
    boolean(input.hasOtherStructures),
    choice(hardeningToDb, input.groundHardening, 0),
    choice(terrainToDb, input.terrainCondition, 0),
    string(input.capacityDescription),
    string(input.transportCapacityDescription),
    Array.isArray(input.nearbyTruckChargingStations) ? JSON.stringify(input.nearbyTruckChargingStations) : "[]",
    optionalJsonString(input.nearbyTruckChargingStationSnapshot),
    Array.isArray(input.nearbyTaskStations) ? JSON.stringify(input.nearbyTaskStations) : "[]",
    optionalJsonString(input.nearbyTaskStationSnapshot),
    Array.isArray(input.nearbyHotspotAreas) ? JSON.stringify(input.nearbyHotspotAreas) : "[]",
    optionalJsonString(input.nearbyHotspotAreaSnapshot),
    choice(cooperationToDb, input.cooperationMode, 0),
    string(input.cooperationTerms),
    choice(maturityToDb, input.siteMaturity, 0),
    string(input.importantNotes),
    string(input.contractDate ?? ""),
    1,
    1,
    now,
    now,
    choice(powerToDb, input.powerAccessMethod, 0),
    choice(electricityToDb, input.electricityNature, 0),
    choice(highVoltageToDb, input.highVoltageAccessMethod, 0),
    input.tenKvLineAccessDistanceMeters === null || input.tenKvLineAccessDistanceMeters === undefined
      ? null
      : number(input.tenKvLineAccessDistanceMeters),
    choice(surveyToDb, input.surveyRecommendation, 0),
    string(input.chargingPileModel),
    input.chargingPileQuantity === null || input.chargingPileQuantity === undefined ? null : number(input.chargingPileQuantity),
    string(input.transformerCapacity),
    input.transformerQuantity === null || input.transformerQuantity === undefined ? null : number(input.transformerQuantity),
    string(input.preliminaryDesignNotes),
    Array.isArray(input.competitors) ? JSON.stringify(input.competitors) : "[]",
  ];
}

async function createUpload(pool: Pool, siteId: string, request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!isRecord(body) || (body.kind !== "image" && body.kind !== "attachment")
    || typeof body.field !== "string" || typeof body.originalName !== "string"
    || typeof body.contentType !== "string" || typeof body.size !== "number") {
    return errorResponse("invalid_request");
  }
  const session = await createUploadSession(pool, {
    siteId,
    kind: body.kind,
    field: body.field,
    originalName: body.originalName,
    contentType: body.contentType,
    size: body.size,
    updatedAt: typeof body.updatedAt === "number" ? body.updatedAt : nowSeconds(),
  });
  if (!session) return notFound("site_not_found");
  return jsonResponse(session, 201);
}

async function completeUpload(pool: Pool, siteId: string, request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!isRecord(body) || typeof body.ticket !== "string") return errorResponse("invalid_request");
  const ticket = await findStoredTicket(pool, body.ticket);
  if (!ticket || String(ticket.site_id) !== siteId) return notFound("upload_ticket_not_found");

  if (ticket.kind === "image") {
    const column = imageColumns[ticket.field];
    if (!column) return errorResponse("invalid_request");
    const current = jsonArray(parseJsonColumn(
      (await queryOne<RowDataPacket>(pool, `SELECT ${column} AS value_ FROM site_exploration_site WHERE id = ?`, [siteId]))?.value_ ?? [],
      [],
    ));
    current.push({
      objectKey: ticket.object_key,
      url: localObjectUrl(ticket.object_key),
      originalName: ticket.original_name,
      contentType: ticket.content_type,
      size: Number(ticket.file_size),
    });
    await pool.query(`UPDATE site_exploration_site SET ${column} = ?, updated_by_member_id = 1, updated_at = UNIX_TIMESTAMP() WHERE id = ?`, [JSON.stringify(current), siteId]);
  } else {
    const category = attachmentCategories[ticket.field];
    if (!category) return errorResponse("invalid_request");
    const now = nowSeconds();
    await pool.query(
      `INSERT INTO site_exploration_attachment
         (site_id, category, object_key, stored_url, original_name, content_type, file_size, created_by_member_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [siteId, category, ticket.object_key, localObjectUrl(ticket.object_key), ticket.original_name, ticket.content_type, ticket.file_size, now, now],
    );
    await pool.query("UPDATE site_exploration_site SET updated_by_member_id = 1, updated_at = UNIX_TIMESTAMP() WHERE id = ?", [siteId]);
  }
  await markTicketCompleted(pool, body.ticket);
  const row = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!row) return notFound("site_not_found");
  return jsonResponse(await recordPayload(pool, row));
}

function decodeBase64UrlToken(token: string): string | null {
  try {
    const base64 = token.replace(/-/gu, "+").replace(/_/gu, "/");
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

async function siteRowOrConflict(pool: Pool, siteId: string, request: Request): Promise<SiteRow | Response> {
  const row = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!row) return notFound("site_not_found");
  const url = new URL(request.url);
  const updatedAt = url.searchParams.get("updatedAt");
  if (updatedAt !== null && updatedAt !== "" && Number(updatedAt) !== Number(row.updated_at)) {
    return errorResponse("site_conflict", 409);
  }
  return row;
}

async function deleteImage(pool: Pool, siteId: string, field: string, token: string, request: Request): Promise<Response> {
  const column = imageColumns[field];
  if (!column) return errorResponse("invalid_exploration_image_field");
  const objectKey = decodeBase64UrlToken(token);
  if (!objectKey) return errorResponse("invalid_request");
  const row = await siteRowOrConflict(pool, siteId, request);
  if (row instanceof Response) return row;
  const current = jsonArray(parseJsonColumn(row[column as keyof SiteRow], []));
  const next = current.filter((item) => !isRecord(item) || item.objectKey !== objectKey);
  await pool.query(`UPDATE site_exploration_site SET ${column} = ?, updated_by_member_id = 1, updated_at = UNIX_TIMESTAMP() WHERE id = ?`, [JSON.stringify(next), siteId]);
  const updated = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!updated) return notFound("site_not_found");
  return jsonResponse(await recordPayload(pool, updated));
}

async function deleteAttachment(pool: Pool, siteId: string, field: string, token: string, request: Request): Promise<Response> {
  const category = attachmentCategories[field];
  if (category === undefined) return errorResponse("invalid_exploration_attachment_field");
  const objectKey = decodeBase64UrlToken(token);
  if (!objectKey) return errorResponse("invalid_request");
  const row = await siteRowOrConflict(pool, siteId, request);
  if (row instanceof Response) return row;
  await pool.query(
    "DELETE FROM site_exploration_attachment WHERE site_id = ? AND category = ? AND object_key = ?",
    [siteId, category, objectKey],
  );
  await pool.query("UPDATE site_exploration_site SET updated_by_member_id = 1, updated_at = UNIX_TIMESTAMP() WHERE id = ?", [siteId]);
  const updated = await queryOne<SiteRow>(pool, "SELECT * FROM site_exploration_site WHERE id = ? LIMIT 1", [siteId]);
  if (!updated) return notFound("site_not_found");
  return jsonResponse(await recordPayload(pool, updated));
}

async function snapshotUpload(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData() as FormData;
  } catch {
    return errorResponse("invalid_request");
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return errorResponse("invalid_request");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = file.type || "image/jpeg";
  const image = storeSnapshotFile(file.name, contentType, bytes);
  return jsonResponse(image, 201);
}
