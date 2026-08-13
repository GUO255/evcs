import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { scanEnvironmentSource, scanRuntimeEnvironmentUsage } from "../scripts/scan-runtime-env-usage";

describe("runtime environment usage scanner", () => {
  test("rejects server environment access outside an approved boundary", () => {
    expect(scanEnvironmentSource({
      path: "apps/platform-service/src/domain.ts",
      content: "process.env.PLATFORM_SERVICE_PORT",
    })).toContainEqual(expect.objectContaining({ message: "Direct application environment access is not allowed" }));
  });

  test("allows declared server access at an approved boundary", () => {
    expect(scanEnvironmentSource({
      path: "apps/platform-service/src/config/env.ts",
      content: "process.env.PLATFORM_SERVICE_PORT",
    })).toEqual([]);
  });

  test("allows declared browser access only at its configuration boundary", () => {
    expect(scanEnvironmentSource({
      path: "apps/platform-web/src/config/env.ts",
      content: "import.meta.env.PUBLIC_AMAP_KEY",
    })).toEqual([]);
    expect(scanEnvironmentSource({
      path: "apps/platform-web/src/feature.ts",
      content: "import.meta.env.PUBLIC_AMAP_KEY",
    })).toContainEqual(expect.objectContaining({ message: "Direct browser environment access is not allowed" }));
  });

  test("rejects undeclared and computed boundary access safely", () => {
    expect(scanEnvironmentSource({
      path: "apps/auth-service/src/config/env.ts",
      content: "process.env.EVCS_UNDECLARED",
    })).toContainEqual(expect.objectContaining({ key: "EVCS_UNDECLARED", message: "Environment variable is not declared" }));
    expect(scanEnvironmentSource({
      path: "apps/platform-service/src/domain.ts",
      content: "process.env[name]",
    })).toContainEqual(expect.objectContaining({ key: undefined, message: "Direct application environment access is not allowed" }));
  });

  test("scans Platform Web BFF as an active application", () => {
    expect(scanEnvironmentSource({
      path: "apps/platform-web-bff/src/domain.ts",
      content: "process.env.PLATFORM_WEB_BFF_PORT",
    })).toContainEqual(expect.objectContaining({
      message: "Direct application environment access is not allowed",
    }));
  });

  test("scans shell and Python environment reads", () => {
    expect(scanEnvironmentSource({
      path: "ops/example.sh",
      content: 'echo "$EVCS_UNKNOWN"',
    })).toContainEqual(expect.objectContaining({
      key: "EVCS_UNKNOWN",
      message: "Environment variable is not declared",
    }));
    expect(scanEnvironmentSource({
      path: "ops/example.py",
      content: "os.getenv('EVCS_UNKNOWN')",
    })).toContainEqual(expect.objectContaining({
      key: "EVCS_UNKNOWN",
      message: "Environment variable is not declared",
    }));
  });

  test("discovers newly added application roots automatically", () => {
    const root = mkdtempSync(resolve(tmpdir(), "evcs-env-scan-"));
    try {
      mkdirSync(resolve(root, "apps/example/src"), { recursive: true });
      mkdirSync(resolve(root, "ops"), { recursive: true });
      writeFileSync(
        resolve(root, "apps/example/src/config.ts"),
        "process.env.EVCS_UNDECLARED",
      );
      expect(scanRuntimeEnvironmentUsage(root)).toContainEqual(expect.objectContaining({
        path: "apps/example/src/config.ts",
        message: "Direct application environment access is not allowed",
      }));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("the active application tree has no boundary violations", () => {
    expect(scanRuntimeEnvironmentUsage(import.meta.dir.replace(/\/ops\/environment\/tests$/u, ""))).toEqual([]);
  });
});
