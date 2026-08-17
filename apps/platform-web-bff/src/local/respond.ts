export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

export function errorResponse(code: string, status = 400): Response {
  return Response.json({ error: code }, { status });
}

export function notFound(code = "not_found"): Response {
  return errorResponse(code, 404);
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validId(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{0,19}$/u.test(value);
}

export function idString(value: unknown): string {
  return String(value ?? "0");
}
