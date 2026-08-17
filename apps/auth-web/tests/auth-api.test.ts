import { describe, expect, test } from "bun:test";
import { AuthUiError, createAuthApi } from "../src/auth-api";

interface CapturedRequest {
  readonly path: string;
  readonly init: RequestInit;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

describe("Auth Web API client", () => {
  test("signs in with username and password through the same-origin credentials contract", async () => {
    const requests: CapturedRequest[] = [];
    const responses = [json({ ok: true }), json({ csrfToken: "csrf-token" }), json({ url: "http://127.0.0.1:3250/" })];
    const api = createAuthApi(async (input, init = {}) => {
      requests.push({ path: String(input), init });
      return responses.shift()!;
    });

    await api.initialize();
    const result = await api.signIn("alice_01", "secret123");

    expect(result.url).toBe("http://127.0.0.1:3250/");
    expect(requests.map(({ path }) => path)).toEqual([
      "/platform/device/bootstrap",
      "/platform/csrf",
      "/platform/credentials/sign-in",
    ]);
    expect(requests.every(({ init }) => init.credentials === "same-origin")).toBe(true);
    expect(requests[2]!.init).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json", "x-evcs-csrf": "csrf-token" },
    });
    expect(JSON.parse(String(requests[2]!.init.body))).toEqual({ username: "alice_01", password: "secret123" });
  });

  test("registers with username and password", async () => {
    const responses = [json({ ok: true }), json({ csrfToken: "csrf-token" }), json({ ok: true }, 201)];
    const api = createAuthApi(async () => responses.shift()!);

    await api.initialize();
    await api.signUp("bob_02", "secret456");
  });

  test("requires initialization before a credentials mutation", async () => {
    const api = createAuthApi(async () => { throw new Error("must not fetch"); });

    expect(api.signUp("alice_01", "secret123")).rejects.toEqual(new AuthUiError("not_initialized"));
    expect(api.signIn("alice_01", "secret123")).rejects.toEqual(new AuthUiError("not_initialized"));
  });

  test("rejects malformed trusted responses", async () => {
    const malformedCsrf = createAuthApi(async (input) => String(input).endsWith("/csrf") ? json({ csrfToken: "" }) : json({ ok: true }));
    expect(malformedCsrf.initialize()).rejects.toEqual(new AuthUiError("service_unavailable"));

    const malformedRedirect = createAuthApi(async (input) => {
      if (String(input).endsWith("/csrf")) return json({ csrfToken: "csrf-token" });
      if (String(input).endsWith("/sign-in")) return json({ url: "" });
      return json({ ok: true });
    });
    await malformedRedirect.initialize();
    expect(malformedRedirect.signIn("alice_01", "secret123")).rejects.toEqual(new AuthUiError("service_unavailable"));
  });

  test.each([
    [400, "invalid_request"],
    [401, "unauthorized"],
    [403, "expired_request"],
    [409, "conflict"],
    [429, "rate_limited"],
    [500, "service_unavailable"],
  ] as const)("maps HTTP %d to the stable %s UI error without exposing the response", async (status, code) => {
    const api = createAuthApi(async (input) => {
      if (String(input).endsWith("/bootstrap")) return json({ ok: true });
      if (String(input).endsWith("/csrf")) return json({ csrfToken: "csrf-token" });
      return new Response("secret upstream diagnostic", { status });
    });
    await api.initialize();

    try {
      await api.signIn("alice_01", "secret123");
      throw new Error("expected signIn to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthUiError);
      expect((error as AuthUiError).code).toBe(code);
      expect((error as Error).message).not.toContain("secret upstream diagnostic");
    }
  });
});
