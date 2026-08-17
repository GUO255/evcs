// Render 前端静态资源服务器
// 职责：
//   1. 托管 apps/platform-web/dist 构建产物（SPA 回退到 index.html）
//   2. 将 /api、/gateway、/local-objects 代理到 BFF（由 BFF_URL 指定，可为 BFF 公网地址）
import { serve } from "bun";
import { join } from "node:path";

const PORT = parsePort(process.env.PORT, 3000);
const DIST_DIR = join(import.meta.dir, "../../apps/platform-web/dist");
const BFF_URL = process.env.BFF_URL ?? "http://127.0.0.1:3240";

const STATIC_PREFIXES = ["/api", "/gateway", "/local-objects"];

serve({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(request) {
    const url = new URL(request.url);

    // 1) 代理到 BFF
    if (STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
      return proxyToBff(request, url, BFF_URL);
    }

    // 2) 静态文件（含 SPA 回退）
    return serveStatic(url.pathname, request);
  },
});

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error("PORT must be an integer from 1 to 65535");
  return n;
}

async function proxyToBff(request: Request, url: URL, bffUrl: string): Promise<Response> {
  const target = new URL(url.pathname + url.search, bffUrl);
  return fetch(target.toString(), {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
  });
}

async function serveStatic(pathname: string, _request: Request): Promise<Response> {
  let filePath = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  let file = Bun.file(join(DIST_DIR, filePath));
  if (!(await file.exists())) {
    // SPA 回退：找不到资源时回退到 index.html（跳过 /assets 等真实资源）
    if (filePath.startsWith("/assets")) return new Response("Not Found", { status: 404 });
    file = Bun.file(join(DIST_DIR, "index.html"));
  }
  const contentType = file.type || mimeFromPath(filePath);
  return new Response(file, { headers: { "content-type": contentType } });
}

function mimeFromPath(pathname: string): string {
  const ext = pathname.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    html: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    mjs: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    wasm: "application/wasm",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    map: "application/json",
  };
  return map[ext] ?? "application/octet-stream";
}