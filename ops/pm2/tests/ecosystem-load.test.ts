import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const require = createRequire(import.meta.url);

describe("PM2 ecosystem loading", () => {
  for (const environment of ["development"] as const) {
    test(`${environment} exports loadable apps with generated role snapshots`, () => {
      const config = require(resolve(root, `ops/pm2/ecosystem.${environment}.config.cjs`));
      expect(Array.isArray(config.apps)).toBe(true);
      for (const app of config.apps) {
        expect(typeof app.name).toBe("string");
        expect(app.cwd).toBe(root);
        expect(Array.isArray(app.args)).toBe(true);
        expect(typeof app.autorestart).toBe("boolean");
        expect(typeof app.watch).toBe("boolean");
        if (app.name === "evcs-site-selection-titiler") {
          expect(app.script).toBe("bun");
          expect(app.args).toEqual(["ops/site-selection/scripts/run-titiler.ts"]);
          continue;
        }
        expect(app.script).toBe(resolve(root, "ops/pm2/run-with-env.cjs"));
        const envPath = app.args[1];
        expect(envPath).toMatch(new RegExp(`^ops/\\.env\\.generated/${environment}\\.[a-z0-9-]+\\.env$`));
      }
    });
  }
});
