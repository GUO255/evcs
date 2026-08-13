const port = 3280;

const server = Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "site-selection-web" });
    }
    return Response.json({ app: "site-selection-web", message: "EVCS development placeholder" });
  },
});

console.log(`[site-selection-web] placeholder listening on http://127.0.0.1:${server.port}`);
