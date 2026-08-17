import { describe, expect, test } from "bun:test";
import { createAuthServiceHandler, type CredentialStore } from "../src/app";

class MemoryStore implements CredentialStore {
  private readonly records = new Map<string, string>();

  async create(username: string, passwordHash: string): Promise<"created" | "conflict"> {
    if (this.records.has(username)) return "conflict";
    this.records.set(username, passwordHash);
    return "created";
  }

  async find(username: string): Promise<{ passwordHash: string } | null> {
    const passwordHash = this.records.get(username);
    return passwordHash ? { passwordHash } : null;
  }
}

function createHandler(store = new MemoryStore()) {
  return createAuthServiceHandler({
    store,
    platformWebOrigin: "http://127.0.0.1:3250",
    hashPassword: async (password) => `hash:${password}`,
    verifyPassword: async (password, hash) => hash === `hash:${password}`,
  });
}

async function csrfToken(handler: (request: Request) => Promise<Response>): Promise<string> {
  const response = await handler(new Request("http://127.0.0.1:3210/platform/csrf"));
  const body = await response.json() as { csrfToken: string };
  return body.csrfToken;
}

describe("auth service credentials handler", () => {
  test("registers and signs in with username and password", async () => {
    const handler = createHandler();
    const token = await csrfToken(handler);
    const headers = { "content-type": "application/json", "x-evcs-csrf": token };

    const signUp = await handler(new Request("http://127.0.0.1:3210/platform/credentials/sign-up", {
      method: "POST",
      headers,
      body: JSON.stringify({ username: "alice_01", password: "secret123" }),
    }));
    expect(signUp.status).toBe(201);

    const signIn = await handler(new Request("http://127.0.0.1:3210/platform/credentials/sign-in", {
      method: "POST",
      headers,
      body: JSON.stringify({ username: "alice_01", password: "secret123" }),
    }));
    expect(signIn.status).toBe(200);
    expect(await signIn.json()).toEqual({ url: "http://127.0.0.1:3250" });
  });

  test("rejects duplicate usernames and wrong passwords", async () => {
    const handler = createHandler();
    const token = await csrfToken(handler);
    const headers = { "content-type": "application/json", "x-evcs-csrf": token };

    await handler(new Request("http://127.0.0.1:3210/platform/credentials/sign-up", {
      method: "POST", headers, body: JSON.stringify({ username: "alice_01", password: "secret123" }),
    }));
    const duplicate = await handler(new Request("http://127.0.0.1:3210/platform/credentials/sign-up", {
      method: "POST", headers, body: JSON.stringify({ username: "alice_01", password: "secret456" }),
    }));
    expect(duplicate.status).toBe(409);

    const wrongPassword = await handler(new Request("http://127.0.0.1:3210/platform/credentials/sign-in", {
      method: "POST", headers, body: JSON.stringify({ username: "alice_01", password: "wrong-pass" }),
    }));
    expect(wrongPassword.status).toBe(401);
  });

  test("validates username and password shape", async () => {
    const handler = createHandler();
    const token = await csrfToken(handler);
    const headers = { "content-type": "application/json", "x-evcs-csrf": token };

    for (const body of [
      { username: "ab", password: "secret123" },
      { username: "alice 01", password: "secret123" },
      { username: "alice_01", password: "12345" },
      { password: "secret123" },
      "not-an-object",
    ]) {
      const response = await handler(new Request("http://127.0.0.1:3210/platform/credentials/sign-up", {
        method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body),
      }));
      expect(response.status).toBe(400);
    }
  });

  test("requires a fresh csrf token for mutations", async () => {
    const handler = createHandler();
    const response = await handler(new Request("http://127.0.0.1:3210/platform/credentials/sign-in", {
      method: "POST",
      headers: { "content-type": "application/json", "x-evcs-csrf": "stale-token" },
      body: JSON.stringify({ username: "alice_01", password: "secret123" }),
    }));
    expect(response.status).toBe(403);
  });

  test("keeps health and bootstrap endpoints available", async () => {
    const handler = createHandler();
    expect((await handler(new Request("http://127.0.0.1:3210/health"))).status).toBe(200);
    expect((await handler(new Request("http://127.0.0.1:3210/platform/device/bootstrap"))).status).toBe(200);
  });
});
