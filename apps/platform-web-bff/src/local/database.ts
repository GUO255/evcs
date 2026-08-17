import { createPool, type Pool, type RowDataPacket } from "mysql2/promise";

export const localDevelopmentDatabaseUrl = "mysql://evcs:123456@127.0.0.1:3307/evcs";

export function createLocalPool(databaseUrl: string): Pool {
  return createPool({
    uri: databaseUrl,
    connectionLimit: 8,
    supportBigNumbers: true,
    bigNumberStrings: true,
    timezone: "Z",
    charset: "utf8mb4",
  });
}

export async function queryRows<T extends RowDataPacket>(
  pool: Pool,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function queryOne<T extends RowDataPacket>(
  pool: Pool,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await queryRows<T>(pool, sql, params);
  return rows[0] ?? null;
}

export function asString(value: unknown): string {
  return String(value ?? "");
}

export function asNumber(value: unknown): number {
  return Number(value ?? 0);
}

export function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

export function parseJsonColumn(value: unknown, fallback: unknown): unknown {
  if (typeof value === "string" && value.trim() !== "") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  if (value !== null && value !== undefined) return value;
  return fallback;
}

export const nowSeconds = (): number => Math.floor(Date.now() / 1000);
