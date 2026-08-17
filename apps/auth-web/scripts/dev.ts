import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const port = 3220;
const authServiceOrigin = "http://127.0.0.1:3210";

const builder = spawn("bunx", ["vite", "build", "--watch", "--mode", "development"], {
  cwd: root,
  stdio: "inherit",
});

const shell = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>极充智联登录</title>
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body>
    <div id="auth-root"></div>
    <script type="module" src="/app.js"></script>
  </body>
</html>`;

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
};

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/platform/")) {
      const target = new URL(url.pathname + url.search, authServiceOrigin);
      const upstream = new Request(target, request);
      return fetch(upstream);
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(shell, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    const file = Bun.file(resolve(root, "dist", url.pathname.slice(1)));
    if (!(await file.exists())) {
      return new Response("Not found", { status: 404 });
    }
    const extension = url.pathname.slice(url.pathname.lastIndexOf("."));
    return new Response(file, {
      headers: { "content-type": mimeTypes[extension] ?? "application/octet-stream" },
    });
  },
});

console.log(`[auth-web] serving built sign-in app on http://127.0.0.1:${server.port}`);

process.on("SIGTERM", () => {
  builder.kill("SIGTERM");
  process.exit(0);
});
