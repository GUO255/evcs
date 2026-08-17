import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dir, "..", "..");
const docsDir = path.join(repoRoot, "docs", "api");
const indexPath = path.join(import.meta.dir, "index.html");
const port = Number(process.env.SWAGGER_PORT ?? 18082);
const hostname = process.env.SWAGGER_HOST ?? "0.0.0.0";
const requestedEnvironment = process.env.SWAGGER_ENV ?? "development";
const environment = /^[a-zA-Z0-9._-]+$/u.test(requestedEnvironment)
  ? requestedEnvironment
  : "development";
const publicHost = process.env.SWAGGER_PUBLIC_HOST?.trim() || null;

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".yaml": "application/yaml; charset=utf-8",
  ".yml": "application/yaml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

interface SwaggerSpecEntry {
  name: string;
  label?: string;
  description?: string;
}

interface SwaggerEnvironmentConfig {
  environment?: string;
  title?: string;
  specs?: SwaggerSpecEntry[];
}

async function readSpecFile(name: string): Promise<Response | null> {
  const safeName = path.basename(name);
  if (safeName !== name || !/\.(yaml|yml)$/iu.test(safeName)) return null;

  try {
    const source = await readFile(path.join(docsDir, safeName), "utf8");
    const bytes = publicHost
      ? new TextEncoder().encode(source.replaceAll("127.0.0.1", publicHost))
      : new TextEncoder().encode(source);
    return new Response(bytes, {
      headers: {
        "content-type": contentTypes[path.extname(safeName).toLowerCase()] ?? "application/octet-stream",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
    });
  } catch {
    return null;
  }
}

async function readEnvironmentConfig(): Promise<SwaggerEnvironmentConfig | null> {
  const configPath = path.join(import.meta.dir, "environments", `${environment}.json`);
  try {
    return JSON.parse(await readFile(configPath, "utf8")) as SwaggerEnvironmentConfig;
  } catch {
    return null;
  }
}

function defaultLabel(name: string): string {
  return name.replace(/\.openapi\.(yaml|yml)$/iu, "");
}

async function readSpecIndex() {
  const config = await readEnvironmentConfig();
  if (config && Array.isArray(config.specs)) {
    return {
      environment: config.environment ?? environment,
      title: config.title ?? "EVCS Swagger",
      specs: config.specs.map((entry) => ({
        name: entry.name,
        label: entry.label ?? defaultLabel(entry.name),
        description: entry.description ?? "",
        path: `/docs/api/${entry.name}`,
      })),
    };
  }

  const files = (await readdir(docsDir))
    .filter((name) => /\.(yaml|yml)$/iu.test(name))
    .sort();

  return {
    environment,
    title: "EVCS Swagger",
    specs: files.map((name) => ({
      name,
      label: defaultLabel(name),
      description: "",
      path: `/docs/api/${name}`,
    })),
  };
}

const server = Bun.serve({
  hostname,
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = await readFile(indexPath);
      return new Response(html, {
        headers: { "content-type": contentTypes[".html"], "cache-control": "no-store" },
      });
    }

    if (url.pathname === "/healthz") {
      return Response.json({ ok: true, app: "evcs-swagger-portal", environment, publicHost });
    }

    if (url.pathname === "/specs.json") {
      const index = await readSpecIndex();
      return Response.json(index, {
        headers: { "access-control-allow-origin": "*", "cache-control": "no-store" },
      });
    }

    if (url.pathname.startsWith("/docs/api/")) {
      const specResponse = await readSpecFile(decodeURIComponent(url.pathname.slice("/docs/api/".length)));
      if (specResponse) return specResponse;
    }

    return Response.json({ error: "not_found" }, { status: 404 });
  },
});

const accessHint = publicHost ? `http://${publicHost}:${server.port}` : `http://127.0.0.1:${server.port}`;
console.log(`[swagger] ${environment} API 文档: ${accessHint}`);
