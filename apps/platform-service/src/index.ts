const port = parsePort(process.env.PORT, 3230);

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true, app: "platform-service" });
    }
    return Response.json({ app: "platform-service", message: "EVCS development placeholder" });
  },
});

console.log(`[platform-service] placeholder listening on http://0.0.0.0:${server.port}`);

function parsePort(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) throw new Error(`PORT must be an integer from 1 to 65535, got "${value}"`);
  return parsed;
}
