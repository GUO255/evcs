import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const rootReadme = readFileSync(resolve(root, "README.md"), "utf8");
const operationsReadme = readFileSync(resolve(root, "ops/pm2/README.md"), "utf8");
const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");
const applicationReadmes = ["auth-service", "platform-service", "site-selection-v2-service", "platform-web-bff", "platform-web"]
  .map((name) => readFileSync(resolve(root, `apps/${name}/README.md`), "utf8"));
const coreApplications = ["auth-service", "platform-service", "site-selection-v2-service", "platform-web-bff", "platform-web"];

const requiredScripts = [
  "dev",
  "dev:restart",
  "dev:stop",
  "dev:logs",
  "dev:status",
];

const removedRootImplementationScripts = [
  "env:materialize",
  "env:site-selection:development",
  "env:site-selection:production-runtime",
  "env:site-selection:production-web",
  "auth:web:build",
  "pm2:dev:start",
  "pm2:dev:restart",
  "pm2:dev:stop",
  "pm2:dev:delete",
  "pm2:dev:logs",
  "pm2:status",
  "build:platform-web:prod",
  "build:auth-web:prod",
  "dev:site-selection",
  "stop:site-selection",
  "build:site-selection:prod",
  "pm2:site-selection:prod:start",
  "pm2:site-selection:prod:reload",
  "pm2:site-selection:prod:stop",
  "pm2:site-selection:prod:logs",
  "deploy:site-selection:prod",
];

const removedProductionScripts = ["pm2:prod:start", "pm2:prod:reload-apis", "pm2:prod:restart-worker", "pm2:prod:stop", "pm2:prod:logs"];

describe("root PM2 operations contract", () => {
  test("exposes every required operation without global PM2 commands", () => {
    for (const name of requiredScripts) {
      const command = packageJson.scripts[name];
      expect(command, `missing ${name}`).toBeString();
      expect(command).not.toContain("pm2 kill");
      expect(command).not.toMatch(/pm2 (stop|delete|restart|reload|logs) all(?:\s|$)/);
      expect(command).toStartWith("bun ops/pm2/manage-development.ts ");
    }
  });

  test("uses one development log stream and one status command", () => {
    expect(packageJson.scripts["dev:logs"]).toBe("bun ops/pm2/manage-development.ts logs");
    expect(packageJson.scripts["dev:status"]).toBe("bun ops/pm2/manage-development.ts status");
  });

  test("keeps development implementation details out of the root command surface", () => {
    for (const name of removedRootImplementationScripts) {
      expect(packageJson.scripts[name], `obsolete root script: ${name}`).toBeUndefined();
    }
  });

  test("keeps only the legacy Site Selection local development entrypoints", () => {
    expect(packageJson.scripts["legacy-site-selection:dev"]).toStartWith("bun ops/site-selection/scripts/materialize-environment.ts development && ");
    expect(packageJson.scripts["legacy-site-selection:stop"]).toBe("bun ops/site-selection/scripts/stop.ts");
  });

  test("removes every production PM2 fallback", () => {
    for (const name of removedProductionScripts) expect(packageJson.scripts[name]).toBeUndefined();
    expect(existsSync(resolve(root, "ops/pm2/ecosystem.production.config.cjs"))).toBe(false);
    expect(existsSync(resolve(root, "ops/site-selection/pm2/ecosystem.config.cjs"))).toBe(false);
    expect(existsSync(resolve(root, "ops/site-selection/scripts/deploy-production.ts"))).toBe(false);
    expect(existsSync(resolve(root, "deploy/Dockerfile"))).toBe(false);
    expect(existsSync(resolve(root, "ops/.env.production"))).toBe(true);
    expect(existsSync(resolve(root, "ops/env"))).toBe(false);
    for (const path of [
      "ops/site-selection/env/service.local.env",
      "ops/site-selection/env/service.production.env",
      "ops/site-selection/env/service.test.env",
      "ops/site-selection/env/web.local.env",
      "ops/site-selection/env/web.production.env",
    ]) expect(existsSync(resolve(root, path)), path).toBe(false);
  });

  test("uses exactly two centralized development inputs for core applications", () => {
    expect(existsSync(resolve(root, "apps/dev-debug-web"))).toBe(false);
    expect(existsSync(resolve(root, "ops/.env.development"))).toBe(true);
    expect(gitignore).toContain(".env.development.local");
    expect(gitignore).toContain("ops/.env.generated/");
    for (const name of coreApplications) {
      expect(existsSync(resolve(root, `apps/${name}/.env.example`))).toBe(false);
    }
    for (const readme of applicationReadmes) {
      expect(readme).not.toMatch(/apps\/(?:auth-service|platform-service|platform-web)\/\.env\.example/u);
      expect(readme).toContain("ops/.env.development.local");
      expect(readme).toContain("ops/.env.generated/");
    }
  });

  test("documents the complete operating and safety contract", () => {
    expect(rootReadme).toContain("ops/pm2/README.md");
    for (const topic of [
      "evcs",
      "ops/.env.development",
      "ops/.env.development.local",
      "bun run dev",
      "bun run dev:logs",
      "bun run dev:stop",
      "bun run dev:restart",
      "Mock OTP",
      "pm2 flush evcs-auth-service",
      "strictPort",
      "ACK",
    ]) {
      expect(operationsReadme, `missing documentation topic: ${topic}`).toContain(topic);
    }
  });

  test("documents centralized environment operations", () => {
    expect(rootReadme).toContain("bun run env:generate");
    expect(rootReadme).toContain("bun run env:contract:check");
    expect(rootReadme).toContain("ops/.env.development");
    expect(rootReadme).toContain("ops/.env.development.local");
    expect(rootReadme).toContain("ops/.env.generated/");
    expect(rootReadme).toContain("bun run db:dev:start");
    expect(rootReadme).toContain("bun run db:dev:migrate");
  });
});
