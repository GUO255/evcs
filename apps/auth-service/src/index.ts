const port = 3210;

const server = Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "auth-service" });
    }
    return Response.json({ app: "auth-service", message: "EVCS development placeholder" });
  },
});

console.log(`[auth-service] placeholder listening on http://127.0.0.1:${server.port}`);
