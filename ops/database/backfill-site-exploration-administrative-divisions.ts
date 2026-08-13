import mysql, { type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

type SiteRow = RowDataPacket & {
  id: string;
  longitude: string | number;
  latitude: string | number;
  provinceCity: string;
  countyDistrict: string;
};

type AdministrativeDivision = {
  provinceCity: string;
  countyDistrict: string;
};

const databaseUrl = requiredEnvironment("SITE_SELECTION_V2_MYSQL_URL");
const databaseHost = new URL(databaseUrl).hostname;
if (databaseHost !== "127.0.0.1" && databaseHost !== "localhost") {
  throw new Error(`Refusing to backfill a non-local database host: ${databaseHost}`);
}

const connection = await mysql.createConnection(databaseUrl);
try {
  const [sites] = await connection.query<SiteRow[]>(`
    SELECT CAST(id AS CHAR) AS id, longitude, latitude,
      province_city AS provinceCity, county_district AS countyDistrict
    FROM site_exploration_site
    WHERE province_city = '' OR county_district = ''
    ORDER BY id
  `);
  let updated = 0;
  for (const site of sites) {
    const division = await reverseGeocodeAdministrativeDivision(
      Number(site.longitude),
      Number(site.latitude),
    );
    const [result] = await connection.execute<ResultSetHeader>(`
      UPDATE site_exploration_site
      SET province_city = IF(province_city = '', ?, province_city),
        county_district = IF(county_district = '', ?, county_district),
        updated_at = GREATEST(updated_at + 1, UNIX_TIMESTAMP())
      WHERE id = ? AND (province_city = '' OR county_district = '')
      LIMIT 1
    `, [division.provinceCity, division.countyDistrict, site.id]);
    updated += result.affectedRows;
    if (updated % 10 === 0 || updated === sites.length) {
      console.error(`Backfilled ${updated}/${sites.length} sites`);
    }
    if (updated < sites.length) await Bun.sleep(1_100);
  }

  const [[remaining]] = await connection.query<(RowDataPacket & { count: number })[]>(`
    SELECT COUNT(*) AS count
    FROM site_exploration_site
    WHERE province_city = '' OR county_district = ''
  `);
  if (Number(remaining?.count) !== 0) throw new Error("Administrative division backfill is incomplete");
  console.log(JSON.stringify({ scanned: sites.length, updated, remaining: 0 }));
} finally {
  await connection.end();
}

async function reverseGeocodeAdministrativeDivision(
  longitude: number,
  latitude: number,
): Promise<AdministrativeDivision> {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    throw new Error("Invalid site coordinate");
  }
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("accept-language", "zh-CN");
  url.searchParams.set("addressdetails", "1");
  const response = await fetch(url, {
    headers: { "User-Agent": "EVCS-local-one-time-admin-backfill/1.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Reverse geocoding failed with HTTP ${response.status}`);
  const payload = await response.json() as unknown;
  if (!isRecord(payload) || !isRecord(payload.address)) {
    throw new Error("Reverse geocoding returned an invalid response");
  }
  const address = payload.address;
  const provinceCity = firstBoundedString(address.region, address.city, address.municipality);
  const countyDistrict = firstBoundedString(
    address.city_district,
    address.county,
    address.district,
    address.city,
  );
  if (!provinceCity || !countyDistrict) {
    throw new Error(`Reverse geocoding did not resolve administrative divisions`);
  }
  return { provinceCity, countyDistrict };
}

function firstBoundedString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const normalized = value.trim();
    if (normalized && normalized.length <= 64) return normalized;
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}
