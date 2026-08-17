import {
  environmentVariables,
  environmentValueForRole,
  isUnauthorizedApplicationEnvironmentKey,
  type EnvironmentProfile,
  type EnvironmentRole,
  type EnvironmentValidation,
  type EnvironmentVariableDefinition,
} from "./schema";

export type EnvironmentValidationIssue = Readonly<{ key: string; message: string }>;
type EnvironmentRecord = Readonly<Record<string, string | undefined>>;

export function parseEnvironmentFile(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) throw new Error(`Invalid environment line: ${rawLine}`);
    const key = line.slice(0, separator);
    if (!(key in environmentVariables)) {
      throw new Error(`Environment variable ${key} is not declared`);
    }
    if (key in values) throw new Error(`Duplicate environment variable: ${key}`);
    values[key] = line.slice(separator + 1);
  }
  return values;
}

export function validateRoleEnvironment(
  profile: EnvironmentProfile,
  role: EnvironmentRole,
  source: EnvironmentRecord,
): EnvironmentValidationIssue[] {
  const issues: EnvironmentValidationIssue[] = [];
  for (const key of Object.keys(source).sort()) {
    if (isUnauthorizedApplicationEnvironmentKey(role, key)) {
      issues.push({ key, message: `${key} is not declared for ${role}.` });
    }
  }
  for (const [canonicalKey, definition] of Object.entries(environmentVariables) as [string, EnvironmentVariableDefinition][]) {
    if (!definition.roles.includes(role)) continue;
    const key = definition.aliases?.[role] ?? canonicalKey;
    const value = source[key]?.trim() ?? "";
    const profileValue = environmentValueForRole(definition, profile, role);
    const required = profileValue.source === "stable" || profileValue.source === "external-required";
    if (!value) {
      if (required) issues.push({ key, message: `${key} is required for ${role}.` });
      continue;
    }
    if (isPlaceholder(value)) {
      issues.push({ key, message: `${key} contains a forbidden placeholder.` });
      continue;
    }
    const message = definition.validation
      ? validateScalar(key, value, definition.validation, profile)
      : undefined;
    if (message) {
      issues.push({ key, message });
      continue;
    }
    if (profileValue.source === "stable" && value !== profileValue.value) {
      issues.push({ key, message: `${key} must equal the ${profile} stable value.` });
    }
  }
  validateCrossFields(role, source, issues);
  return issues;
}

export function assertRoleEnvironment(
  profile: EnvironmentProfile,
  role: EnvironmentRole,
  source: EnvironmentRecord,
): void {
  const issues = validateRoleEnvironment(profile, role, source);
  if (issues.length > 0) throw new Error(JSON.stringify({ profile, role, issues }));
}

function isPlaceholder(value: string): boolean {
  return /^<[^>]+>$/u.test(value)
    || value === "CHANGE_ME"
    || /^(?:replace-with-|same-value-as-|must-equal-)/u.test(value);
}

function validateScalar(
  key: string,
  value: string,
  validation: EnvironmentValidation,
  profile: EnvironmentProfile,
): string | undefined {
  switch (validation) {
    case "non-empty":
      return undefined;
    case "positive-integer":
      return /^[1-9]\d*$/u.test(value) && Number.isSafeInteger(Number(value))
        ? undefined : `${key} must be a positive integer.`;
    case "non-negative-integer":
      return /^(?:0|[1-9]\d*)$/u.test(value) && Number.isSafeInteger(Number(value))
        ? undefined : `${key} must be a non-negative integer.`;
    case "boolean":
      return value === "true" || value === "false" ? undefined : `${key} must be true or false.`;
    case "canonical-base64-32": {
      if (!/^[A-Za-z0-9+/]{43}=$/u.test(value)) return `${key} must be canonical base64 for 32 bytes.`;
      const bytes = Buffer.from(value, "base64");
      return bytes.length === 32 && bytes.toString("base64") === value
        ? undefined : `${key} must be canonical base64 for 32 bytes.`;
    }
    case "canonical-keyring":
      return validateCanonicalKeyring(key, value);
    case "redis-url":
      return validateRedisUrl(key, value, profile);
    case "mysql-url":
      return validateUrl(key, value, ["mysql:"], false, profile);
    case "https-url":
      return validateUrl(key, value, ["https:"], false, profile);
    case "http-origin":
      return validateUrl(key, value, ["http:", "https:"], true, profile);
    case "http-url":
      return validateUrl(key, value, ["http:", "https:"], false, profile);
  }
}

function validateCanonicalKeyring(key: string, value: string): string | undefined {
  const entries = value.split(",");
  const keyIds = new Set<string>();
  if (entries.length < 1 || entries.length > 4) return `${key} must contain between one and four keys.`;
  for (const entry of entries) {
    const match = entry.match(/^([A-Za-z0-9_-]{1,32})\.([A-Za-z0-9_-]{43})$/u);
    if (!match) return `${key} must contain canonical keyId.base64url entries.`;
    const [, keyId, encoded] = match;
    if (keyIds.has(keyId!)) return `${key} must not repeat a key ID.`;
    keyIds.add(keyId!);
    const bytes = Buffer.from(encoded!, "base64url");
    if (bytes.length !== 32 || bytes.toString("base64url") !== encoded) {
      return `${key} must contain only canonical 32-byte base64url keys.`;
    }
  }
  return undefined;
}

function validateRedisUrl(key: string, value: string, profile: EnvironmentProfile): string | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return `${key} must be an absolute Redis URL.`;
  }
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") return `${key} must use redis or rediss.`;
  if (url.search || url.hash) return `${key} must not contain a query or fragment.`;
  if (!/^\/(?:[0-9]+)?$/u.test(url.pathname)) return `${key} must contain only a numeric Redis database path.`;
  if (profile === "development" && url.protocol !== "redis:") {
    return `${key} must use redis in development.`;
  }
  return undefined;
}

function validateUrl(
  key: string,
  value: string,
  protocols: readonly string[],
  originOnly: boolean,
  profile: EnvironmentProfile,
): string | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return `${key} must be an absolute ${protocols.join(" or ")} URL.`;
  }
  if (!protocols.includes(url.protocol)) return `${key} has an unsupported URL protocol.`;
  if (url.username && url.protocol !== "mysql:") return `${key} must not contain URL credentials.`;
  if (url.password && url.protocol !== "mysql:") return `${key} must not contain URL credentials.`;
  if (originOnly && (url.pathname !== "/" || url.search || url.hash)) return `${key} must contain only an HTTP(S) origin.`;
  const loopback = ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname);
  if (profile === "production" && url.protocol === "http:" && !loopback) return `${key} must use HTTPS in production.`;
  if (url.protocol === "mysql:" && url.pathname !== "/evcs") return `${key} must target the evcs schema.`;
  return undefined;
}

function validateCrossFields(
  role: EnvironmentRole,
  source: EnvironmentRecord,
  issues: EnvironmentValidationIssue[],
): void {
  if (role === "site-selection-v2-api") {
    const minimum = Number(source.SITE_SELECTION_V2_TRAFFIC_TILE_MIN_ZOOM);
    const maximum = Number(source.SITE_SELECTION_V2_TRAFFIC_TILE_MAX_ZOOM);
    if (Number.isFinite(minimum) && Number.isFinite(maximum) && minimum > maximum) {
      issues.push({
        key: "SITE_SELECTION_V2_TRAFFIC_TILE_MIN_ZOOM",
        message: "SITE_SELECTION_V2_TRAFFIC_TILE_MIN_ZOOM must not exceed SITE_SELECTION_V2_TRAFFIC_TILE_MAX_ZOOM.",
      });
    }
  }
  if (role === "site-selection-v2-worker") {
    const heartbeat = Number(source.SITE_SELECTION_V2_WORKER_HEARTBEAT_SECONDS);
    const lease = Number(source.SITE_SELECTION_V2_WORKER_LEASE_SECONDS);
    if (Number.isFinite(heartbeat) && Number.isFinite(lease) && heartbeat >= lease) {
      issues.push({
        key: "SITE_SELECTION_V2_WORKER_HEARTBEAT_SECONDS",
        message: "SITE_SELECTION_V2_WORKER_HEARTBEAT_SECONDS must be less than SITE_SELECTION_V2_WORKER_LEASE_SECONDS.",
      });
    }
  }
}
