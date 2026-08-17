const usernamePattern = /^[a-zA-Z0-9_]{3,32}$/u;

export interface CredentialStore {
  create(username: string, passwordHash: string): Promise<"created" | "conflict">;
  find(username: string): Promise<{ passwordHash: string } | null>;
}

export interface AuthServiceOptions {
  store: CredentialStore;
  platformWebOrigin: string;
  hashPassword?: (password: string) => Promise<string>;
  verifyPassword?: (password: string, hash: string) => Promise<boolean>;
}

export function createAuthServiceHandler(options: AuthServiceOptions): (request: Request) => Promise<Response> {
  const { store, platformWebOrigin } = options;
  const hashPassword = options.hashPassword ?? ((password) => Bun.password.hash(password));
  const verifyPassword = options.verifyPassword ?? ((password, hash) => Bun.password.verify(password, hash));
  let csrfToken: string | undefined;

  return async function handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (method === "GET" && url.pathname === "/health") {
      return Response.json({ ok: true, app: "auth-service" });
    }
    if (method === "GET" && url.pathname === "/platform/device/bootstrap") {
      return Response.json({ ok: true });
    }
    if (method === "GET" && url.pathname === "/platform/csrf") {
      csrfToken = crypto.randomUUID();
      return Response.json({ csrfToken });
    }

    if (
      method === "POST" &&
      (url.pathname === "/platform/credentials/sign-up" || url.pathname === "/platform/credentials/sign-in")
    ) {
      if (csrfToken === undefined || request.headers.get("x-evcs-csrf") !== csrfToken) {
        return Response.json({ error: "expired_request" }, { status: 403 });
      }
      const body = await readJson(request);
      if (!isValidCredentials(body)) {
        return Response.json({ error: "invalid_request" }, { status: 400 });
      }

      if (url.pathname === "/platform/credentials/sign-up") {
        const result = await store.create(body.username, await hashPassword(body.password));
        if (result === "conflict") return Response.json({ error: "conflict" }, { status: 409 });
        return Response.json({ ok: true }, { status: 201 });
      }

      const record = await store.find(body.username);
      if (!record || !(await verifyPassword(body.password, record.passwordHash))) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      return Response.json({ url: platformWebOrigin });
    }

    return Response.json({ app: "auth-service", message: "not found" }, { status: 404 });
  };
}

function isValidCredentials(body: unknown): body is { username: string; password: string } {
  if (!body || typeof body !== "object") return false;
  const record = body as { username?: unknown; password?: unknown };
  return (
    typeof record.username === "string" &&
    usernamePattern.test(record.username) &&
    typeof record.password === "string" &&
    record.password.length >= 6 &&
    record.password.length <= 128
  );
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
