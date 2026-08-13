const port = 3270;

const server = Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "site-selection-service" });
    }
    return Response.json({ app: "site-selection-service", message: "EVCS development placeholder" });
  },
});

console.log(`[site-selection-service] placeholder listening on http://127.0.0.1:${server.port}`);
