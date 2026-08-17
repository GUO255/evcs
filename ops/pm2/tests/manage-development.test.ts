import { describe, expect, test } from "bun:test";
import { runDevelopmentAction } from "../manage-development";

describe("development environment manager", () => {
  test("materializes, builds, starts, then prints the access summary", async () => {
    const events: string[] = [];
    let summaries = 0;

    await runDevelopmentAction("start", {
      materialize: async () => events.push("materialize"),
      run: async (command) => events.push(command.join(" ")),
      printSummary: async () => {
        summaries += 1;
      },
    });

    expect(events).toEqual([
      "materialize",
      "bun run --filter @evcs/auth-web build",
      "bunx pm2 start ops/pm2/ecosystem.development.config.cjs",
    ]);
    expect(summaries).toBe(1);
  });

  test("materializes before restarting, then prints the access summary", async () => {
    const events: string[] = [];
    let summaries = 0;

    await runDevelopmentAction("restart", {
      materialize: async () => events.push("materialize"),
      run: async (command) => events.push(command.join(" ")),
      printSummary: async () => {
        summaries += 1;
      },
    });

    expect(events).toEqual([
      "materialize",
      "bunx pm2 restart ops/pm2/ecosystem.development.config.cjs --update-env",
    ]);
    expect(summaries).toBe(1);
  });

  test("prints the access summary after status without running preflight", async () => {
    const events: string[] = [];
    let summaries = 0;

    await runDevelopmentAction("status", {
      materialize: async () => events.push("materialize"),
      run: async (command) => events.push(command.join(" ")),
      printSummary: async () => {
        summaries += 1;
      },
    });

    expect(events).toEqual(["bunx pm2 status"]);
    expect(summaries).toBe(1);
  });

  test("keeps stop and logs scoped without printing a summary", async () => {
    for (const [action, expected] of [
      ["stop", "bunx pm2 stop ops/pm2/ecosystem.development.config.cjs"],
      ["logs", "bunx pm2 logs evcs-development"],
    ] as const) {
      const events: string[] = [];
      let summaries = 0;
      await runDevelopmentAction(action, {
        materialize: async () => events.push("materialize"),
        run: async (command) => events.push(command.join(" ")),
        printSummary: async () => {
          summaries += 1;
        },
      });
      expect(events).toEqual([expected]);
      expect(summaries).toBe(0);
    }
  });
});
