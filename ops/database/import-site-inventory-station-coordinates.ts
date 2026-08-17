import mysql, { type RowDataPacket } from "mysql2/promise";
import { gcj02ToWgs84 } from "../../packages/geo-coordinates/src/index";

type CoordinateSourceRow = {
  sourceRowKey: string;
  sequenceNumber: number;
  stationName: string;
  longitude: number;
  latitude: number;
  coordinateSystem: "GCJ-02";
};

type CoordinateImportRow = CoordinateSourceRow & {
  wgs84Longitude: number;
  wgs84Latitude: number;
};

type DatabaseCoordinateRow = RowDataPacket & {
  sequenceNumber: number;
  stationName: string;
  longitude: string;
  latitude: string;
};

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Coordinate JSON path argument is required");
const databaseUrl = process.env.SITE_SELECTION_V2_MYSQL_URL;
if (!databaseUrl) throw new Error("SITE_SELECTION_V2_MYSQL_URL is required");

const source = Bun.file(inputPath);
if (!(await source.exists())) throw new Error(`Coordinate JSON does not exist: ${inputPath}`);
const rows = parseRows(await source.json());
validateDataset(rows);

const connection = await mysql.createConnection(databaseUrl);
try {
  await connection.beginTransaction();
  try {
    await assertDatabaseKeysExist(rows);
    const now = Math.floor(Date.now() / 1_000);
    const derivedTable = rows.map((_, index) => index === 0
      ? "SELECT ? AS sequence_number, ? AS station_name, CAST(? AS DECIMAL(10, 7)) AS longitude, CAST(? AS DECIMAL(9, 7)) AS latitude"
      : "UNION ALL SELECT ?, ?, CAST(? AS DECIMAL(10, 7)), CAST(? AS DECIMAL(9, 7))"
    ).join("\n");
    const parameters = rows.flatMap((row) => [
      row.sequenceNumber,
      row.stationName,
      row.wgs84Longitude,
      row.wgs84Latitude,
    ]);
    await connection.execute(
      `UPDATE site_inventory_station AS target
JOIN (
${derivedTable}
) AS source
  ON source.sequence_number = target.sequence_number
 AND source.station_name = target.station_name
SET target.longitude = source.longitude,
    target.latitude = source.latitude,
    target.updated_at = ?`,
      [...parameters, now],
    );
    const verification = await verifyCoordinates(rows);
    await connection.commit();
    console.log(JSON.stringify(verification));
  } catch (error) {
    await connection.rollback();
    throw error;
  }
} finally {
  await connection.end();
}

function parseRows(value: unknown): CoordinateImportRow[] {
  if (!Array.isArray(value)) throw new Error("Coordinate JSON root must be an array");
  return value.map((item, index) => {
    const rowNumber = index + 1;
    if (!isRecord(item)) throw new Error(`Coordinate row ${rowNumber} must be an object`);
    const expectedKeys = [
      "coordinateSystem",
      "latitude",
      "longitude",
      "sequenceNumber",
      "sourceRowKey",
      "stationName",
    ];
    if (JSON.stringify(Object.keys(item).sort()) !== JSON.stringify(expectedKeys)) {
      throw new Error(`Coordinate row ${rowNumber} has an invalid shape`);
    }
    const sourceRowKey = requiredString(item.sourceRowKey, 32, "sourceRowKey", rowNumber);
    const stationName = requiredString(item.stationName, 128, "stationName", rowNumber);
    const sequenceNumber = positiveInteger(item.sequenceNumber, "sequenceNumber", rowNumber);
    const longitude = coordinate(item.longitude, 110, 117, "longitude", rowNumber);
    const latitude = coordinate(item.latitude, 31, 37, "latitude", rowNumber);
    if (item.coordinateSystem !== "GCJ-02") {
      throw new Error(`Coordinate row ${rowNumber} must use GCJ-02 source coordinates`);
    }
    const wgs84 = gcj02ToWgs84(longitude, latitude);
    return {
      sourceRowKey,
      sequenceNumber,
      stationName,
      longitude,
      latitude,
      coordinateSystem: "GCJ-02",
      wgs84Longitude: roundCoordinate(wgs84.longitude),
      wgs84Latitude: roundCoordinate(wgs84.latitude),
    };
  });
}

function validateDataset(rows: readonly CoordinateImportRow[]): void {
  if (rows.length !== 117) throw new Error(`Expected 117 coordinates, received ${rows.length}`);
  const sourceKeys = new Set<string>();
  const databaseKeys = new Set<string>();
  const sequenceCounts = new Map<number, number>();
  for (const row of rows) {
    if (sourceKeys.has(row.sourceRowKey)) throw new Error(`Duplicate sourceRowKey: ${row.sourceRowKey}`);
    sourceKeys.add(row.sourceRowKey);
    const key = databaseKey(row);
    if (databaseKeys.has(key)) {
      throw new Error(`Duplicate sequenceNumber and stationName: ${row.sequenceNumber}`);
    }
    databaseKeys.add(key);
    sequenceCounts.set(row.sequenceNumber, (sequenceCounts.get(row.sequenceNumber) ?? 0) + 1);
  }
  if (sequenceCounts.size !== 116 || sequenceCounts.get(23) !== 2) {
    throw new Error("Expected sequence numbers 1-116 with sequence 23 represented twice");
  }
  for (let sequenceNumber = 1; sequenceNumber <= 116; sequenceNumber += 1) {
    const expected = sequenceNumber === 23 ? 2 : 1;
    if (sequenceCounts.get(sequenceNumber) !== expected) {
      throw new Error(`Unexpected coordinate count for sequenceNumber ${sequenceNumber}`);
    }
  }
}

async function assertDatabaseKeysExist(rows: readonly CoordinateImportRow[]): Promise<void> {
  const placeholders = rows.map(() => "(?, ?)").join(", ");
  const parameters = rows.flatMap((row) => [row.sequenceNumber, row.stationName]);
  const [databaseRows] = await connection.execute<DatabaseCoordinateRow[]>(
    `SELECT sequence_number AS sequenceNumber, station_name AS stationName, longitude, latitude
FROM site_inventory_station
WHERE (sequence_number, station_name) IN (${placeholders})`,
    parameters,
  );
  const found = new Set(databaseRows.map(databaseKey));
  const missing = rows.filter((row) => !found.has(databaseKey(row)));
  if (missing.length > 0) {
    throw new Error(`Database is missing ${missing.length} coordinate targets: ${missing[0]?.stationName}`);
  }
}

async function verifyCoordinates(rows: readonly CoordinateImportRow[]): Promise<{
  imported: number;
  coordinateSystem: "WGS84";
  minimumLongitude: number;
  maximumLongitude: number;
  minimumLatitude: number;
  maximumLatitude: number;
}> {
  const placeholders = rows.map(() => "(?, ?)").join(", ");
  const parameters = rows.flatMap((row) => [row.sequenceNumber, row.stationName]);
  const [databaseRows] = await connection.execute<DatabaseCoordinateRow[]>(
    `SELECT sequence_number AS sequenceNumber, station_name AS stationName, longitude, latitude
FROM site_inventory_station
WHERE (sequence_number, station_name) IN (${placeholders})`,
    parameters,
  );
  const expected = new Map(rows.map((row) => [databaseKey(row), row]));
  for (const databaseRow of databaseRows) {
    const sourceRow = expected.get(databaseKey(databaseRow));
    if (!sourceRow) throw new Error("Coordinate verification returned an unexpected row");
    if (
      Number(databaseRow.longitude) !== sourceRow.wgs84Longitude
      || Number(databaseRow.latitude) !== sourceRow.wgs84Latitude
    ) {
      throw new Error(`Coordinate verification failed: ${databaseRow.stationName}`);
    }
  }
  if (databaseRows.length !== rows.length) {
    throw new Error(`Coordinate verification expected ${rows.length} rows, found ${databaseRows.length}`);
  }
  const longitudes = rows.map((row) => row.wgs84Longitude);
  const latitudes = rows.map((row) => row.wgs84Latitude);
  return {
    imported: databaseRows.length,
    coordinateSystem: "WGS84",
    minimumLongitude: Math.min(...longitudes),
    maximumLongitude: Math.max(...longitudes),
    minimumLatitude: Math.min(...latitudes),
    maximumLatitude: Math.max(...latitudes),
  };
}

function databaseKey(row: { sequenceNumber: number; stationName: string }): string {
  return `${row.sequenceNumber}\u0000${row.stationName}`;
}

function requiredString(value: unknown, maximumLength: number, field: string, row: number): string {
  if (typeof value !== "string") throw new Error(`Coordinate row ${row} has an invalid ${field}`);
  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new Error(`Coordinate row ${row} has an invalid ${field}`);
  }
  return normalized;
}

function positiveInteger(value: unknown, field: string, row: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new Error(`Coordinate row ${row} has an invalid ${field}`);
  }
  return value;
}

function coordinate(value: unknown, minimum: number, maximum: number, field: string, row: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`Coordinate row ${row} has an invalid ${field}`);
  }
  return value;
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(7));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
