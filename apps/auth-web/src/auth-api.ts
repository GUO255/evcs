const MAX_JSON_CHARACTERS = 16_384;
type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type AuthUiErrorCode =
  | "not_initialized"
  | "invalid_request"
  | "expired_request"
  | "rate_limited"
  | "conflict"
  | "unauthorized"
  | "service_unavailable";

const messages: Readonly<Record<AuthUiErrorCode, string>> = Object.freeze({
  not_initialized: "登录服务尚未初始化，请刷新页面重试",
  invalid_request: "用户名需为 3-32 位字母、数字或下划线，密码至少 6 位",
  expired_request: "登录请求已失效，请重新开始登录",
  rate_limited: "操作过于频繁，请稍后再试",
  conflict: "用户名已存在，请更换用户名",
  unauthorized: "用户名或密码错误",
  service_unavailable: "登录服务暂时不可用，请稍后重试",
});

export class AuthUiError extends Error {
  readonly code: AuthUiErrorCode;

  constructor(code: AuthUiErrorCode) {
    super(messages[code]);
    this.name = "AuthUiError";
    this.code = code;
  }
}

export interface AuthApi {
  initialize(): Promise<void>;
  signUp(username: string, password: string): Promise<void>;
  signIn(username: string, password: string): Promise<{ readonly url: string }>;
}

export function createAuthApi(fetcher: AuthFetch = globalThis.fetch): AuthApi {
  let csrfToken: string | undefined;

  const request = async (path: string, init: RequestInit = {}): Promise<Response> => {
    try {
      return await fetcher(path, { ...init, credentials: "same-origin" });
    } catch {
      throw new AuthUiError("service_unavailable");
    }
  };

  const post = async (path: string, body: unknown): Promise<Response> => {
    if (csrfToken === undefined) throw new AuthUiError("not_initialized");
    const response = await request(path, {
      method: "POST",
      headers: { "content-type": "application/json", "x-evcs-csrf": csrfToken },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw errorForStatus(response.status);
    return response;
  };

  const api: AuthApi = Object.freeze({
    async initialize() {
      const bootstrap = await request("/platform/device/bootstrap");
      if (!bootstrap.ok) throw errorForStatus(bootstrap.status);
      const response = await request("/platform/csrf");
      if (!response.ok) throw errorForStatus(response.status);
      const body = await readJson(response);
      if (
        !body ||
        typeof body !== "object" ||
        typeof (body as { csrfToken?: unknown }).csrfToken !== "string" ||
        !(body as { csrfToken: string }).csrfToken
      ) {
        throw new AuthUiError("service_unavailable");
      }
      csrfToken = (body as { csrfToken: string }).csrfToken;
    },
    async signUp(username: string, password: string) {
      await post("/platform/credentials/sign-up", { username, password });
    },
    async signIn(username: string, password: string) {
      const response = await post("/platform/credentials/sign-in", { username, password });
      const body = await readJson(response);
      if (!body || typeof body !== "object" || typeof (body as { url?: unknown }).url !== "string" || !(body as { url: string }).url) {
        throw new AuthUiError("service_unavailable");
      }
      return Object.freeze({ url: (body as { url: string }).url });
    },
  });
  return api;
}

function errorForStatus(status: number): AuthUiError {
  if (status === 400) return new AuthUiError("invalid_request");
  if (status === 401) return new AuthUiError("unauthorized");
  if (status === 403) return new AuthUiError("expired_request");
  if (status === 409) return new AuthUiError("conflict");
  if (status === 429) return new AuthUiError("rate_limited");
  return new AuthUiError("service_unavailable");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    if (!text || text.length > MAX_JSON_CHARACTERS) throw new Error("invalid_json_size");
    return JSON.parse(text);
  } catch {
    throw new AuthUiError("service_unavailable");
  }
}
