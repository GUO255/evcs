import { describe, expect, test } from "bun:test";
import { runDevelopmentAction } from "../manage-development";

describe("development environment manager", () => {
  test("materializes and builds before starting the scoped ecosystem", async () => {
    const events: string[] = [];

    await runDevelopmentAction("start", {
      materialize: async () => events.push("materialize"),
      run: async (command) => events.push(command.join(" ")),
    });

    expect(events).toEqual([
      "materialize",
      "bun run --filter @evcs/auth-web build",
      "bunx pm2 start ops/pm2/ecosystem.development.config.cjs",
    ]);
  });

  test("materializes before restarting with updated environment", async () => {
    const events: string[] = [];

    await runDevelopmentAction("restart", {
      materialize: async () => events.push("materialize"),
      run: async (command) => events.push(command.join(" ")),
    });

    expect(events).toEqual([
      "materialize",
      "bunx pm2 restart ops/pm2/ecosystem.development.config.cjs --update-env",
    ]);
  });

  test("keeps stop, logs, and status scoped without running preflight", async () => {
    for (const [action, expected] of [
      ["stop", "bunx pm2 stop ops/pm2/ecosystem.development.config.cjs"],
      ["logs", "bunx pm2 logs evcs-development"],
      ["status", "bunx pm2 status"],
    ] as const) {
      const events: string[] = [];
      await runDevelopmentAction(action, {
        materialize: async () => events.push("materialize"),
        run: async (command) => events.push(command.join(" ")),
      });
      expect(events).toEqual([expected]);
    }
  });
});
