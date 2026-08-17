import type { Pool, RowDataPacket } from "mysql2/promise";
import { queryRows } from "./database";
import { errorResponse, isRecord, jsonResponse, notFound, readJsonBody, validId } from "./respond";

interface StationRow extends RowDataPacket {
  id: string;
  sequence_number: number;
  station_name: string;
  provincial_city: string;
  county_district: string;
  route_name: string;
  specific_location: string;
  facility_type: string;
  site_type: number;
  status: number;
  status_description: string;
  longitude: string;
  latitude: string;
  daily_truck_traffic_2025: number;
  daily_medium_heavy_truck_traffic_2025: number;
  remark: string;
  created_at: number;
  updated_at: number;
}

const stationStatus = (value: number): "incomplete" | "completed" => (value === 1 ? "completed" : "incomplete");

function stationPayload(row: StationRow): Record<string, unknown> {
  return {
    id: row.id,
    sequenceNumber: Number(row.sequence_number),
    stationName: row.station_name,
    provincialCity: row.provincial_city,
    countyDistrict: row.county_district,
    routeName: row.route_name,
    specificLocation: row.specific_location,
    facilityType: row.facility_type,
    siteType: "planned",
    status: stationStatus(Number(row.status)),
    statusDescription: row.status_description,
    dailyTruckTraffic2025: Number(row.daily_truck_traffic_2025),
    dailyMediumHeavyTruckTraffic2025: Number(row.daily_medium_heavy_truck_traffic_2025),
    remark: row.remark,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export async function handleInventoryStations(pool: Pool, request: Request, suffix: string): Promise<Response> {
  const list = /^\/?$/u.exec(suffix);
  if (list && request.method === "GET") return listStations(pool, request);

  const map = /^\/map$/u.exec(suffix);
  if (map && request.method === "GET") return mapData(pool);

  const nearby = /^\/nearby$/u.exec(suffix);
  if (nearby && request.method === "GET") return nearbyStations(pool, request);

  const bulk = /^\/bulk$/u.exec(suffix);
  if (bulk && request.method === "PATCH") return bulkStatus(pool, request);
  if (bulk && request.method === "DELETE") return bulkDelete(pool, request);

  const item = /^\/(\d+)$/u.exec(suffix);
  if (item && request.method === "GET") {
    const row = await queryRows<StationRow>(
      pool,
      `SELECT * FROM site_inventory_station WHERE id = ? LIMIT 1`,
      [item[1]!],
    );
    if (row.length === 0) return notFound();
    return jsonResponse(stationPayload(row[0]!));
  }

  return notFound();
}

async function listStations(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "500"), 1), 500);
  const cursor = url.searchParams.get("cursor");
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (cursor && validId(cursor)) {
    conditions.push("id > ?");
    params.push(cursor);
  }
  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const rows = await queryRows<StationRow>(
    pool,
    `SELECT * FROM site_inventory_station${where} ORDER BY id ASC LIMIT ?`,
    [...params, limit + 1],
  );
  return jsonResponse({
    items: rows.slice(0, limit).map(stationPayload),
    nextCursor: rows.length > limit ? rows[limit]!.id : null,
  });
}

async function mapData(pool: Pool): Promise<Response> {
  const rows = await queryRows<StationRow>(pool, "SELECT * FROM site_inventory_station ORDER BY id ASC");
  const locatedRows = rows.filter((row) => Number(row.longitude) !== 0 || Number(row.latitude) !== 0);
  const maxTrafficVolume = Math.max(0, ...locatedRows.map((row) => Number(row.daily_truck_traffic_2025)));
  const features = [];
  let located = 0;
  let unlocated = 0;
  const byLayer = { "planned-incomplete": 0, "planned-completed": 0 };
  for (const row of rows) {
    const longitude = Number(row.longitude);
    const latitude = Number(row.latitude);
    const status = stationStatus(Number(row.status));
    const layerCategory = status === "completed" ? "planned-completed" : "planned-incomplete";
    byLayer[layerCategory] += 1;
    if (longitude === 0 || latitude === 0) {
      unlocated += 1;
      continue;
    }
    located += 1;
    features.push({
      type: "Feature",
      id: row.id,
      geometry: { type: "Point", coordinates: [longitude, latitude] },
      properties: {
        sequenceNumber: Number(row.sequence_number),
        stationName: row.station_name,
        provincialCity: row.provincial_city,
        countyDistrict: row.county_district,
        routeName: row.route_name,
        specificLocation: row.specific_location,
        siteType: "planned",
        status,
        statusDescription: row.status_description,
        layerCategory,
        dailyTruckTraffic2025: Number(row.daily_truck_traffic_2025),
        trafficWeight: maxTrafficVolume === 0 ? 0 : Number(row.daily_truck_traffic_2025) / maxTrafficVolume,
      },
    });
  }
  return jsonResponse({
    data: { type: "FeatureCollection", features },
    summary: { total: rows.length, located, unlocated, byLayer },
  });
}

async function nearbyStations(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const longitude = Number(url.searchParams.get("longitude"));
  const latitude = Number(url.searchParams.get("latitude"));
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return errorResponse("invalid_request");

  const rows = await queryRows<StationRow>(pool, "SELECT * FROM site_inventory_station");
  const items = rows
    .filter((row) => Number(row.longitude) !== 0 && Number(row.latitude) !== 0)
    .map((row) => {
      const stationLongitude = Number(row.longitude);
      const stationLatitude = Number(row.latitude);
      const distanceMeters = Math.round(
        haversineMeters(longitude, latitude, stationLongitude, stationLatitude),
      );
      return { row, distanceMeters };
    })
    .filter(({ distanceMeters }) => distanceMeters <= 5_000)
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, 100)
    .map(({ row, distanceMeters }) => ({
      id: row.id,
      sequenceNumber: Number(row.sequence_number),
      stationName: row.station_name,
      provincialCity: row.provincial_city,
      countyDistrict: row.county_district,
      specificLocation: row.specific_location,
      status: stationStatus(Number(row.status)),
      longitude: Number(row.longitude),
      latitude: Number(row.latitude),
      distanceMeters,
    }));
  return jsonResponse({ items });
}

async function readBulkIds(body: unknown): Promise<{ ids: string[]; status?: string } | null> {
  if (!isRecord(body) || !Array.isArray(body.ids) || body.ids.length === 0
    || !body.ids.every((id) => validId(id))) return null;
  const ids = body.ids as string[];
  if ("status" in body && !["incomplete", "completed"].includes(String(body.status))) return null;
  return { ids, status: body.status as string | undefined };
}

async function bulkStatus(pool: Pool, request: Request): Promise<Response> {
  const input = await readBulkIds(await readJsonBody(request));
  if (!input || !input.status) return errorResponse("invalid_request");
  const placeholders = input.ids.map(() => "?").join(",");
  const result = await pool.query(
    `UPDATE site_inventory_station SET status = ?, updated_at = UNIX_TIMESTAMP() WHERE id IN (${placeholders})`,
    [input.status === "completed" ? 1 : 0, ...input.ids],
  );
  return jsonResponse({ updatedCount: (result[0] as { affectedRows: number }).affectedRows });
}

async function bulkDelete(pool: Pool, request: Request): Promise<Response> {
  const input = await readBulkIds(await readJsonBody(request));
  if (!input) return errorResponse("invalid_request");
  const placeholders = input.ids.map(() => "?").join(",");
  const result = await pool.query(`DELETE FROM site_inventory_station WHERE id IN (${placeholders})`, input.ids);
  return jsonResponse({ deletedCount: (result[0] as { affectedRows: number }).affectedRows });
}

function haversineMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const deltaLatitude = toRadians(lat2 - lat1);
  const deltaLongitude = toRadians(lng2 - lng1);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));
}
