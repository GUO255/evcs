import { createPool, type Pool } from "mysql2/promise";
import { createAuthServiceHandler, type CredentialStore } from "./app";

const databaseUrl = process.env.AUTH_MYSQL_URL;
const port = parsePort(process.env.PORT, 3210);
const platformWebOrigin = process.env.AUTH_PLATFORM_WEB_ORIGIN ?? "http://127.0.0.1:3250";

if (!databaseUrl) throw new Error("AUTH_MYSQL_URL is required");

const pool = createPool({ uri: databaseUrl, connectionLimit: 5 });
const store = await createMysqlCredentialStore(pool);
const handler = createAuthServiceHandler({ store, platformWebOrigin });

const server = Bun.serve({ port, fetch: handler });
console.log(`[auth-service] listening on http://127.0.0.1:${server.port}`);

async function createMysqlCredentialStore(pool: Pool): Promise<CredentialStore> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dev_auth_credentials (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(64) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_dev_auth_credentials_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  return Object.freeze({
      async create(username: string, passwordHash: string): Promise<"created" | "conflict"> {
        try {
          await pool.query(
            "INSERT INTO dev_auth_credentials (username, password_hash) VALUES (?, ?)",
            [username, passwordHash],
          );
          return "created";
        } catch (error) {
          if ((error as { code?: string }).code === "ER_DUP_ENTRY") return "conflict";
          throw error;
        }
      },
      async find(username: string): Promise<{ passwordHash: string } | null> {
        const [rows] = (await pool.query(
          "SELECT password_hash FROM dev_auth_credentials WHERE username = ? LIMIT 1",
          [username],
        )) as unknown as [Array<{ password_hash: string }>];
        const row = rows[0];
        return row ? { passwordHash: row.password_hash } : null;
      },
    });
}

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error(`PORT must be an integer from 1 to 65535, got "${value}"`);
  return parsed;
}
