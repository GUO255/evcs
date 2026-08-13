import { describe, expect, test } from "bun:test";
import {
  assertRoleEnvironment,
  parseEnvironmentFile,
  validateRoleEnvironment,
} from "../parser";
import { renderRoleSnapshot } from "../generator";

describe("environment parser", () => {
  test("parses comments and blank assignments", () => {
    expect(parseEnvironmentFile("# note\nAUTH_PORT=3200\nAUTH_TRUSTED_PROXY_CIDRS=\n"))
      .toEqual({ AUTH_PORT: "3200", AUTH_TRUSTED_PROXY_CIDRS: "" });
  });

  test("rejects duplicate assignments", () => {
    expect(() => parseEnvironmentFile("AUTH_PORT=3200\nAUTH_PORT=3201\n"))
      .toThrow("Duplicate environment variable: AUTH_PORT");
  });

  test("rejects undeclared assignments", () => {
    expect(() => parseEnvironmentFile("EVCS_UNKNOWN=value\n"))
      .toThrow("Environment variable EVCS_UNKNOWN is not declared");
  });

  test("accepts aliased runtime keys and validates strict scalar formats", () => {
    const source = validAuthRuntime();
    expect(validateRoleEnvironment("development", "auth-service", source)).toEqual([]);
    expect(validateRoleEnvironment("development", "auth-service", { ...source, AUTH_PORT: "12px" }))
      .toContainEqual({ key: "AUTH_PORT", message: "AUTH_PORT must be a positive integer." });
  });

  test("rejects undeclared application keys while allowing operating-system keys", () => {
    const source = validAuthRuntime();
    expect(validateRoleEnvironment("development", "auth-service", {
      ...source,
      PATH: "/usr/bin",
      HOME: "/app",
      EVCS_ENVIRONMENT_PROFILE: "development",
    })).toEqual([]);
    expect(validateRoleEnvironment("development", "auth-service", {
      ...source,
      AUTH_BETTER_AUTH_SECRETT: "must-not-be-printed",
      PLATFORM_MYSQL_URL: "must-not-be-printed",
    })).toEqual(expect.arrayContaining([
      {
        key: "AUTH_BETTER_AUTH_SECRETT",
        message: "AUTH_BETTER_AUTH_SECRETT is not declared for auth-service.",
      },
      {
        key: "PLATFORM_MYSQL_URL",
        message: "PLATFORM_MYSQL_URL is not declared for auth-service.",
      },
    ]));
    expect(JSON.stringify(validateRoleEnvironment("development", "auth-service", {
      ...source,
      AUTH_UNKNOWN_SECRET: "must-not-be-printed",
    }))).not.toContain("must-not-be-printed");
  });

  test("accepts only the resolved alias for a role", () => {
    const source = validAuthRuntime();
    expect(validateRoleEnvironment("development", "auth-service", {
      ...source,
      EVCS_DATABASE_URL: source.AUTH_MYSQL_URL,
    })).toContainEqual({
      key: "EVCS_DATABASE_URL",
      message: "EVCS_DATABASE_URL is not declared for auth-service.",
    });
  });

  test("reports missing required values without printing supplied secrets", () => {
    const secret = "super-secret-value";
    const issues = validateRoleEnvironment("production", "auth-service", {
      AUTH_BETTER_AUTH_SECRET: secret,
    });
    expect(issues.some(({ key }) => key === "AUTH_MYSQL_URL")).toBe(true);
    expect(JSON.stringify(issues)).not.toContain(secret);
    expect(() => assertRoleEnvironment("production", "auth-service", { AUTH_BETTER_AUTH_SECRET: secret }))
      .toThrow('"role":"auth-service"');
  });

  test("rejects placeholders and invalid cross-field worker timing", () => {
    const source = validWorkerRuntime();
    expect(validateRoleEnvironment("production", "site-selection-v2-worker", {
      ...source,
      SITE_SELECTION_V2_LLM_MODEL: "<model>",
      SITE_SELECTION_V2_WORKER_HEARTBEAT_SECONDS: "60",
      SITE_SELECTION_V2_WORKER_LEASE_SECONDS: "60",
    })).toEqual(expect.arrayContaining([
      { key: "SITE_SELECTION_V2_LLM_MODEL", message: "SITE_SELECTION_V2_LLM_MODEL contains a forbidden placeholder." },
      { key: "SITE_SELECTION_V2_WORKER_HEARTBEAT_SECONDS", message: "SITE_SELECTION_V2_WORKER_HEARTBEAT_SECONDS must be less than SITE_SELECTION_V2_WORKER_LEASE_SECONDS." },
    ]));
  });

  test("accepts non-loopback Redis for the development BFF role", () => {
    const source = parseSnapshot(renderRoleSnapshot("development", "platform-web-bff", {
      PLATFORM_WEB_ORIGIN: "http://127.0.0.1:3120",
      PLATFORM_WEB_BFF_AUTH_ISSUER: "http://127.0.0.1:3200/platform",
      PLATFORM_WEB_BFF_OAUTH_CLIENT_SECRET: "bff-oauth-client-secret-32-characters",
      PLATFORM_WEB_BFF_REDIS_URL: "redis://redis.internal:6379/0",
      PLATFORM_WEB_BFF_TOKEN_KEYRING: "v1.BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
      PLATFORM_WEB_BFF_RATE_LIMIT_SECRET: "bff-rate-limit-secret-32-characters",
      PLATFORM_WEB_BFF_PLATFORM_ORIGIN: "http://127.0.0.1:3300",
      PLATFORM_WEB_BFF_SITE_SELECTION_ORIGIN: "http://127.0.0.1:5004",
    }));

    expect(validateRoleEnvironment("development", "platform-web-bff", source)).toEqual([]);
  });

  test("accepts Redis without TLS for the production BFF role", () => {
    const source = parseSnapshot(renderRoleSnapshot("production", "platform-web-bff", {
      PLATFORM_WEB_ORIGIN: "https://evcs.example.com",
      PLATFORM_WEB_BFF_AUTH_ISSUER: "https://auth.example.com/platform",
      PLATFORM_WEB_BFF_OAUTH_CLIENT_SECRET: "bff-oauth-client-secret-32-characters",
      PLATFORM_WEB_BFF_REDIS_URL: "redis://redis.internal:6379/0",
      PLATFORM_WEB_BFF_TOKEN_KEYRING: "v1.BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
      PLATFORM_WEB_BFF_RATE_LIMIT_SECRET: "bff-rate-limit-secret-32-characters",
      PLATFORM_WEB_BFF_PLATFORM_ORIGIN: "https://platform.internal.example.com",
      PLATFORM_WEB_BFF_SITE_SELECTION_ORIGIN: "https://site-selection.internal.example.com",
      PLATFORM_WEB_BFF_TRUSTED_PROXY_CIDRS: "100.64.0.0/10",
    }));

    expect(validateRoleEnvironment("production", "platform-web-bff", source)).toEqual([]);
  });

  test.each([undefined, "false", "true"])(
    "allows production to omit or override ClickHouse TLS verification with %j",
    (value) => {
      const source = parseSnapshot(renderRoleSnapshot("production", "site-selection-v2-api", {}));
      if (value === undefined) delete source.SITE_SELECTION_V2_CLICKHOUSE_TLS_REJECT_UNAUTHORIZED;
      else source.SITE_SELECTION_V2_CLICKHOUSE_TLS_REJECT_UNAUTHORIZED = value;

      expect(validateRoleEnvironment("production", "site-selection-v2-api", source)
        .filter(({ key }) => key === "SITE_SELECTION_V2_CLICKHOUSE_TLS_REJECT_UNAUTHORIZED"))
        .toEqual([]);
    },
  );
});

function parseSnapshot(content: string): Record<string, string> {
  return Object.fromEntries(content.trim().split("\n").map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
}

function validAuthRuntime(): Record<string, string> {
  return {
    NODE_ENV: "development",
    AUTH_MYSQL_URL: "mysql://evcs:secret@127.0.0.1:3306/evcs",
    AUTH_PLATFORM_WEB_ORIGIN: "http://127.0.0.1:3120",
    AUTH_INTERNAL_PROVISIONING_SECRET: "provisioning-secret",
    AUTH_PLATFORM_WEB_BFF_CLIENT_SECRET: "platform-web-bff-client-secret",
    AUTH_HOST: "127.0.0.1",
    AUTH_PORT: "3200",
    AUTH_PUBLIC_URL: "http://127.0.0.1:3200",
    AUTH_BETTER_AUTH_SECRET: "better-auth-secret",
    AUTH_RATE_LIMIT_SECRET: "rate-limit-secret",
    AUTH_SMS_OUTBOX_ENCRYPTION_SECRET: "outbox-secret",
    AUTH_ACCESS_TOKEN_TTL_SECONDS: "900",
    AUTH_PLATFORM_LOGIN_TTL_SECONDS: "2592000",
    AUTH_SIGNING_KEY_ROTATION_SECONDS: "2592000",
    AUTH_SIGNING_KEY_GRACE_SECONDS: "86400",
    AUTH_PLATFORM_ENABLED: "true",
    AUTH_SMS_PROVIDER: "mock",
    AUTH_MOCK_SMS_ALLOW_NON_TTY: "true",
    AUTH_PLATFORM_OTP_RATE_LIMIT_ENABLED: "true",
    AUTH_CLIENT_IP_HEADER: "X-Real-IP",
  };
}

function validWorkerRuntime(): Record<string, string> {
  return {
    NODE_ENV: "production",
    SITE_SELECTION_V2_MYSQL_URL: "mysql://evcs:secret@mysql.internal:3306/evcs",
    SITE_SELECTION_V2_CONTACT_PHONE_ENCRYPTION_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    SITE_SELECTION_V2_LLM_PROVIDER: "openai-compatible",
    SITE_SELECTION_V2_LLM_BASE_URL: "https://llm.example.test/v1",
    SITE_SELECTION_V2_LLM_API_KEY: "secret",
    SITE_SELECTION_V2_LLM_MODEL: "model",
    SITE_SELECTION_V2_LLM_TEMPERATURE: "0.2",
    SITE_SELECTION_V2_LLM_TIMEOUT_MS: "120000",
    SITE_SELECTION_V2_LLM_MAX_OUTPUT_TOKENS: "8192",
    SITE_SELECTION_V2_LLM_MAX_INPUT_CHARS: "120000",
    SITE_SELECTION_V2_LLM_MAX_CONCURRENCY: "2",
    SITE_SELECTION_V2_WORKER_INTERVAL_SECONDS: "5",
    SITE_SELECTION_V2_WORKER_LEASE_SECONDS: "60",
    SITE_SELECTION_V2_WORKER_HEARTBEAT_SECONDS: "20",
    SITE_SELECTION_V2_WORKER_SHUTDOWN_TIMEOUT_SECONDS: "30",
  };
}
