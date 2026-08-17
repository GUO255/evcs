import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { queryOne, nowSeconds } from "./database";
import { jsonResponse, notFound } from "./respond";

export const repositoryRoot = resolve(import.meta.dir, "../../../..");
export const uploadDirectory = resolve(repositoryRoot, "ops/.state/uploads");
export const uploadPartsDirectory = resolve(uploadDirectory, ".parts");

interface TicketRow extends RowDataPacket {
  id: string;
  ticket: string;
  site_id: string;
  kind: string;
  field: string;
  object_key: string;
  original_name: string;
  content_type: string;
  file_size: number;
  status: string;
  updated_at: number;
  expires_at: number;
}

export interface UploadSession {
  ticket: string;
  objectKey: string;
  region: string;
  endpoint: string;
  bucket: string;
  credentials: {
    accessKeyId: string;
    accessKeySecret: string;
    securityToken: string;
    expiresAt: string;
  };
}

const MIME_BY_EXTENSION: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".json": "application/json",
};

function isSafeObjectKey(objectKey: string): boolean {
  return objectKey.length > 0
    && objectKey.length <= 512
    && !objectKey.includes("..")
    && !objectKey.startsWith("/")
    && !objectKey.includes("\\");
}

export function normalizeObjectKey(rawPath: string): string | null {
  const decoded = decodeURIComponent(rawPath);
  const key = decoded.replace(/^\/+/, "").replace(/^evcs-local\//, "");
  return isSafeObjectKey(key) ? key : null;
}

export function objectPath(objectKey: string): string {
  return resolve(uploadDirectory, objectKey);
}

export function partPath(uploadId: string, partNumber: number): string {
  return resolve(uploadPartsDirectory, uploadId, String(partNumber));
}

export async function createUploadSession(
  pool: Pool,
  input: { siteId: string; kind: string; field: string; originalName: string; contentType: string; size: number; updatedAt: number },
): Promise<UploadSession | null> {
  const site = await queryOne<RowDataPacket>(pool, "SELECT id FROM site_exploration_site WHERE id = ?", [input.siteId]);
  if (!site) return null;
  const ticket = randomUUID();
  const safeName = input.originalName.replace(/[^\w.\-\u4e00-\u9fff]/gu, "_");
  const objectKey = `sites/${input.siteId}/${input.kind}/${ticket}/${safeName}`;
  const now = nowSeconds();
  mkdirSync(uploadDirectory, { recursive: true });
  await pool.query(
    `INSERT INTO site_upload_ticket
       (ticket, site_id, kind, field, object_key, original_name, content_type, file_size, status, updated_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    [ticket, input.siteId, input.kind, input.field, objectKey, input.originalName, input.contentType, input.size, input.updatedAt, now + 3600, now],
  );
  return {
    ticket,
    objectKey,
    region: "local",
    endpoint: "http://127.0.0.1:3240",
    bucket: "evcs-local",
    credentials: {
      accessKeyId: "local",
      accessKeySecret: "local",
      securityToken: ticket,
      expiresAt: new Date((now + 3600) * 1000).toISOString(),
    },
  };
}

function md5Hex(bytes: Uint8Array): string {
  return createHash("md5").update(bytes).digest("hex");
}

async function pendingTicket(pool: Pool, ticket: string, objectKey: string): Promise<TicketRow | null> {
  const row = await queryOne<TicketRow>(
    pool,
    "SELECT * FROM site_upload_ticket WHERE ticket = ? AND object_key = ? AND status = 'pending' LIMIT 1",
    [ticket, objectKey],
  );
  if (!row || Number(row.expires_at) < nowSeconds()) return null;
  return row;
}

export async function storeLocalObject(pool: Pool, objectKey: string, ticket: string, bytes: Uint8Array): Promise<Response> {
  const pending = await pendingTicket(pool, ticket, objectKey);
  if (!pending) return notFound("upload_ticket_expired");
  if (Number(pending.file_size) !== bytes.length) return jsonResponse({ error: "size_mismatch" }, 400);

  mkdirSync(uploadDirectory, { recursive: true });
  const target = objectPath(objectKey);
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, bytes);
  await pool.query(
    "UPDATE site_upload_ticket SET status = 'stored', updated_at = UNIX_TIMESTAMP() WHERE ticket = ?",
    [ticket],
  );
  return new Response(null, { status: 200, headers: { etag: `"${md5Hex(bytes)}"` } });
}

export async function initiateMultipart(pool: Pool, objectKey: string, ticket: string): Promise<Response> {
  const pending = await pendingTicket(pool, ticket, objectKey);
  if (!pending) return notFound("upload_ticket_expired");
  mkdirSync(resolve(uploadPartsDirectory, ticket), { recursive: true });
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<InitiateMultipartUploadResult>",
    "<Bucket>evcs-local</Bucket>",
    `<Key>${escapeXml(objectKey)}</Key>`,
    `<UploadId>${ticket}</UploadId>`,
    "</InitiateMultipartUploadResult>",
  ].join("\n");
  return new Response(xml, { status: 200, headers: { "content-type": "application/xml" } });
}

export async function storePart(
  pool: Pool,
  objectKey: string,
  ticket: string,
  uploadId: string,
  partNumber: number,
  bytes: Uint8Array,
): Promise<Response> {
  if (uploadId !== ticket) return jsonResponse({ error: "invalid_upload_id" }, 400);
  const pending = await pendingTicket(pool, ticket, objectKey);
  if (!pending) return notFound("upload_ticket_expired");
  if (partNumber < 1 || partNumber > 10000) return jsonResponse({ error: "invalid_part_number" }, 400);
  mkdirSync(resolve(uploadPartsDirectory, uploadId), { recursive: true });
  writeFileSync(partPath(uploadId, partNumber), bytes);
  return new Response(null, { status: 200, headers: { etag: `"${md5Hex(bytes)}"` } });
}

export async function completeMultipart(
  pool: Pool,
  objectKey: string,
  ticket: string,
  uploadId: string,
  bodyText: string,
): Promise<Response> {
  if (uploadId !== ticket) return jsonResponse({ error: "invalid_upload_id" }, 400);
  const pending = await pendingTicket(pool, ticket, objectKey);
  if (!pending) return notFound("upload_ticket_expired");
  const parts: number[] = [];
  const partPattern = /<Part>[\s\S]*?<PartNumber>\s*(\d+)\s*<\/PartNumber>[\s\S]*?<\/Part>/giu;
  for (const match of bodyText.matchAll(partPattern)) {
    const number = Number(match[1]);
    if (number >= 1 && number <= 10000) parts.push(number);
  }
  parts.sort((a, b) => a - b);
  if (parts.length === 0) return jsonResponse({ error: "empty_parts" }, 400);
  const chunks: Uint8Array[] = [];
  for (const partNumber of parts) {
    const path = partPath(uploadId, partNumber);
    if (!existsSync(path)) return jsonResponse({ error: "missing_part" }, 400);
    chunks.push(new Uint8Array(readFileSync(path)));
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  if (total !== Number(pending.file_size)) return jsonResponse({ error: "size_mismatch" }, 400);
  const target = objectPath(objectKey);
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  rmSync(resolve(uploadPartsDirectory, uploadId), { recursive: true, force: true });
  await pool.query(
    "UPDATE site_upload_ticket SET status = 'stored', updated_at = UNIX_TIMESTAMP() WHERE ticket = ?",
    [ticket],
  );
  const etag = `"${md5Hex(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))))}"`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<CompleteMultipartUploadResult>",
    `<Location>http://127.0.0.1:3240/${escapeXml(objectKey)}</Location>`,
    "<Bucket>evcs-local</Bucket>",
    `<Key>${escapeXml(objectKey)}</Key>`,
    `<ETag>${etag}</ETag>`,
    "</CompleteMultipartUploadResult>",
  ].join("\n");
  return new Response(xml, { status: 200, headers: { "content-type": "application/xml", etag } });
}

export async function abortMultipart(
  pool: Pool,
  objectKey: string,
  ticket: string,
  uploadId: string,
): Promise<Response> {
  if (uploadId !== ticket) return jsonResponse({ error: "invalid_upload_id" }, 400);
  const pending = await pendingTicket(pool, ticket, objectKey);
  if (pending) rmSync(resolve(uploadPartsDirectory, uploadId), { recursive: true, force: true });
  return new Response(null, { status: 204 });
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/gu, (char) => (
    { "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char]!
  ));
}

export function readLocalObject(objectKey: string): Response {
  try {
    const bytes = readFileSync(objectPath(objectKey));
    const contentType = MIME_BY_EXTENSION[extname(objectKey).toLowerCase()] ?? "application/octet-stream";
    return new Response(bytes, { headers: { "content-type": contentType } });
  } catch {
    return notFound();
  }
}

export async function findStoredTicket(pool: Pool, ticket: string): Promise<TicketRow | null> {
  return queryOne<TicketRow>(
    pool,
    "SELECT * FROM site_upload_ticket WHERE ticket = ? AND status = 'stored' LIMIT 1",
    [ticket],
  );
}

export async function markTicketCompleted(pool: Pool, ticket: string): Promise<void> {
  await pool.query(
    "UPDATE site_upload_ticket SET status = 'completed', updated_at = UNIX_TIMESTAMP() WHERE ticket = ?",
    [ticket],
  );
}

export function localObjectUrl(objectKey: string): string {
  return `/local-objects/${objectKey}`;
}

export function storeSnapshotFile(originalName: string, contentType: string, bytes: Uint8Array): { objectKey: string; url: string; originalName: string; contentType: string; size: number } {
  mkdirSync(uploadDirectory, { recursive: true });
  const safeName = originalName.replace(/[^\w.\-\u4e00-\u9fff]/gu, "_");
  const objectKey = `snapshots/${randomUUID()}-${safeName}`;
  const target = objectPath(objectKey);
  mkdirSync(resolve(target, ".."), { recursive: true });
  writeFileSync(target, bytes);
  return {
    objectKey,
    url: localObjectUrl(objectKey),
    originalName,
    contentType,
    size: bytes.length,
  };
}
