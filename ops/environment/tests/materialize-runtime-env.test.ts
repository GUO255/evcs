import { describe, expect, test } from "bun:test";
import { parseMaterializeArgs } from "../scripts/materialize-runtime-env";

describe("runtime environment materialization CLI", () => {
  test("accepts only the centralized profile, role, and output directory", () => {
    expect(parseMaterializeArgs([
      "--profile", "production",
      "--role", "site-selection-service-worker",
      "--output-dir", "ops/.env.generated",
    ])).toEqual({
      profile: "production",
      role: "site-selection-service-worker",
      outputDir: "ops/.env.generated",
    });
  });

  test("rejects the removed per-service external file input", () => {
    expect(() => parseMaterializeArgs([
      "--profile", "production",
      "--role", "auth-service",
      "--output-dir", "ops/.env.generated",
      "--external-file", "ops/.env.production.local",
    ])).toThrow("Unknown materialize argument: --external-file");
  });
});
