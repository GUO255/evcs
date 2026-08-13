import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const launcher = resolve(root, "ops/pm2/run-with-env.cjs");
const fixture = resolve(root, "ops/.env.generated/.launcher-test.env");

beforeAll(() => {
  mkdirSync(resolve(root, "ops/.env.generated"), { recursive: true });
  writeFileSync(fixture, "NODE_ENV=development\nLAUNCHER_VALUE=from-file\n");
});

afterAll(() => rmSync(fixture, { force: true }));

function run(envFile: string) {
  return Bun.spawnSync({
    cmd: ["bun", launcher, "--env-file", envFile, "--", "-e", "console.log(JSON.stringify({nodeEnv:process.env.NODE_ENV,value:process.env.LAUNCHER_VALUE,parent:process.env.PARENT_ONLY,path:Boolean(process.env.PATH),home:Boolean(process.env.HOME)}))"],
    cwd: root,
    env: { ...process.env, NODE_ENV: "production", LAUNCHER_VALUE: "parent", PARENT_ONLY: "must-not-leak" },
    stdout: "pipe",
    stderr: "pipe",
  });
}

describe("isolated environment launcher", () => {
  test("uses the env file and preserves only the allowed OS environment", () => {
    const result = run("ops/.env.generated/.launcher-test.env");
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout.toString().trim())).toEqual({
      nodeEnv: "development",
      value: "from-file",
      path: true,
      home: true,
    });
  });

  test("rejects env files outside ops/.env.generated", () => {
    const result = run("apps/auth-service/README.md");
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("ops/.env.generated");
  });

  test("fails when the selected env file is missing", () => {
    const result = run("ops/.env.generated/missing.env");
    expect(result.exitCode).not.toBe(0);
  });

  test("forwards SIGTERM and then terminates with the child", async () => {
    const process = Bun.spawn({
      cmd: ["bun", launcher, "--env-file", "ops/.env.generated/.launcher-test.env", "--", "-e", "setInterval(() => {}, 1000)"],
      cwd: root,
      env: { ...globalThis.process.env },
      stdout: "ignore",
      stderr: "ignore",
    });
    await Bun.sleep(100);
    process.kill("SIGTERM");
    const result = await Promise.race([process.exited, Bun.sleep(500).then(() => "timeout" as const)]);
    if (result === "timeout") process.kill("SIGKILL");
    expect(result).not.toBe("timeout");
  });
});
