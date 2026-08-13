import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const require = createRequire(import.meta.url);
const development = require(resolve(root, "ops/pm2/ecosystem.development.config.cjs"));

const developmentNames = [
  "evcs-auth-service",
  "evcs-platform-service",
  "evcs-site-selection-v2-service",
  "evcs-platform-web-bff",
  "evcs-platform-web",
  "evcs-site-selection-worker",
  "evcs-site-selection-titiler",
  "evcs-auth-web-builder",
];
describe("PM2 ecosystem contract", () => {
  test("declares the exact development process names", () => {
    expect(development.apps.map(({ name }: { name: string }) => name)).toEqual(developmentNames);
    expect(development.apps.every(({ namespace }: { namespace?: string }) => namespace === "evcs-development")).toBeTrue();
  });

  test("never places environment values or secrets in PM2 configuration", () => {
    for (const app of development.apps) {
      expect(app.env).toBeUndefined();
      expect(app.env_development).toBeUndefined();
      expect(app.env_production).toBeUndefined();
      expect(JSON.stringify(app)).not.toMatch(/password|secret|api[_-]?key/i);
    }
  });

  test("uses the exact development launcher arguments", () => {
    const expectedDevelopment = [
      ["development.auth-service.env", "run", "--filter", "@evcs/auth-service", "dev"],
      ["development.platform-service.env", "run", "--filter", "@evcs/platform-service", "dev"],
      ["development.site-selection-v2-api.env", "run", "--filter", "@evcs/site-selection-v2-service", "dev"],
      ["development.platform-web-bff.env", "run", "--filter", "@evcs/platform-web-bff", "dev"],
      ["development.platform-web-build.env", "run", "--filter", "@evcs/platform-web", "dev"],
      ["development.site-selection-v2-worker.env", "run", "--filter", "@evcs/site-selection-v2-service", "dev:worker"],
    ];
    for (const [index, [service, ...bunArgs]] of expectedDevelopment.entries()) {
      expect(development.apps[index].args).toEqual(["--env-file", `ops/.env.generated/${service}`, "--", ...bunArgs]);
    }
    expect(development.apps[6]).toMatchObject({
      script: "bun",
      args: ["ops/site-selection/scripts/run-titiler.ts"],
    });
    expect(development.apps[7].args).toEqual([
      "--env-file",
      "ops/.env.generated/development.auth-web-build.env",
      "--",
      "run",
      "--filter",
      "@evcs/auth-web",
      "dev",
    ]);
  });
});
