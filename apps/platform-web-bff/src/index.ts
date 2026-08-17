import { createPlatformWebBffHandler } from "./app";
import { createLocalPool, localDevelopmentDatabaseUrl } from "./local/database";

const port = parsePort(process.env.PORT, 3240);
const databaseUrl = process.env.PLATFORM_WEB_BFF_DATABASE_URL
  ?? process.env.EVCS_DATABASE_URL
  ?? localDevelopmentDatabaseUrl;

let pool;
try {
  pool = createLocalPool(databaseUrl);
} catch (error) {
  console.warn(`[platform-web-bff] local database unavailable, falling back to mock responses: ${error instanceof Error ? error.message : String(error)}`);
  pool = undefined;
}

const handler = createPlatformWebBffHandler({ pool });

const server = Bun.serve({ port, fetch: handler });
console.log(`[platform-web-bff] listening on http://127.0.0.1:${server.port} (local database: ${pool ? "enabled" : "disabled"})`);

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error(`PORT must be an integer from 1 to 65535, got "${value}"`);
  return parsed;
}
