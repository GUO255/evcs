const port = 3240;

const server = Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "platform-web-bff" });
    }
    return Response.json({ app: "platform-web-bff", message: "EVCS development placeholder" });
  },
});

console.log(`[platform-web-bff] placeholder listening on http://127.0.0.1:${server.port}`);
