const processMatchers = [
  {
    name: "worker",
    command: /\bbun --watch src\/worker\/main\.ts(?:\s|$)/,
  },
  {
    name: "api",
    command: /\bbun --watch src\/api\/server\.ts(?:\s|$)/,
  },
  {
    name: "web",
    command: /site-selection-web\/node_modules\/\.bin\/rsbuild dev(?:\s|$)/,
  },
  {
    name: "titiler",
    command:
      /ops\/site-selection\/titiler\/\.venv\/bin\/python(?:\d+(?:\.\d+)*)? -m uvicorn titiler\.application\.main:app(?:\s|$)/,
  },
] as const;

type SiteSelectionProcess = {
  name: (typeof processMatchers)[number]["name"];
  pid: number;
};

function findProcesses(): SiteSelectionProcess[] {
  const result = Bun.spawnSync({
    cmd: ["ps", "-axo", "pid=,command="],
    stdout: "pipe",
    stderr: "pipe",
  });

  if (result.exitCode !== 0) {
    const message = result.stderr.toString().trim();
    throw new Error(`Unable to inspect processes${message ? `: ${message}` : ""}`);
  }

  return result.stdout
    .toString()
    .split("\n")
    .flatMap((line) => {
      const match = line.trim().match(/^(\d+)\s+(.+)$/);
      if (!match) return [];

      const processMatcher = processMatchers.find(({ command }) => command.test(match[2]));
      if (!processMatcher) return [];

      return [{ name: processMatcher.name, pid: Number(match[1]) }];
    });
}

function isRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const siteSelectionProcesses = findProcesses();

if (siteSelectionProcesses.length === 0) {
  console.log("[site-selection] no stale process found");
  process.exit(0);
}

for (const { name, pid } of siteSelectionProcesses) {
  console.log(`[site-selection] stopping ${name} process ${pid}`);
  process.kill(pid, "SIGTERM");
}

await Bun.sleep(1_000);

for (const { name, pid } of siteSelectionProcesses.filter(({ pid }) => isRunning(pid))) {
  console.log(`[site-selection] force stopping ${name} process ${pid}`);
  process.kill(pid, "SIGKILL");
}

console.log(`[site-selection] stopped ${siteSelectionProcesses.length} process(es)`);
