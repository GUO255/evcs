import { createPlatformWebBffHandler } from "./app";
import { createLocalPool, localDevelopmentDatabaseUrl } from "./local/database";

const port = 3240;
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
