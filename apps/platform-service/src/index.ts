const port = 3230;

const server = Bun.serve({
  port,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "platform-service" });
    }
    return Response.json({ app: "platform-service", message: "EVCS development placeholder" });
  },
});

console.log(`[platform-service] placeholder listening on http://127.0.0.1:${server.port}`);
