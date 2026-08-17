import { join, normalize, sep } from "node:path";

const port = Number(process.env.PORT ?? 8080);
const distRoot = normalize(join(import.meta.dir, "dist"));
const bffOrigin = process.env.BFF_ORIGIN;

function contentType(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".woff")) return "font/woff";
  if (path.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      return new Response("ok\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
    }

    if (
      bffOrigin
      && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/gateway/") || url.pathname.startsWith("/local-objects/"))
    ) {
      const target = new URL(`${url.pathname}${url.search}`, bffOrigin);
      return fetch(target, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";

    const candidate = normalize(join(distRoot, pathname));
    if (!candidate.startsWith(`${distRoot}${sep}`) && candidate !== distRoot) {
      return new Response("forbidden", { status: 403 });
    }

    const file = Bun.file(candidate);
    if (await file.exists()) {
      return new Response(file, { headers: { "content-type": contentType(candidate) } });
    }

    return new Response(Bun.file(join(distRoot, "index.html")), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
});
