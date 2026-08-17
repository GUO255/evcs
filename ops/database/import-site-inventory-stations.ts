import mysql, { type Connection, type RowDataPacket } from "mysql2/promise";

const EXPECTED_HEADERS = [
  "source_row_key",
  "sequence_number",
  "station_name",
  "provincial_city",
  "county_district",
  "route_name",
  "specific_location",
  "facility_type",
  "source_quantity",
  "daily_truck_traffic_2025",
  "daily_medium_heavy_truck_traffic_2025",
  "construction_status",
  "derived_construction_status",
  "derived_site_type",
  "review_note",
  "merge_status",
  "merge_note",
] as const;

type CsvRecord = Record<(typeof EXPECTED_HEADERS)[number], string>;

type InventoryStationImportRow = {
  sourceRowKey: string;
  sequenceNumber: number;
  stationName: string;
  provincialCity: string;
  countyDistrict: string;
  routeName: string;
  specificLocation: string;
  facilityType: string;
  siteType: number;
  status: number;
  statusDescription: string;
  dailyTruckTraffic2025: number;
  dailyMediumHeavyTruckTraffic2025: number;
  remark: string;
};

type StatusCountRow = RowDataPacket & {
  siteType: number;
  status: number;
  count: number;
};

const SITE_TYPE_CODES = new Map([
  ["规划点", 1],
  ["原规划调整点", 1],
]);
const STATUS_CODES = new Map([
  ["", 0],
  ["已签约", 1],
  ["已开工", 1],
  ["已完工", 1],
]);

const COLUMN_LIMITS = {
  stationName: 128,
  provincialCity: 64,
  countyDistrict: 64,
  routeName: 128,
  specificLocation: 255,
  facilityType: 64,
  statusDescription: 1_000,
  remark: 1_000,
} as const;

const INSERT_COLUMNS = [
  "sequence_number",
  "station_name",
  "provincial_city",
  "county_district",
  "route_name",
  "specific_location",
  "facility_type",
  "site_type",
  "status",
  "status_description",
  "daily_truck_traffic_2025",
  "daily_medium_heavy_truck_traffic_2025",
  "remark",
  "created_at",
  "updated_at",
] as const;

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error("CSV path argument is required");
}
const databaseUrl = process.env.SITE_SELECTION_V2_MYSQL_URL;
if (!databaseUrl) {
  throw new Error("SITE_SELECTION_V2_MYSQL_URL is required");
}

const source = Bun.file(inputPath);
if (!(await source.exists())) {
  throw new Error(`CSV file does not exist: ${inputPath}`);
}
const rows = normalizeRows(parseCsv(await source.text()));
validateDataset(rows);

const connection = await mysql.createConnection(databaseUrl);
try {
  await connection.beginTransaction();
  try {
    for (let offset = 0; offset < rows.length; offset += 100) {
      await upsertRows(connection, rows.slice(offset, offset + 100));
    }
    const verification = await verifyImportedRows(connection, rows);
    await connection.commit();
    console.log(JSON.stringify(verification));
  } catch (error) {
    await connection.rollback();
    throw error;
  }
} finally {
  await connection.end();
}

function parseCsv(value: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]!;
    if (quoted) {
      if (character === '"') {
        if (value[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      if (field.length > 0) throw new Error(`Invalid quote at CSV byte ${index}`);
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unterminated quoted field");
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function normalizeRows(csvRows: string[][]): InventoryStationImportRow[] {
  const [rawHeaders, ...dataRows] = csvRows;
  if (!rawHeaders) throw new Error("CSV is empty");
  const headers = rawHeaders.map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/u, "") : header
  );
  if (JSON.stringify(headers) !== JSON.stringify(EXPECTED_HEADERS)) {
    throw new Error("CSV headers do not match the site inventory import contract");
  }

  return dataRows.map((values, index) => {
    const line = index + 2;
    if (values.length !== EXPECTED_HEADERS.length) {
      throw new Error(`CSV line ${line} has ${values.length} fields; expected ${EXPECTED_HEADERS.length}`);
    }
    const record = Object.fromEntries(
      EXPECTED_HEADERS.map((header, columnIndex) => [header, values[columnIndex] ?? ""]),
    ) as CsvRecord;
    const status = STATUS_CODES.get(record.derived_construction_status);
    if (status === undefined) {
      throw new Error(`CSV line ${line} has an unsupported derived construction status`);
    }
    const siteType = SITE_TYPE_CODES.get(record.derived_site_type);
    if (siteType === undefined) {
      throw new Error(`CSV line ${line} has an unsupported derived site type`);
    }

    return {
      sourceRowKey: requiredText(record.source_row_key, 32, "source_row_key", line),
      sequenceNumber: unsignedInteger(record.sequence_number, false, "sequence_number", line),
      stationName: requiredText(record.station_name, COLUMN_LIMITS.stationName, "station_name", line),
      provincialCity: requiredText(
        record.provincial_city,
        COLUMN_LIMITS.provincialCity,
        "provincial_city",
        line,
      ),
      countyDistrict: requiredText(
        record.county_district,
        COLUMN_LIMITS.countyDistrict,
        "county_district",
        line,
      ),
      routeName: requiredText(record.route_name, COLUMN_LIMITS.routeName, "route_name", line),
      specificLocation: requiredText(
        record.specific_location,
        COLUMN_LIMITS.specificLocation,
        "specific_location",
        line,
      ),
      facilityType: requiredText(
        record.facility_type,
        COLUMN_LIMITS.facilityType,
        "facility_type",
        line,
      ),
      siteType,
      status,
      statusDescription: boundedText(
        record.construction_status,
        COLUMN_LIMITS.statusDescription,
        "construction_status",
        line,
      ),
      dailyTruckTraffic2025: unsignedInteger(
        record.daily_truck_traffic_2025,
        true,
        "daily_truck_traffic_2025",
        line,
      ),
      dailyMediumHeavyTruckTraffic2025: unsignedInteger(
        record.daily_medium_heavy_truck_traffic_2025,
        true,
        "daily_medium_heavy_truck_traffic_2025",
        line,
      ),
      remark: boundedText(record.review_note, COLUMN_LIMITS.remark, "review_note", line),
    };
  });
}

function validateDataset(rows: InventoryStationImportRow[]): void {
  if (rows.length !== 117) throw new Error(`Expected 117 stations, received ${rows.length}`);

  const sourceKeys = new Set<string>();
  const databaseKeys = new Set<string>();
  const sequenceCounts = new Map<number, number>();
  for (const row of rows) {
    if (sourceKeys.has(row.sourceRowKey)) {
      throw new Error(`Duplicate source_row_key: ${row.sourceRowKey}`);
    }
    sourceKeys.add(row.sourceRowKey);

    const databaseKey = `${row.sequenceNumber}\u0000${row.stationName}`;
    if (databaseKeys.has(databaseKey)) {
      throw new Error(`Duplicate sequence_number and station_name: ${row.sequenceNumber}`);
    }
    databaseKeys.add(databaseKey);
    sequenceCounts.set(row.sequenceNumber, (sequenceCounts.get(row.sequenceNumber) ?? 0) + 1);
  }

  if (sequenceCounts.size !== 116 || sequenceCounts.get(23) !== 2) {
    throw new Error("Expected sequence numbers 1-116 with sequence 23 represented twice");
  }
  for (let sequenceNumber = 1; sequenceNumber <= 116; sequenceNumber += 1) {
    const expected = sequenceNumber === 23 ? 2 : 1;
    if (sequenceCounts.get(sequenceNumber) !== expected) {
      throw new Error(`Unexpected record count for sequence_number ${sequenceNumber}`);
    }
  }
}

async function upsertRows(
  connection: Connection,
  rows: readonly InventoryStationImportRow[],
): Promise<void> {
  const now = Math.floor(Date.now() / 1_000);
  const placeholders = rows.map(() => `(${INSERT_COLUMNS.map(() => "?").join(", ")})`).join(",\n");
  const parameters = rows.flatMap((row) => [
    row.sequenceNumber,
    row.stationName,
    row.provincialCity,
    row.countyDistrict,
    row.routeName,
    row.specificLocation,
    row.facilityType,
    row.siteType,
    row.status,
    row.statusDescription,
    row.dailyTruckTraffic2025,
    row.dailyMediumHeavyTruckTraffic2025,
    row.remark,
    now,
    now,
  ]);

  await connection.execute(
    `INSERT INTO site_inventory_station (${INSERT_COLUMNS.join(", ")})
VALUES ${placeholders}
ON DUPLICATE KEY UPDATE
  provincial_city = VALUES(provincial_city),
  county_district = VALUES(county_district),
  route_name = VALUES(route_name),
  specific_location = VALUES(specific_location),
  facility_type = VALUES(facility_type),
  site_type = VALUES(site_type),
  status = VALUES(status),
  status_description = VALUES(status_description),
  daily_truck_traffic_2025 = VALUES(daily_truck_traffic_2025),
  daily_medium_heavy_truck_traffic_2025 = VALUES(daily_medium_heavy_truck_traffic_2025),
  remark = VALUES(remark),
  updated_at = VALUES(updated_at)`,
    parameters,
  );
}

async function verifyImportedRows(
  connection: Connection,
  rows: readonly InventoryStationImportRow[],
): Promise<{
  imported: number;
  planned: number;
  incomplete: number;
  completed: number;
}> {
  const keyPlaceholders = rows.map(() => "(?, ?)").join(", ");
  const keyParameters = rows.flatMap((row) => [row.sequenceNumber, row.stationName]);
  const [result] = await connection.execute<StatusCountRow[]>(
    `SELECT site_type AS siteType, status, COUNT(*) AS count
FROM site_inventory_station
WHERE (sequence_number, station_name) IN (${keyPlaceholders})
GROUP BY site_type, status
ORDER BY site_type, status`,
    keyParameters,
  );
  const statusCounts = new Map<number, number>();
  const siteTypeCounts = new Map<number, number>();
  let imported = 0;
  for (const row of result) {
    const count = Number(row.count);
    const status = Number(row.status);
    const siteType = Number(row.siteType);
    imported += count;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + count);
    siteTypeCounts.set(siteType, (siteTypeCounts.get(siteType) ?? 0) + count);
  }
  if (imported !== rows.length) {
    throw new Error(`Import verification failed: expected ${rows.length}, found ${imported}`);
  }

  const expectedStatusCounts = new Map<number, number>();
  const expectedSiteTypeCounts = new Map<number, number>();
  for (const row of rows) {
    expectedStatusCounts.set(row.status, (expectedStatusCounts.get(row.status) ?? 0) + 1);
    expectedSiteTypeCounts.set(row.siteType, (expectedSiteTypeCounts.get(row.siteType) ?? 0) + 1);
  }
  for (const [status, expected] of expectedStatusCounts) {
    if ((statusCounts.get(status) ?? 0) !== expected) {
      throw new Error(`Import verification failed for status ${status}`);
    }
  }
  for (const [siteType, expected] of expectedSiteTypeCounts) {
    if ((siteTypeCounts.get(siteType) ?? 0) !== expected) {
      throw new Error(`Import verification failed for site type ${siteType}`);
    }
  }

  return {
    imported,
    planned: siteTypeCounts.get(1) ?? 0,
    incomplete: statusCounts.get(0) ?? 0,
    completed: statusCounts.get(1) ?? 0,
  };
}

function requiredText(
  value: string,
  maxLength: number,
  field: string,
  line: number,
): string {
  const normalized = boundedText(value, maxLength, field, line);
  if (!normalized) throw new Error(`CSV line ${line} has an empty ${field}`);
  return normalized;
}

function boundedText(
  value: string,
  maxLength: number,
  field: string,
  line: number,
): string {
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`CSV line ${line} exceeds ${field} length ${maxLength}`);
  }
  return normalized;
}

function unsignedInteger(
  value: string,
  allowZero: boolean,
  field: string,
  line: number,
): number {
  if (!/^\d+$/u.test(value)) throw new Error(`CSV line ${line} has an invalid ${field}`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > 4_294_967_295 || number < (allowZero ? 0 : 1)) {
    throw new Error(`CSV line ${line} has an out-of-range ${field}`);
  }
  return number;
}
