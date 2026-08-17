import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderStableProfile } from "../generator";
import { materializeDevelopmentEnvironment } from "../scripts/materialize-development-env";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

function temporaryRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "evcs-development-env-"));
  roots.push(root);
  mkdirSync(join(root, "ops"), { recursive: true });
  writeFileSync(join(root, "ops/.env.development"), renderStableProfile("development"));
  return root;
}

describe("development environment materialization", () => {
  test("replaces explicit generation markers once in the single private local input", async () => {
    const root = temporaryRepository();
    const local = join(root, "ops/.env.development.local");
    writeFileSync(local, [
      "PLATFORM_WEB_BFF_OAUTH_CLIENT_SECRET=<generate-a-local-secret>",
      "PLATFORM_WEB_BFF_TOKEN_KEYRING=<generate-a-canonical-keyring>",
      "PLATFORM_WEB_BFF_RATE_LIMIT_SECRET=<generate-a-local-secret>",
      "",
    ].join("\n"));

    await expect(materializeDevelopmentEnvironment(root)).rejects.toThrow('"profile":"development"');
    const first = readFileSync(local, "utf8");
    expect(first).toMatch(/^PLATFORM_WEB_BFF_OAUTH_CLIENT_SECRET=[A-Za-z0-9_-]{43}$/mu);
    expect(first).toMatch(/^PLATFORM_WEB_BFF_TOKEN_KEYRING=v1\.[A-Za-z0-9_-]{43}$/mu);
    expect(first).toMatch(/^PLATFORM_WEB_BFF_RATE_LIMIT_SECRET=[A-Za-z0-9_-]{43}$/mu);

    await expect(materializeDevelopmentEnvironment(root)).rejects.toThrow('"profile":"development"');
    expect(readFileSync(local, "utf8")).toBe(first);
  });

  test("creates the single missing local input from the schema but never writes an invalid snapshot", async () => {
    const root = temporaryRepository();

    await expect(materializeDevelopmentEnvironment(root)).rejects.toThrow('"profile":"development"');
    const local = readFileSync(join(root, "ops/.env.development.local"), "utf8");
    expect(local).toContain("EVCS_DATABASE_URL=mysql://evcs:<password>@127.0.0.1:3306/evcs");
    expect(local).toContain("PLATFORM_WEB_BFF_OAUTH_CLIENT_SECRET=");
    expect(existsSync(join(root, "ops/.env.generated/development.auth-service.env"))).toBe(false);
  });
});
