import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  expectedEnvironmentFiles,
  materializeRoleEnvironment,
  renderDeploymentExample,
  renderExternalExample,
  renderRoleSnapshot,
  renderStableProfile,
} from "../generator";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true });
});

describe("environment generator", () => {
  test("generates one stable file per profile and no per-service examples", () => {
    expect(Object.keys(expectedEnvironmentFiles()).sort()).toEqual([
      "ops/.env.development",
      "ops/.env.production",
      "ops/deploy/production/compose.config.example",
    ]);
  });
  test("stable profile excludes external values", () => {
    const output = renderStableProfile("production");
    expect(output).toContain("# 用途：");
    expect(output).toContain("AUTH_PORT=3200");
    expect(output).toContain("SITE_SELECTION_V2_WORKER_LEASE_SECONDS=60");
    expect(output).not.toContain("AUTH_BETTER_AUTH_SECRET");
    expect(output).not.toContain("EVCS_DATABASE_URL");
  });

  test("external example uses canonical deployment keys", () => {
    const output = renderExternalExample("development", ["auth-service", "platform-service"]);
    expect(output).toContain("；用途：");
    expect(output.match(/^EVCS_DATABASE_URL=/gmu)).toHaveLength(1);
    expect(output).toContain("AUTH_INTERNAL_PROVISIONING_SECRET=");
    expect(output).not.toContain("AUTH_MYSQL_URL=");
    expect(output).not.toContain("PLATFORM_MYSQL_URL=");
    expect(output).toContain("AUTH_PUBLIC_URL=http://127.0.0.1:3200");
    expect(output).toContain("PLATFORM_AUTH_ISSUER=http://127.0.0.1:3200/platform");
  });

  test("production browser example contains map values without direct API endpoints", () => {
    const output = renderExternalExample("production", ["auth-service", "platform-web-build"]);
    expect(output).toContain("AUTH_PUBLIC_URL=https://evcs-auth.hztgwm.com");
    expect(output).toContain("PUBLIC_AMAP_KEY=<replace-with-amap-browser-key>");
    expect(output).not.toContain("PUBLIC_PLATFORM_API_BASE_URL");
    expect(output).not.toContain("PUBLIC_AUTH_BASE_URL");
    expect(output).toContain("AUTH_BETTER_AUTH_SECRET=<replace-with-unique-32-plus-character-secret>");
    expect(output).not.toContain("super-secret");
  });

  test("auth snapshot maps canonical shared inputs", () => {
    const output = renderRoleSnapshot("development", "auth-service", {
      EVCS_DATABASE_URL: "mysql://evcs:secret@127.0.0.1:3306/evcs",
      AUTH_INTERNAL_PROVISIONING_SECRET: "secret",
    });
    expect(output).toContain("AUTH_MYSQL_URL=mysql://evcs:secret@127.0.0.1:3306/evcs");
    expect(output).toContain("AUTH_INTERNAL_PROVISIONING_SECRET=secret");
    expect(output).not.toContain("EVCS_DATABASE_URL=");
    expect(output).not.toContain("PLATFORM_MYSQL_URL=");
  });

  test("Platform Web BFF snapshot shares one confidential client secret with Auth", () => {
    const externalValues = {
      PLATFORM_WEB_ORIGIN: "http://127.0.0.1:3120",
      PLATFORM_WEB_BFF_OAUTH_CLIENT_SECRET: "bff-oauth-client-secret-32-characters",
      PLATFORM_WEB_BFF_AUTH_ISSUER: "http://127.0.0.1:3200/platform",
      PLATFORM_WEB_BFF_REDIS_URL: "redis://127.0.0.1:6379/0",
      PLATFORM_WEB_BFF_TOKEN_KEYRING: "v1.BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc",
      PLATFORM_WEB_BFF_RATE_LIMIT_SECRET: "bff-rate-limit-secret-32-characters",
      PLATFORM_WEB_BFF_PLATFORM_ORIGIN: "http://127.0.0.1:3300",
      PLATFORM_WEB_BFF_SITE_SELECTION_ORIGIN: "http://127.0.0.1:5004",
    };
    const bff = renderRoleSnapshot("development", "platform-web-bff", externalValues);
    const auth = renderRoleSnapshot("development", "auth-service", externalValues);

    expect(bff).toContain("PLATFORM_WEB_BFF_OAUTH_CLIENT_SECRET=bff-oauth-client-secret-32-characters");
    expect(auth).toContain("AUTH_PLATFORM_WEB_BFF_CLIENT_SECRET=bff-oauth-client-secret-32-characters");
    expect(bff).toContain("PLATFORM_WEB_BFF_PORT=3210");
    expect(bff).toContain("PLATFORM_WEB_BFF_SESSION_TTL_SECONDS=2592000");
  });

  test("worker snapshot excludes API-only variables", () => {
    const output = renderRoleSnapshot("production", "site-selection-v2-worker", {});
    expect(output).toContain("SITE_SELECTION_V2_MYSQL_URL=");
    expect(output).toContain("SITE_SELECTION_V2_WORKER_LEASE_SECONDS=60");
    expect(output).not.toContain("SITE_SELECTION_V2_OSS_BUCKET");
    expect(output).not.toContain("SITE_SELECTION_V2_SERVICE_PORT");
  });

  test("API snapshot excludes worker-only LLM concurrency", () => {
    const api = renderRoleSnapshot("development", "site-selection-v2-api", {});
    const worker = renderRoleSnapshot("development", "site-selection-v2-worker", {});
    expect(api).not.toContain("SITE_SELECTION_V2_LLM_MAX_CONCURRENCY=");
    expect(worker).toContain("SITE_SELECTION_V2_LLM_MAX_CONCURRENCY=2");
  });

  test("deployment example includes deployment inputs and external inputs only", () => {
    const output = renderDeploymentExample("production");
    expect(output).toContain("；用途：");
    expect(output).toContain("EVCS_AUTH_IMAGE=evcs-auth-service:local");
    expect(output).toContain("EVCS_DATABASE_URL=");
    expect(output).not.toMatch(/^AUTH_PORT=3200$/mu);
    expect(output).not.toMatch(/^PLATFORM_AUTH_ALGORITHM=EdDSA$/mu);
  });

  test("deployment example keeps each variable annotation on one line and separates entries", () => {
    const output = renderDeploymentExample("production");
    expect(output).toContain(
      "# 生产镜像仓库地址；用途：配置生产镜像仓库地址，供生产部署流程使用。\n"
      + "EVCS_ACR_REGISTRY=registry.cn-hangzhou.aliyuncs.com\n\n"
      + "# 生产镜像仓库命名空间；用途：配置生产镜像仓库命名空间，供生产部署流程使用。\n"
      + "EVCS_ACR_NAMESPACE=tgwm-electric",
    );
    expect(output).not.toContain("\n# 用途：");
  });

  test("generates canonical legacy server and browser inputs", () => {
    const server = renderExternalExample("production", ["site-selection-service-api", "site-selection-service-worker"]);
    const browser = renderExternalExample("production", ["site-selection-web-build"]);
    expect(server).toContain("EVCS_DATABASE_URL=");
    expect(server).toContain("SITE_SELECTION_SESSION_SECRET=");
    expect(server).not.toMatch(/^DATABASE_URL=/mu);
    expect(browser).toContain("PUBLIC_API_BASE_URL=https://site-agent-service.hztgwm.com");
    expect(browser).toContain("# PUBLIC_AMAP_KEY=<replace-with-amap-browser-key>");
    expect(browser).not.toContain("PORT=3003");
  });

  test("materializes one validated role atomically", async () => {
    const outputDir = mkdtempSync(join(tmpdir(), "evcs-env-generator-"));
    temporaryDirectories.push(outputDir);
    const output = await materializeRoleEnvironment({
      profile: "development",
      role: "platform-web-build",
      outputDir,
      validateRequired: true,
      externalValues: {
        PUBLIC_AMAP_KEY: "amap-key",
        PUBLIC_AMAP_SECURITY_JS_CODE: "amap-security-code",
      },
    });
    expect(readFileSync(output, "utf8")).toContain("PORT=3120");
    expect(readFileSync(output, "utf8")).toContain("PUBLIC_AMAP_KEY=amap-key");
    expect(statSync(output).mode & 0o777).toBe(0o600);
  });

  test("does not write a role snapshot when required input is invalid", async () => {
    const outputDir = mkdtempSync(join(tmpdir(), "evcs-env-generator-"));
    temporaryDirectories.push(outputDir);
    const output = join(outputDir, "production.auth-service.env");
    await expect(materializeRoleEnvironment({
      profile: "production",
      role: "auth-service",
      outputDir,
      validateRequired: true,
      externalValues: {},
    })).rejects.toThrow('"role":"auth-service"');
    expect(existsSync(output)).toBe(false);
  });
});
