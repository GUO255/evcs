import { describe, expect, test } from "bun:test";
import { runAdminerAction, parseAdminerAction, adminerActions } from "../manage-adminer";

describe("adminer container manager", () => {
  test("rejects unknown actions", () => {
    expect(() => parseAdminerAction("restart")).toThrow(adminerActions.join("|"));
    expect(() => parseAdminerAction(undefined)).toThrow();
  });

  test("starts a missing container with the mysql network", async () => {
    const events: string[] = [];
    await runAdminerAction("start", {
      run: async (command) => {
        events.push(command.join(" "));
        return 0;
      },
      inspect: async () => null,
    });
    expect(events).toEqual([
      "docker run -d --name evcs-database-adminer --network database_default -e ADMINER_DEFAULT_SERVER=mysql-development -p 127.0.0.1:8081:8080 --restart unless-stopped adminer:latest",
    ]);
  });

  test("restarts an exited container and reports an already running one", async () => {
    const events: string[] = [];
    await runAdminerAction("start", {
      run: async (command) => events.push(command.join(" ")),
      inspect: async () => "exited",
    });
    expect(events).toEqual(["docker start evcs-database-adminer"]);

    events.length = 0;
    await runAdminerAction("start", {
      run: async (command) => events.push(command.join(" ")),
      inspect: async () => "running",
    });
    expect(events).toEqual([]);
  });

  test("stops a running container without touching missing ones", async () => {
    const events: string[] = [];
    await runAdminerAction("stop", {
      run: async (command) => events.push(command.join(" ")),
      inspect: async () => "running",
    });
    expect(events).toEqual(["docker stop evcs-database-adminer"]);

    events.length = 0;
    await runAdminerAction("stop", {
      run: async (command) => events.push(command.join(" ")),
      inspect: async () => null,
    });
    expect(events).toEqual([]);
  });
});
