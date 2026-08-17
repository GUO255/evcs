const port = 3260;

const server = Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "site-selection-v2-service" });
    }
    return Response.json({ app: "site-selection-v2-service", message: "EVCS development placeholder" });
  },
});

console.log(`[site-selection-v2-service] placeholder listening on http://127.0.0.1:${server.port}`);
