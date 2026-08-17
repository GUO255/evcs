import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import {
  collectDevelopmentStatus,
  developmentAdminerContainer,
  developmentAdminerUrl,
  developmentDatabaseContainer,
  developmentFrontendPages,
  developmentHostMysqlPort,
  renderDevelopmentStatusSummary,
} from "../status-summary";

const root = resolve(import.meta.dir, "../../..");
const require = createRequire(import.meta.url);
const ecosystem = require(resolve(root, "ops/pm2/ecosystem.development.config.cjs"));

function container(name: string, state: "running" | "exited" | "missing" | "unavailable", detail = "") {
  return { name, state, detail };
}

function snapshot(
  processes = [],
  database = {
    mysql: container(developmentDatabaseContainer, "missing"),
    adminer: container(developmentAdminerContainer, "missing"),
    forward: { port: developmentHostMysqlPort, active: false },
  },
) {
  return { processes, database };
}

describe("development status summary", () => {
  test("declares frontend pages backed by ecosystem processes", () => {
    const ecosystemNames = ecosystem.apps.map(({ name }: { name: string }) => name);
    for (const page of developmentFrontendPages) {
      expect(ecosystemNames).toContain(page.process);
    }
    expect(developmentFrontendPages.map(({ label }) => label)).toEqual(["Auth login", "Platform web"]);
  });

  test("renders only frontend page urls with their process statuses", () => {
    const rendered = renderDevelopmentStatusSummary(
      snapshot([
        { name: "evcs-auth-web-builder", status: "online" },
        { name: "evcs-platform-web", status: "online" },
      ]),
    );

    expect(rendered).toContain("Frontend pages");
    expect(rendered).toContain("Auth login");
    expect(rendered).toContain("Platform web");
    expect(rendered).toContain("http://127.0.0.1:3220");
    expect(rendered).toContain("http://127.0.0.1:3250");
    expect(rendered).not.toContain("3210");
    expect(rendered).not.toContain("3230");
    expect(rendered).not.toContain("3240");
    expect(rendered).not.toContain("3260");
    expect(rendered).not.toContain("8000");
    expect(rendered).not.toMatch(/password|secret|api[_-]?key/i);
  });

  test("marks frontend processes that pm2 has not started yet", () => {
    const rendered = renderDevelopmentStatusSummary(snapshot([]));
    expect(rendered).toContain("not started");
  });

  test("renders mysql and adminer container state", () => {
    const rendered = renderDevelopmentStatusSummary(
      snapshot([], {
        mysql: container(developmentDatabaseContainer, "running", "Up 8 minutes (healthy)  127.0.0.1:3306->3306/tcp"),
        adminer: container(developmentAdminerContainer, "running", "Up 2 seconds  127.0.0.1:8081->8080/tcp"),
        forward: { port: developmentHostMysqlPort, active: true },
      }),
    );
    expect(rendered).toContain("Database (Docker)");
    expect(rendered).toContain("Up 8 minutes (healthy)");
    expect(rendered).toContain(developmentAdminerContainer);
    expect(rendered).toContain(developmentAdminerUrl);
  });

  test("guides the user when the mysql or adminer container is unavailable", () => {
    const missing = renderDevelopmentStatusSummary(snapshot());
    expect(missing).toContain("bun run db:dev:start");
    expect(missing).toContain("bun run db:adminer");

    const unavailable = renderDevelopmentStatusSummary(
      snapshot([], {
        mysql: container(developmentDatabaseContainer, "unavailable", "colima down"),
        adminer: container(developmentAdminerContainer, "unavailable", "colima down"),
        forward: { port: developmentHostMysqlPort, active: false },
      }),
    );
    expect(unavailable).toContain("colima start");
  });

  test("renders the host mysql forward state", () => {
    const active = renderDevelopmentStatusSummary(
      snapshot([], {
        mysql: container(developmentDatabaseContainer, "running"),
        adminer: container(developmentAdminerContainer, "running"),
        forward: { port: developmentHostMysqlPort, active: true },
      }),
    );
    expect(active).toContain(`Host MySQL forward  127.0.0.1:${developmentHostMysqlPort}  active`);

    const inactive = renderDevelopmentStatusSummary(
      snapshot([], {
        mysql: container(developmentDatabaseContainer, "running"),
        adminer: container(developmentAdminerContainer, "running"),
        forward: { port: developmentHostMysqlPort, active: false },
      }),
    );
    expect(inactive).toContain(`Host MySQL forward  127.0.0.1:${developmentHostMysqlPort}  inactive`);
    expect(inactive).toContain("bun run db:forward");
  });

  test("collects the host mysql forward probe result", async () => {
    const snapshotResult = await collectDevelopmentStatus(async (command) => {
      if (command.includes("jlist")) return JSON.stringify([]);
      if (command[3] === developmentDatabaseContainer) return "Up 3 seconds (healthy)|127.0.0.1:3306->3306/tcp";
      return "Up 5 seconds|127.0.0.1:8081->8080/tcp";
    }, async (port) => port === developmentHostMysqlPort);
    expect(snapshotResult.database.forward).toEqual({ port: developmentHostMysqlPort, active: true });
  });

  test("collects pm2 processes and both container snapshots", async () => {
    const calls: string[][] = [];
    const snapshotResult = await collectDevelopmentStatus(async (command) => {
      calls.push(command);
      if (command.includes("jlist")) {
        return JSON.stringify([
          { name: "evcs-auth-web-builder", pm2_env: { status: "online" } },
          { name: "evcs-platform-web", pm2_env: { status: "stopped" } },
        ]);
      }
      if (command[3] === developmentDatabaseContainer) {
        return "Up 3 seconds (healthy)|127.0.0.1:3306->3306/tcp";
      }
      return "Up 5 seconds|127.0.0.1:8081->8080/tcp";
    });

    expect(snapshotResult.processes).toEqual([
      { name: "evcs-auth-web-builder", status: "online" },
      { name: "evcs-platform-web", status: "stopped" },
    ]);
    expect(snapshotResult.database.mysql.state).toBe("running");
    expect(snapshotResult.database.adminer.state).toBe("running");
    expect(calls.filter((command) => command[1] === "ps")).toHaveLength(2);
  });
});
