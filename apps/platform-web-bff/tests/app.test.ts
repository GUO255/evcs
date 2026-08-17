import { describe, expect, test } from "bun:test";
import { createPlatformWebBffHandler, developmentPermissions } from "../src/app";

const handler = createPlatformWebBffHandler({ now: () => new Date("2026-08-14T00:00:00Z") });

describe("platform web bff development handler", () => {
  test("returns an authenticated development session", async () => {
    const response = await handler(new Request("http://127.0.0.1:3240/api/session"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authenticated: true,
      expiresAt: "2026-09-13T00:00:00.000Z",
    });
  });

  test("returns the full development identity with every platform permission", async () => {
    const response = await handler(new Request("http://127.0.0.1:3240/gateway/platform/api/me"));
    const body = await response.json() as { member: { code: string }; roles: Array<{ code: string }>; permissions: string[] };
    expect(body.member.code).toBe("PU000001");
    expect(body.roles[0]!.code).toBe("R000001");
    expect(body.permissions).toEqual([...developmentPermissions]);
    expect(new Set(body.permissions).size).toBe(body.permissions.length);
  });

  test("supports logout without leaving the development origin", async () => {
    const response = await handler(new Request("http://127.0.0.1:3240/api/auth/logout", { method: "POST" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authLogoutUrl: null });
  });

  test("keeps placeholder responses for unmapped endpoints", async () => {
    const response = await handler(new Request("http://127.0.0.1:3240/gateway/platform/api/merchants"));
    expect((await response.json() as { app: string }).app).toBe("platform-web-bff");
  });
});
