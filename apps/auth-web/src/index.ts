const port = 3220;

const server = Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "auth-web" });
    }
    return Response.json({ app: "auth-web", message: "EVCS development placeholder" });
  },
});

console.log(`[auth-web] placeholder listening on http://127.0.0.1:${server.port}`);
