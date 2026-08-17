import { describe, expect, test } from "bun:test";
import {
  developmentColimaMysqlPort,
  developmentHostMysqlPort,
  forwardActions,
  parseForwardAction,
  runForwardAction,
  type ForwardDependencies,
} from "../manage-forward";

function dependencies(overrides: Partial<ForwardDependencies> = {}): ForwardDependencies & {
  events: string[];
  pid: number | null;
} {
  const state = {
    events: [] as string[],
    pid: null as number | null,
  };
  return {
    events: state.events,
    pid: state.pid,
    probe: async () => false,
    listenerPid: async () => 777,
    spawnDetached: (command) => {
      state.events.push(`spawn:${command.join(" ")}`);
      return 111;
    },
    terminate: async (pid) => {
      state.events.push(`terminate:${pid}`);
      return true;
    },
    readPid: () => state.pid,
    writePid: (pid) => {
      state.events.push(`writePid:${pid}`);
      state.pid = pid;
    },
    clearPid: () => {
      state.events.push("clearPid");
      state.pid = null;
    },
    colimaSshConfig: () => "/Users/guoshuai/.colima/ssh_config",
    ...overrides,
  } as ForwardDependencies & { events: string[]; pid: number | null };
}

describe("mysql host forward manager", () => {
  test("rejects unknown actions", () => {
    expect(() => parseForwardAction("restart")).toThrow(forwardActions.join("|"));
    expect(() => parseForwardAction(undefined)).toThrow();
  });

  test("start adopts an already active forward without spawning", async () => {
    const deps = dependencies({ probe: async () => true });
    await runForwardAction("start", deps);
    expect(deps.events).toEqual(["writePid:777"]);
    expect(deps.events.filter((event) => event.startsWith("spawn:"))).toHaveLength(0);
  });

  test("start spawns the colima ssh forward and records the listener pid", async () => {
    let probes = 0;
    const deps = dependencies({
      probe: async () => {
        probes += 1;
        return probes > 1;
      },
      listenerPid: async () => 999,
    });
    await runForwardAction("start", deps);
    expect(deps.events).toContain(
      `spawn:ssh -F /Users/guoshuai/.colima/ssh_config -N -L 127.0.0.1:${developmentHostMysqlPort}:127.0.0.1:${developmentColimaMysqlPort} colima`,
    );
    expect(deps.events).toContain("writePid:999");
  });

  test("start fails without a colima ssh config", async () => {
    const deps = dependencies({ colimaSshConfig: () => null });
    await expect(runForwardAction("start", deps)).rejects.toThrow("colima start");
  });

  test("start fails when the forward never becomes reachable", async () => {
    const deps = dependencies({ probe: async () => false });
    await expect(runForwardAction("start", deps)).rejects.toThrow("did not become active");
  });

  test("stop terminates a tracked pid and clears the pidfile", async () => {
    const deps = dependencies({});
    deps.writePid(123);
    deps.events.length = 0;
    await runForwardAction("stop", deps);
    expect(deps.events).toEqual(["terminate:123", "clearPid"]);
  });

  test("stop leaves an untracked forward alone", async () => {
    const deps = dependencies({});
    await runForwardAction("stop", deps);
    expect(deps.events).toEqual([]);
  });
});
