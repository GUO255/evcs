export function parseHealthcheckInput(
  argv: string[],
  source: Readonly<Record<string, string | undefined>>,
): { port: number; path: string } {
  if (argv.length !== 2) throw new Error("usage: container-healthcheck.ts <port-key> <path>");
  const [portKey, path] = argv;
  if (!portKey || !/^[A-Z][A-Z0-9_]*$/u.test(portKey)) throw new Error("Invalid port key");
  const rawPort = source[portKey];
  if (!rawPort || !/^\d+$/u.test(rawPort)) throw new Error(`Invalid ${portKey}`);
  const port = Number(rawPort);
  if (port < 1 || port > 65_535) throw new Error(`Invalid ${portKey}`);
  if (!path?.startsWith("/") || path.startsWith("//")) throw new Error("Healthcheck path must be absolute");
  return { port, path };
}

export async function runHealthcheck(argv: string[], source: Readonly<Record<string, string | undefined>>): Promise<void> {
  const input = parseHealthcheckInput(argv, source);
  const response = await fetch(`http://127.0.0.1:${input.port}${input.path}`);
  if (!response.ok) throw new Error(`Healthcheck returned HTTP ${response.status}`);
}

if (import.meta.main) await runHealthcheck(process.argv.slice(2), process.env);
