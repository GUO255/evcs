export interface DevelopmentProcessSnapshot {
  name: string;
  status: string;
}

export interface DevelopmentContainerSnapshot {
  name: string;
  state: "running" | "exited" | "missing" | "unavailable";
  detail: string;
}

export interface DevelopmentDatabaseSnapshot {
  mysql: DevelopmentContainerSnapshot;
  adminer: DevelopmentContainerSnapshot;
  forward: {
    port: number;
    active: boolean;
  };
}

export interface DevelopmentStatusSnapshot {
  processes: DevelopmentProcessSnapshot[];
  database: DevelopmentDatabaseSnapshot;
}

export const developmentFrontendPages: ReadonlyArray<{
  label: string;
  process: string;
  url: string;
}> = [
  { label: "Auth login", process: "evcs-auth-web-builder", url: "http://127.0.0.1:3220" },
  { label: "Platform web", process: "evcs-platform-web", url: "http://127.0.0.1:3250" },
];

export const developmentDatabaseContainer = "database-mysql-development-1";
export const developmentAdminerContainer = "evcs-database-adminer";
export const developmentAdminerUrl = "http://127.0.0.1:8081";
export const developmentHostMysqlPort = 3307;

function renderContainer(container: DevelopmentContainerSnapshot, fallback: string): string {
  switch (container.state) {
    case "running":
    case "exited":
      return `  ${container.name}  ${container.detail}`;
    case "missing":
      return `  ${container.name}  not created — run \`${fallback}\``;
    case "unavailable":
      return `  docker unavailable (${container.detail}) — start Colima with \`colima start\``;
  }
}

function renderForward(forward: DevelopmentDatabaseSnapshot["forward"]): string {
  if (forward.active) {
    return `  Host MySQL forward  127.0.0.1:${forward.port}  active`;
  }
  return `  Host MySQL forward  127.0.0.1:${forward.port}  inactive — run "bun run db:forward"`;
}

export function renderDevelopmentStatusSummary(snapshot: DevelopmentStatusSnapshot): string {
  const statusByName = new Map(snapshot.processes.map((process) => [process.name, process.status]));
  const rows = developmentFrontendPages.map(({ label, process, url }) => ({
    label,
    status: statusByName.get(process) ?? "not started",
    url,
  }));

  const labelWidth = Math.max("page".length, ...rows.map((row) => row.label.length));
  const statusWidth = Math.max("status".length, ...rows.map((row) => row.status.length));

  const lines = [
    "Frontend pages",
    `  ${"page".padEnd(labelWidth)}  ${"status".padEnd(statusWidth)}  url`,
    ...rows.map(
      (row) => `  ${row.label.padEnd(labelWidth)}  ${row.status.padEnd(statusWidth)}  ${row.url}`,
    ),
    "",
    "Database (Docker)",
    renderContainer(snapshot.database.mysql, "bun run db:dev:start"),
    renderContainer(snapshot.database.adminer, "bun run db:adminer"),
    ...(snapshot.database.adminer.state === "running" || snapshot.database.adminer.state === "exited"
      ? [`  Adminer UI  ${developmentAdminerUrl}`]
      : []),
    renderForward(snapshot.database.forward),
  ];
  return lines.join("\n");
}

export async function collectDevelopmentStatus(
  capture: (command: string[]) => Promise<string>,
  probe?: (port: number) => Promise<boolean>,
): Promise<DevelopmentStatusSnapshot> {
  const jlist = await capture(["bunx", "pm2", "jlist"]);
  const parsed: unknown = JSON.parse(jlist);
  const processes = Array.isArray(parsed)
    ? parsed.map((process) => {
        const record = process as { name?: unknown; pm2_env?: { status?: unknown } };
        return {
          name: String(record.name ?? "unknown"),
          status: String(record.pm2_env?.status ?? "unknown"),
        };
      })
    : [];

  return {
    processes,
    database: {
      mysql: await collectContainerSnapshot(capture, developmentDatabaseContainer),
      adminer: await collectContainerSnapshot(capture, developmentAdminerContainer),
      forward: {
        port: developmentHostMysqlPort,
        active: probe ? await probe(developmentHostMysqlPort) : false,
      },
    },
  };
}

async function collectContainerSnapshot(
  capture: (command: string[]) => Promise<string>,
  container: string,
): Promise<DevelopmentContainerSnapshot> {
  let output: string;
  try {
    output = await capture([
      "docker",
      "ps",
      "-a",
      "--filter",
      `name=${container}`,
      "--format",
      "{{.Status}}|{{.Ports}}",
    ]);
  } catch (error) {
    return {
      name: container,
      state: "unavailable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  const line = output
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.includes("|"));
  if (!line) return { name: container, state: "missing", detail: "" };

  const [status, ports] = line.split("|");
  const running = status.startsWith("Up");
  return {
    name: container,
    state: running ? "running" : "exited",
    detail: [status, ports].filter(Boolean).join("  "),
  };
}
