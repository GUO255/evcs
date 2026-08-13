const port = 3250;

const server = Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "platform-web" });
    }
    return Response.json({ app: "platform-web", message: "EVCS development placeholder" });
  },
});

console.log(`[platform-web] placeholder listening on http://127.0.0.1:${server.port}`);
