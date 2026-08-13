import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { parseHealthcheckInput } from "../scripts/container-healthcheck";
import { validateRuntimeEnvironment } from "../scripts/validate-runtime-env";

describe("container runtime scripts", () => {
  test("entrypoint validates the selected snapshot before exec", async () => {
    const source = await Bun.file(resolve(import.meta.dir, "../scripts/container-entrypoint.sh")).text();
    const validateAt = source.indexOf("validate-runtime-env.ts");
    const execAt = source.indexOf("exec bun --no-env-file");
    expect(source).toContain('profile="${EVCS_ENVIRONMENT_PROFILE:-production}"');
    expect(source).toContain('env_file="/app/runtime-env/${profile}.${role}.env"');
    expect(validateAt).toBeGreaterThan(-1);
    expect(execAt).toBeGreaterThan(validateAt);
    expect(source).not.toContain("printenv");
    expect(source).not.toContain("set -x");
  });

  test("healthcheck accepts exactly one valid port key and absolute path", () => {
    expect(parseHealthcheckInput(["AUTH_PORT", "/health/ready"], { AUTH_PORT: "3200" })).toEqual({
      port: 3200,
      path: "/health/ready",
    });
    expect(() => parseHealthcheckInput(["AUTH_PORT", "/health/ready"], { AUTH_PORT: "0" })).toThrow("AUTH_PORT");
    expect(() => parseHealthcheckInput(["AUTH_PORT", "health/ready"], { AUTH_PORT: "3200" })).toThrow("path");
    expect(() => parseHealthcheckInput(["AUTH_PORT"], { AUTH_PORT: "3200" })).toThrow("usage");
  });

  test("runtime validation accepts exactly one declared profile and role", () => {
    expect(validateRuntimeEnvironment(["production", "auth-web-build"], { NODE_ENV: "production" })).toEqual({
      ok: true,
      profile: "production",
      role: "auth-web-build",
    });
    expect(() => validateRuntimeEnvironment(["production"], {})).toThrow("usage");
    expect(() => validateRuntimeEnvironment(["production", "unknown-role"], {})).toThrow("role");
  });
});
