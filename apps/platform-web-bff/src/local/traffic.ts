import type { Pool, RowDataPacket } from "mysql2/promise";
import { queryOne, queryRows } from "./database";
import { encodeRgbaPng } from "./png";
import { jsonResponse } from "./respond";
import { matchingAlgorithmVersion, roadNetworkVersion } from "./constants";

interface GridRow extends RowDataPacket {
  cell_x: number;
  cell_y: number;
  average_vehicle_count: number;
  new_energy_count: number;
}

interface SegmentRow extends RowDataPacket {
  id: string;
  route_key: string;
  road_level: string;
  ref: string;
  name: string;
  segment_id: string;
  chain_index: number;
  segment_index: number;
  start_km: number;
  end_km: number;
  geo_json: string;
  forward_visit_count: number;
  reverse_visit_count: number;
  unknown_direction_visit_count: number;
  visit_count: number;
  unique_vehicle_count: number;
  new_energy_visit_count: number;
  new_energy_unique_vehicle_count: number;
}

const gridOriginLongitude = 110.5;
const gridOriginLatitude = 31.0;
const gridCellDegrees = 0.1;
const gridWidth = 65;
const gridHeight = 60;

const corridors: Array<[number, number, number, number]> = [
  [113.6, 34.8, 114.3, 34.4], // 郑州-许昌
  [113.2, 35.2, 114.0, 35.0], // 新乡-郑州
  [114.3, 34.4, 114.8, 33.8], // 许昌-漯河
  [112.4, 34.6, 113.2, 34.3], // 洛阳-郑州
  [114.6, 33.6, 114.9, 33.2], // 漯河-驻马店
];

function cellOf(longitude: number, latitude: number): { x: number; y: number } | null {
  const x = Math.floor((longitude - gridOriginLongitude) / gridCellDegrees);
  const y = Math.floor((latitude - gridOriginLatitude) / gridCellDegrees);
  if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) return null;
  return { x, y };
}

function hashNoise(x: number, y: number): number {
  let value = Math.imul(x + 31, 1_103_515_245) ^ Math.imul(y + 17, 1_237_891_211);
  value = Math.imul(value ^ (value >>> 15), 0x85ebca6b);
  value ^= value >>> 13;
  return Math.abs(value) / 0x7fffffff;
}

function corridorBoost(x: number, y: number): number {
  const longitude = gridOriginLongitude + (x + 0.5) * gridCellDegrees;
  const latitude = gridOriginLatitude + (y + 0.5) * gridCellDegrees;
  let boost = 0;
  for (const [ax, ay, bx, by] of corridors) {
    const distance = pointToSegmentDistanceMeters(longitude, latitude, ax, ay, bx, by);
    if (distance < 30_000) boost = Math.max(boost, Math.round(4_200 * (1 - distance / 30_000)));
  }
  return boost;
}

function syntheticTraffic(longitude: number, latitude: number): { total: number; newEnergy: number } {
  const cell = cellOf(longitude, latitude);
  const x = cell?.x ?? 0;
  const y = cell?.y ?? 0;
  const base = 220 + Math.round(hashNoise(x, y) * 900);
  const boosted = Math.min(base + corridorBoost(x, y), 7_500);
  const newEnergy = Math.round(boosted * (0.1 + hashNoise(y, x) * 0.1));
  return { total: boosted, newEnergy };
}

let gridCache: GridRow[] | null = null;

async function loadGrid(pool: Pool): Promise<GridRow[]> {
  if (gridCache) return gridCache;
  const rows = await queryRows<GridRow>(pool, "SELECT cell_x, cell_y, average_vehicle_count, new_energy_count FROM site_traffic_grid_cell");
  if (rows.length > 0) {
    gridCache = rows;
    return rows;
  }
  const values: unknown[][] = [];
  for (let y = 0; y < gridHeight; y += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const longitude = gridOriginLongitude + (x + 0.5) * gridCellDegrees;
      const latitude = gridOriginLatitude + (y + 0.5) * gridCellDegrees;
      const { total, newEnergy } = syntheticTraffic(longitude, latitude);
      values.push([x, y, total, newEnergy]);
    }
  }
  const chunkSize = 400;
  for (let start = 0; start < values.length; start += chunkSize) {
    const chunk = values.slice(start, start + chunkSize);
    const placeholders = chunk.map(() => "(?, ?, ?, ?)").join(",");
    await pool.query(
      `INSERT INTO site_traffic_grid_cell (cell_x, cell_y, average_vehicle_count, new_energy_count) VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE average_vehicle_count = VALUES(average_vehicle_count), new_energy_count = VALUES(new_energy_count)`,
      chunk.flat(),
    );
  }
  gridCache = await queryRows<GridRow>(pool, "SELECT cell_x, cell_y, average_vehicle_count, new_energy_count FROM site_traffic_grid_cell");
  return gridCache ?? [];
}

function sampleGrid(grid: GridRow[], longitude: number, latitude: number): number {
  const cell = cellOf(longitude, latitude);
  if (!cell) return 0;
  const row = grid.find((entry) => Number(entry.cell_x) === cell.x && Number(entry.cell_y) === cell.y);
  return row ? Number(row.average_vehicle_count) : 0;
}

function tileLngLat(z: number, x: number, y: number, pixelX: number, pixelY: number): [number, number] {
  const tileCount = 2 ** z;
  const longitude = ((x + pixelX / 256) / tileCount) * 360 - 180;
  const latitudeRadians = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + pixelY / 256) / tileCount)));
  return [longitude, (latitudeRadians * 180) / Math.PI];
}

export async function handleTraffic(pool: Pool, request: Request, suffix: string): Promise<Response> {
  const heatmap = /^\/heatmap\/daily-average$/u.exec(suffix);
  if (heatmap && request.method === "GET") return heatmapMeta(request);

  const tile = /^\/tiles\/daily-average\/(\d{8}-\d{8})\/v(\d+)\/(\d+)\/(\d+)\/(\d+)\.webp$/u.exec(suffix);
  if (tile && request.method === "GET") {
    return heatmapTile(pool, Number(tile[3]), Number(tile[4]), Number(tile[5]));
  }

  const point = /^\/daily-average-point$/u.exec(suffix);
  if (point && request.method === "GET") return dailyAveragePoint(pool, request);

  const segment = /^\/nearest-route-segment$/u.exec(suffix);
  if (segment && request.method === "GET") return nearestRouteSegment(pool, request);

  return jsonResponse({ error: "not_found" }, 404);
}

function heatmapMeta(request: Request): Response {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("startDate") ?? "2026-01-15";
  const endDate = url.searchParams.get("endDate") ?? "2026-01-21";
  const range = `${startDate.replaceAll("-", "")}-${endDate.replaceAll("-", "")}`;
  return jsonResponse({
    startDate,
    endDate,
    productVersion: 1,
    status: "ready",
    tilePath: `/api/intelligent-site-selection/traffic/tiles/daily-average/${range}/v1/{z}/{x}/{y}.webp`,
  });
}

async function heatmapTile(pool: Pool, z: number, x: number, y: number): Promise<Response> {
  const size = 256;
  const pixels = new Uint8Array(size * size * 4);
  const colors = new Map<string, [number, number, number, number]>();
  const grid = await loadGrid(pool);
  for (let pixelY = 0; pixelY < size; pixelY += 1) {
    for (let pixelX = 0; pixelX < size; pixelX += 1) {
      const [longitude, latitude] = tileLngLat(z, x, y, pixelX, pixelY);
      const key = `${Math.round(longitude * 100)}:${Math.round(latitude * 100)}`;
      let color = colors.get(key);
      if (!color) {
        color = valueToHeat(sampleGrid(grid, longitude, latitude));
        colors.set(key, color);
      }
      const offset = (pixelY * size + pixelX) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = color[3];
    }
  }
  return new Response(encodeRgbaPng(size, size, pixels), {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=3600" },
  });
}

function valueToHeat(value: number): [number, number, number, number] {
  if (value <= 0) return [0, 0, 0, 0];
  const intensity = Math.min(value / 4_500, 1);
  const stops: Array<[number, number, number]> = [
    [41, 121, 255],
    [0, 200, 83],
    [255, 235, 59],
    [255, 82, 82],
  ];
  const scaled = intensity * (stops.length - 1);
  const index = Math.min(Math.floor(scaled), stops.length - 2);
  const fraction = scaled - index;
  const channel = (from: number, to: number) => Math.round(from + (to - from) * fraction);
  return [
    channel(stops[index]![0], stops[index + 1]![0]),
    channel(stops[index]![1], stops[index + 1]![1]),
    channel(stops[index]![2], stops[index + 1]![2]),
    Math.round(70 + intensity * 150),
  ];
}

async function dailyAveragePoint(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const longitude = Number(url.searchParams.get("longitude"));
  const latitude = Number(url.searchParams.get("latitude"));
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
  const { total, newEnergy } = syntheticTraffic(longitude, latitude);
  await ensureCell(pool, longitude, latitude, total, newEnergy);
  return jsonResponse({
    averageDailyVehicleCount: total,
    averageDailyNewEnergyVehicleCount: newEnergy,
  });
}

async function ensureCell(pool: Pool, longitude: number, latitude: number, total: number, newEnergy: number): Promise<void> {
  const cell = cellOf(longitude, latitude);
  if (!cell) return;
  await pool.query(
    `INSERT INTO site_traffic_grid_cell (cell_x, cell_y, average_vehicle_count, new_energy_count)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE average_vehicle_count = VALUES(average_vehicle_count), new_energy_count = VALUES(new_energy_count)`,
    [cell.x, cell.y, total, newEnergy],
  );
  gridCache = null;
}

function pointToSegmentDistanceMeters(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  const projectionX = ax + t * dx;
  const projectionY = ay + t * dy;
  return haversine(px, py, projectionX, projectionY);
}

function haversine(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const toRadians = (degree: number) => (degree * Math.PI) / 180;
  const radius = 6_371_000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

async function nearestRouteSegment(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const longitude = Number(url.searchParams.get("longitude"));
  const latitude = Number(url.searchParams.get("latitude"));
  const searchRadiusMeters = Number(url.searchParams.get("searchRadiusMeters") ?? "1000");
  const routeRef = url.searchParams.get("routeRef");
  const startDate = url.searchParams.get("startDate") ?? "2026-01-15";
  const endDate = url.searchParams.get("endDate") ?? "2026-01-21";
  const coordinateSystem = url.searchParams.get("coordinateSystem") === "gcj02" ? "gcj02" : "wgs84";
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const keyX = Math.round(longitude * 50);
  const keyY = Math.round(latitude * 50);
  const existing = await queryOne<SegmentRow>(
    pool,
    "SELECT * FROM site_traffic_road_segment WHERE segment_id = ? LIMIT 1",
    [`local-${keyX}-${keyY}`],
  );
  const row = existing ?? (await createSegment(pool, longitude, latitude, routeRef));

  if (!row) return noRoadResponse(longitude, latitude, searchRadiusMeters, routeRef, coordinateSystem);

  const geoJson = JSON.parse(row.geo_json) as Record<string, unknown>;
  return jsonResponse({
    dataStatus: "ready",
    geometryCoordinateSystem: "WGS84",
    matching: {
      distanceMeters: 0,
      nearestPoint: [longitude, latitude],
      mode: routeRef ? "specified_route" : "nearest_route",
      requestedRouteRef: routeRef ?? null,
    },
    matchedRoute: {
      routeKey: row.route_key,
      roadLevel: row.road_level,
      ref: row.ref,
      name: row.name,
      segmentId: row.segment_id,
      chainIndex: Number(row.chain_index),
      segmentIndex: Number(row.segment_index),
      startKm: Number(row.start_km),
      endKm: Number(row.end_km),
    },
    period: { startDate, endDate, publishedDayCount: 7 },
    segmentGeoJson: geoJson,
    traffic: {
      energyStatisticsAvailable: true,
      forwardVisitCount: Number(row.forward_visit_count),
      newEnergyUniqueVehicleCount: Number(row.new_energy_unique_vehicle_count),
      newEnergyVisitCount: Number(row.new_energy_visit_count),
      reverseVisitCount: Number(row.reverse_visit_count),
      unknownDirectionVisitCount: Number(row.unknown_direction_visit_count),
      visitCount: Number(row.visit_count),
      uniqueVehicleCount: Number(row.unique_vehicle_count),
    },
    query: { coordinateSystem, latitude, longitude, searchRadiusMeters },
    versions: { matchingAlgorithmVersion, roadNetworkVersion },
  });
}

function noRoadResponse(
  longitude: number,
  latitude: number,
  searchRadiusMeters: number,
  routeRef: string | null,
  coordinateSystem: "gcj02" | "wgs84",
): Response {
  return jsonResponse({
    dataStatus: "no_road",
    geometryCoordinateSystem: "WGS84",
    matching: {
      distanceMeters: null,
      nearestPoint: null,
      mode: "nearest_route",
      requestedRouteRef: routeRef ?? null,
    },
    matchedRoute: null,
    period: null,
    segmentGeoJson: null,
    traffic: {
      energyStatisticsAvailable: false,
      forwardVisitCount: 0,
      newEnergyUniqueVehicleCount: null,
      newEnergyVisitCount: null,
      reverseVisitCount: 0,
      unknownDirectionVisitCount: 0,
      visitCount: 0,
      uniqueVehicleCount: 0,
    },
    query: { coordinateSystem, latitude, longitude, searchRadiusMeters },
    versions: { matchingAlgorithmVersion, roadNetworkVersion },
  });
}

async function createSegment(pool: Pool, longitude: number, latitude: number, routeRef: string | null): Promise<SegmentRow | null> {
  const keyX = Math.round(longitude * 50);
  const keyY = Math.round(latitude * 50);
  const ref = routeRef ?? "G107";
  const name = routeRef ? `${routeRef} 本地模拟路段` : "G107 本地模拟路段";
  const { total, newEnergy } = syntheticTraffic(longitude, latitude);
  const forward = Math.round(total * 0.62);
  const reverse = Math.round(total * 0.31);
  const unknownDirection = total - forward - reverse;
  const geoJson = {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: [
        [longitude - 0.08, latitude],
        [longitude - 0.04, latitude + 0.002],
        [longitude, latitude],
        [longitude + 0.04, latitude - 0.002],
        [longitude + 0.08, latitude],
      ],
    },
    properties: { roadLevel: "national", routeKey: `henan-${ref}`, segmentId: `local-${keyX}-${keyY}` },
  };
  await pool.query(
    `INSERT INTO site_traffic_road_segment
       (route_key, road_level, ref, name, segment_id, chain_index, segment_index, start_km, end_km, geo_json,
        forward_visit_count, reverse_visit_count, unknown_direction_visit_count, visit_count, unique_vehicle_count,
        new_energy_visit_count, new_energy_unique_vehicle_count, created_at, updated_at)
     VALUES (?, 'national', ?, ?, ?, 0, 0, 0, 160, ?, ?, ?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())
     ON DUPLICATE KEY UPDATE updated_at = UNIX_TIMESTAMP()`,
    [
      `henan-${ref}`,
      ref,
      name,
      `local-${keyX}-${keyY}`,
      JSON.stringify(geoJson),
      forward,
      reverse,
      unknownDirection,
      total,
      Math.round(total * 0.6),
      newEnergy,
      Math.round(newEnergy * 0.6),
    ],
  );
  return queryOne<SegmentRow>(
    pool,
    "SELECT * FROM site_traffic_road_segment WHERE segment_id = ? LIMIT 1",
    [`local-${keyX}-${keyY}`],
  );
}
