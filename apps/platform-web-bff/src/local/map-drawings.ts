import type { Pool, RowDataPacket } from "mysql2/promise";
import { queryOne, queryRows, nowSeconds } from "./database";
import { errorResponse, isRecord, jsonResponse, notFound, readJsonBody, validId } from "./respond";

interface DrawingRow extends RowDataPacket {
  id: string;
  name: string;
  geo_json: string;
  corridor_type: number;
  show_name: number;
  remark: string;
  created_at: number;
  updated_at: number;
}

type CorridorType = "main" | "secondary" | "branch";

const corridorByDb = (value: number): CorridorType | null => (
  value === 1 ? "main" : value === 2 ? "secondary" : value === 3 ? "branch" : null
);
const corridorDbValue = (value: CorridorType | null): number => (
  value === "main" ? 1 : value === "secondary" ? 2 : value === "branch" ? 3 : 0
);

function drawingPayload(row: DrawingRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    geoJson: JSON.parse(row.geo_json),
    corridorType: corridorByDb(Number(row.corridor_type)),
    showName: Number(row.show_name) === 1,
    remark: row.remark,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

interface DrawingInput {
  name: string;
  geoJson: Record<string, unknown>;
  corridorType: CorridorType | null;
  showName: boolean;
  remark: string;
}

function readInput(body: unknown): DrawingInput | null {
  if (!isRecord(body) || typeof body.name !== "string" || body.name.trim() === ""
    || typeof body.showName !== "boolean" || typeof body.remark !== "string"
    || !isRecord(body.geoJson) || !isRecord(body.geometry ?? null)
    || body.geoJson.type !== "Feature" || !isRecord(body.geoJson.geometry)) {
    return null;
  }
  const geometry = body.geoJson.geometry as Record<string, unknown>;
  const validGeometry = isLineString(geometry) || isPolygon(geometry);
  if (!validGeometry || !isRecord(body.geoJson.properties) || Object.keys(body.geoJson.properties as Record<string, unknown>).length !== 0) {
    return null;
  }
  let corridorType: CorridorType | null = null;
  if (body.corridorType !== null && body.corridorType !== undefined) {
    if (body.corridorType !== "main" && body.corridorType !== "secondary" && body.corridorType !== "branch") return null;
    corridorType = body.corridorType;
  }
  if (geometry.type === "Polygon" && corridorType !== null) return null;
  return {
    name: body.name.trim(),
    geoJson: body.geoJson,
    corridorType,
    showName: body.showName,
    remark: body.remark,
  };
}

function isLineString(geometry: Record<string, unknown>): boolean {
  return geometry.type === "LineString" && Array.isArray(geometry.coordinates)
    && geometry.coordinates.length >= 2
    && geometry.coordinates.every((position) => Array.isArray(position) && position.length >= 2
      && position.every((part) => typeof part === "number" && Number.isFinite(part)));
}

function isPolygon(geometry: Record<string, unknown>): boolean {
  return geometry.type === "Polygon" && Array.isArray(geometry.coordinates)
    && geometry.coordinates.length >= 1
    && geometry.coordinates.every((ring) => Array.isArray(ring) && ring.length >= 4
      && ring.every((position) => Array.isArray(position) && position.length >= 2
        && position.every((part) => typeof part === "number" && Number.isFinite(part))));
}

export async function handleMapDrawings(pool: Pool, request: Request, suffix: string): Promise<Response> {
  const list = /^\/?$/u.exec(suffix);
  if (list && request.method === "GET") return listDrawings(pool, request);
  if (list && request.method === "POST") return createDrawing(pool, request);

  const item = /^\/(\d+)$/u.exec(suffix);
  if (item && request.method === "PATCH") return updateDrawing(pool, item[1]!, request);
  if (item && request.method === "DELETE") return deleteDrawing(pool, item[1]!);

  return notFound();
}

async function listDrawings(pool: Pool, request: Request): Promise<Response> {
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
  const rows = await queryRows<DrawingRow>(
    pool,
    `SELECT * FROM site_map_drawing${where} ORDER BY id ASC LIMIT ?`,
    [...params, limit + 1],
  );
  return jsonResponse({
    items: rows.slice(0, limit).map(drawingPayload),
    nextCursor: rows.length > limit ? rows[limit]!.id : null,
  });
}

async function createDrawing(pool: Pool, request: Request): Promise<Response> {
  const input = readInput(await readJsonBody(request));
  if (!input) return errorResponse("invalid_request");
  const now = nowSeconds();
  const result = await pool.query(
    "INSERT INTO site_map_drawing (name, geo_json, corridor_type, show_name, remark, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [input.name, JSON.stringify(input.geoJson), corridorDbValue(input.corridorType), input.showName ? 1 : 0, input.remark, now, now],
  );
  const row = await queryOne<DrawingRow>(
    pool,
    "SELECT * FROM site_map_drawing WHERE id = ?",
    [String((result[0] as { insertId: number }).insertId)],
  );
  if (!row) return notFound();
  return jsonResponse(drawingPayload(row), 201);
}

async function updateDrawing(pool: Pool, id: string, request: Request): Promise<Response> {
  const existing = await queryOne<DrawingRow>(pool, "SELECT id FROM site_map_drawing WHERE id = ?", [id]);
  if (!existing) return notFound();
  const input = readInput(await readJsonBody(request));
  if (!input) return errorResponse("invalid_request");
  const now = nowSeconds();
  await pool.query(
    "UPDATE site_map_drawing SET name = ?, geo_json = ?, corridor_type = ?, show_name = ?, remark = ?, updated_at = ? WHERE id = ?",
    [input.name, JSON.stringify(input.geoJson), corridorDbValue(input.corridorType), input.showName ? 1 : 0, input.remark, now, id],
  );
  const row = await queryOne<DrawingRow>(pool, "SELECT * FROM site_map_drawing WHERE id = ?", [id]);
  if (!row) return notFound();
  return jsonResponse(drawingPayload(row));
}

async function deleteDrawing(pool: Pool, id: string): Promise<Response> {
  const result = await pool.query("DELETE FROM site_map_drawing WHERE id = ?", [id]);
  if ((result[0] as { affectedRows: number }).affectedRows === 0) return notFound();
  return new Response(null, { status: 204 });
}
