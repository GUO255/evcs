import type { Pool } from "mysql2/promise";
import { handleAccessControl } from "./local/access-control";
import { handleAnalysis } from "./local/analysis";
import { handleExplorationSites } from "./local/exploration-sites";
import { handleExplorationTeams } from "./local/exploration-teams";
import { handleInventoryStations } from "./local/inventory-stations";
import { handleMapDrawings } from "./local/map-drawings";
import { handleTraffic } from "./local/traffic";
import { handlePlatformIdentity, updatePlatformIdentity } from "./local/identity";
import {
  abortMultipart,
  completeMultipart,
  initiateMultipart,
  normalizeObjectKey,
  readLocalObject,
  storeLocalObject,
  storePart,
} from "./local/files";
import { jsonResponse, errorResponse } from "./local/respond";
import { allPermissionCodes } from "./local/constants";

export const developmentPermissions = [
  "merchants.view", "merchants.manage",
  "customers.view", "customers.manage",
  "members.view", "members.manage",
  "stations.view", "stations.manage",
  "campaigns.manage", "feedback.manage",
  "monitoring.view", "maintenance.manage",
  "finance.view", "finance.manage",
  "platform-users.manage", "roles.manage",
  "site-planning.exploration.use", "site-planning.exploration.manage",
  "agents.inspection.use", "agents.user-operations.use",
  "agents.site-selection.use", "agents.rate-strategy.use",
  "agents.business-analysis.use", "agents.campaign-operations.use",
  "agents.refund-analysis.use",
] as const;

export interface PlatformWebBffOptions {
  pool?: Pool;
  now?: () => Date;
}

function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS, HEAD",
    "access-control-allow-headers": "content-type, content-md5, content-length, authorization, x-oss-date, x-oss-user-agent, x-oss-security-token, x-oss-content-sha256",
    "access-control-expose-headers": "etag, content-type, content-length, content-disposition",
    "access-control-max-age": "86400",
  };
}

function applyCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders())) headers.set(name, value);
  return new Response(response.body, { status: response.status, headers });
}

export function createPlatformWebBffHandler(options: PlatformWebBffOptions = {}): (request: Request) => Promise<Response> {
  const now = options.now ?? (() => new Date());

  return async function handle(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return applyCors(new Response(null, { status: 204 }));
    }
    return applyCors(await handleInner(request, now));
  };

  async function handleInner(request: Request, now: () => Date): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    if (method === "GET" && pathname === "/health") {
      return Response.json({ ok: true, app: "platform-web-bff" });
    }
    if (method === "GET" && pathname === "/api/session") {
      return Response.json({
        authenticated: true,
        expiresAt: new Date(now().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    if (method === "POST" && pathname === "/api/auth/logout") {
      return Response.json({ authLogoutUrl: null });
    }

    if (pathname.startsWith("/local-objects/")) {
      if (method === "GET") return readLocalObject(decodeURIComponent(pathname.slice("/local-objects/".length)));
      if (method === "PUT" && options.pool) {
        const objectKey = normalizeObjectKey(pathname.slice("/local-objects/".length));
        if (!objectKey) return errorResponse("invalid_request");
        const ticket = resolveUploadTicket(request, url);
        if (!ticket) return errorResponse("invalid_request");
        const bytes = new Uint8Array(await request.arrayBuffer());
        return storeLocalObject(options.pool, objectKey, ticket, bytes);
      }
    }

    if (method === "GET" && pathname === "/gateway/platform/api/me") {
      if (!options.pool) {
        return jsonResponse({
          authUserId: "local-dev-admin",
          authDomain: "platform",
          clientId: "platform-web-bff",
          scopes: ["platform"],
          member: {
            id: "1",
            code: "PU000001",
            realName: "开发管理员",
            phoneNumber: "13800000000",
            email: null,
            protected: true,
          },
          roles: [{ id: "1", code: "R000001", displayName: "平台超级管理员" }],
          permissions: allPermissionCodes,
        });
      }
      return handlePlatformIdentity(options.pool);
    }

    if (method === "PATCH" && pathname === "/gateway/platform/api/me") {
      if (!options.pool) {
        const body = await request.json().catch(() => null) as { realName?: unknown } | null;
        const realName = typeof body?.realName === "string" ? body.realName.trim() : "";
        if (realName.length === 0 || realName.length > 64) return errorResponse("invalid_request");
        return jsonResponse({ id: "1", realName });
      }
      return updatePlatformIdentity(options.pool, request);
    }

    if (options.pool) {

      if (pathname.startsWith("/gateway/platform/api/access-control")) {
        return handleAccessControl(options.pool, request, pathname.slice("/gateway/platform/api/access-control".length));
      }

      const siteSelection = matchSiteSelection(pathname);
      if (siteSelection) {
        const domain = siteSelection.domain;
        const suffix = siteSelection.suffix;
        if (domain === "exploration-teams") return handleExplorationTeams(options.pool, request, suffix);
        if (domain === "exploration-sites") return handleExplorationSites(options.pool, request, suffix);
        if (domain === "inventory-stations") return handleInventoryStations(options.pool, request, suffix);
        if (domain === "map-drawings") return handleMapDrawings(options.pool, request, suffix);
        if (domain === "analysis") return handleAnalysis(options.pool, request, suffix);
        if (domain === "traffic") return handleTraffic(options.pool, request, suffix);
      }

      const objectStore = await handleObjectStore(options.pool, request, url, pathname, method);
      if (objectStore) return objectStore;
    }

    return jsonResponse({ app: "platform-web-bff", message: "EVCS development placeholder" });
  }
}

async function handleObjectStore(
  pool: Pool,
  request: Request,
  url: URL,
  pathname: string,
  method: string,
): Promise<Response | null> {
  const objectKey = normalizeObjectKey(pathname);
  if (!objectKey) return null;
  const ticket = resolveUploadTicket(request, url);
  if (!ticket) return null;

  if (method === "PUT") {
    const partNumber = url.searchParams.get("partNumber");
    const uploadId = url.searchParams.get("uploadId");
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (partNumber !== null && uploadId !== null) {
      return storePart(pool, objectKey, ticket, uploadId, Number(partNumber), bytes);
    }
    return storeLocalObject(pool, objectKey, ticket, bytes);
  }
  if (method === "POST") {
    if (url.searchParams.has("uploads")) {
      return initiateMultipart(pool, objectKey, ticket);
    }
    const uploadId = url.searchParams.get("uploadId");
    if (uploadId !== null) {
      return completeMultipart(pool, objectKey, ticket, uploadId, await request.text());
    }
  }
  if (method === "DELETE") {
    const uploadId = url.searchParams.get("uploadId");
    if (uploadId !== null) {
      return abortMultipart(pool, objectKey, ticket, uploadId);
    }
  }
  return null;
}

function resolveUploadTicket(request: Request, url: URL): string | null {
  const header = request.headers.get("x-oss-security-token");
  if (header) return header;
  const query = url.searchParams.get("ticket") ?? url.searchParams.get("security-token");
  return query;
}

interface SiteSelectionMatch {
  domain: string;
  suffix: string;
}

function matchSiteSelection(pathname: string): SiteSelectionMatch | null {
  const prefixes = [
    "/api/intelligent-site-selection/",
    "/gateway/site-selection/api/intelligent-site-selection/",
  ];
  for (const prefix of prefixes) {
    if (!pathname.startsWith(prefix)) continue;
    const rest = pathname.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash === -1) return { domain: rest, suffix: "/" };
    const domain = rest.slice(0, slash);
    const suffix = rest.slice(slash);
    return { domain, suffix: suffix === "" ? "/" : suffix };
  }
  return null;
}
