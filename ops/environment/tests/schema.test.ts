import { describe, expect, test } from "bun:test";
import {
  activeEnvironmentRoles,
  deploymentVariables,
  environmentProfiles,
  environmentRoles,
  environmentVariables,
  keysByRole,
} from "../schema";

describe("environment schema", () => {
  test("declares the Platform Web BFF as an active server role", () => {
    expect(activeEnvironmentRoles).toContain("platform-web-bff");
    expect(keysByRole["platform-web-bff"]).toEqual([
      "NODE_ENV",
      "EVCS_DATABASE_URL",
      "PLATFORM_WEB_ORIGIN",
      "PLATFORM_WEB_BFF_HOST",
      "PLATFORM_WEB_BFF_PORT",
      "PLATFORM_WEB_BFF_AUTH_ISSUER",
      "PLATFORM_WEB_BFF_OAUTH_CLIENT_ID",
      "PLATFORM_WEB_BFF_OAUTH_CLIENT_SECRET",
      "PLATFORM_WEB_BFF_OAUTH_RESOURCE",
      "PLATFORM_WEB_BFF_OAUTH_SCOPES",
      "PLATFORM_WEB_BFF_REDIS_URL",
      "PLATFORM_WEB_BFF_TOKEN_KEYRING",
      "PLATFORM_WEB_BFF_RATE_LIMIT_SECRET",
      "PLATFORM_WEB_BFF_SESSION_TTL_SECONDS",
      "PLATFORM_WEB_BFF_LOGIN_TTL_SECONDS",
      "PLATFORM_WEB_BFF_AUTH_TIMEOUT_MS",
      "PLATFORM_WEB_BFF_PROXY_TIMEOUT_MS",
      "PLATFORM_WEB_BFF_MAX_REQUEST_BYTES",
      "PLATFORM_WEB_BFF_PLATFORM_ORIGIN",
      "PLATFORM_WEB_BFF_SITE_SELECTION_ORIGIN",
      "PLATFORM_WEB_BFF_CLIENT_IP_HEADER",
      "PLATFORM_WEB_BFF_TRUSTED_PROXY_CIDRS",
    ]);
  });

  test("defines every profile for every variable", () => {
    for (const [key, definition] of Object.entries(environmentVariables)) {
      expect(definition.roles.length, key).toBeGreaterThan(0);
      expect(definition.purpose.trim().length, key).toBeGreaterThan(0);
      expect(definition.description, key).toMatch(/[\u3400-\u9fff]/u);
      expect(definition.purpose, key).toMatch(/[\u3400-\u9fff]/u);
      for (const profile of environmentProfiles) {
        expect(definition.environments[profile], `${key}:${profile}`).toBeDefined();
      }
    }
  });

  test("uses Chinese descriptions and purposes for deployment variables", () => {
    for (const [key, definition] of Object.entries(deploymentVariables)) {
      expect(definition.description, key).toMatch(/[\u3400-\u9fff]/u);
      expect(definition.purpose, key).toMatch(/[\u3400-\u9fff]/u);
    }
  });

  test("keeps browser build values non-sensitive", () => {
    for (const [key, definition] of Object.entries(environmentVariables)) {
      if (definition.exposure !== "build-public") continue;
      expect(definition.sensitive, key).not.toBe(true);
      expect(definition.roles.some((role) => role.endsWith("-build")), key).toBe(true);
    }
  });

  test("aliases are unique within each role", () => {
    for (const role of environmentRoles) {
      const outputs = Object.entries(environmentVariables).flatMap(([key, definition]) =>
        definition.roles.includes(role) ? [definition.aliases?.[role] ?? key] : [],
      );
      expect(new Set(outputs).size, role).toBe(outputs.length);
    }
  });

  test("assigns legacy Site Selection keys to explicit consumers", () => {
    expect(keysByRole["site-selection-service-api"]).toEqual(expect.arrayContaining([
      "EVCS_DATABASE_URL",
      "SITE_SELECTION_SESSION_SECRET",
      "HEAVY_TRUCK_SSO_SHARED_SECRET",
      "AGENTOS_BASE_URL",
      "AGENTOS_API_KEY",
    ]));
    expect(keysByRole["site-selection-service-worker"]).toEqual(expect.arrayContaining([
      "EVCS_DATABASE_URL",
      "SITE_ANALYSIS_SCAN_BATCH_SIZE",
      "AGENTOS_SITE_ANALYSIS_REPORT_AGENT_ID",
    ]));
    expect(keysByRole["site-selection-web-build"]).toEqual(expect.arrayContaining([
      "SITE_SELECTION_WEB_PORT",
      "PUBLIC_API_BASE_URL",
      "PUBLIC_TRAFFIC_DEFAULT_WINDOW_START",
    ]));
  });
});
