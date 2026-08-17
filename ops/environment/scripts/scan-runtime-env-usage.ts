import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { parse } from "@babel/parser";
import {
  aliasesByRole,
  deploymentVariables,
  environmentVariables,
  platformOwnedEnvironmentKeys,
} from "../schema";

export type EnvironmentUsageFinding = Readonly<{
  path: string;
  line: number;
  column: number;
  key?: string;
  message: string;
}>;

type AstNode = {
  type: string;
  loc?: { start: { line: number; column: number } } | null;
  [key: string]: unknown;
};

const approvedEnvironmentBoundaries = new Set([
  "apps/auth-service/src/config/env.ts",
  "apps/auth-service/src/index.ts",
  "apps/auth-service/drizzle.config.ts",
  "apps/driver-miniapp/config/index.ts",
  "apps/driver-miniapp/src/app.config.ts",
  "apps/platform-service/src/config/env.ts",
  "apps/platform-service/src/index.ts",
  "apps/platform-web-bff/src/config/env.ts",
  "apps/platform-web-bff/src/index.ts",
  "apps/site-selection-v2-service/src/config/env.ts",
  "apps/site-selection-v2-service/src/config/llm-env.ts",
  "apps/site-selection-v2-service/src/config/worker-env.ts",
  "apps/site-selection-v2-service/src/index.ts",
  "apps/site-selection-v2-service/src/worker.ts",
  "apps/platform-web/src/config/env.ts",
  "apps/platform-web/vite.config.ts",
  "apps/auth-web/scripts/dev.ts",
  "apps/site-selection-service/src/config/env.ts",
  "apps/site-selection-service/src/api/server.ts",
  "apps/site-selection-service/src/agent-runtime/models/config.ts",
  "apps/site-selection-service/src/assessment/report/oss-report-storage.ts",
  "apps/site-selection-service/src/db/clickhouse.ts",
  "apps/site-selection-web/src/config/env.ts",
  "apps/site-selection-web/rsbuild.config.ts",
  "ops/auth/manage-owner.ts",
  "ops/auth/repair-platform-member-identities.ts",
  "ops/database/backfill-field-survey-actors.ts",
  "ops/database/backfill-site-exploration-administrative-divisions.ts",
  "ops/database/import-exploration-team-members.ts",
  "ops/database/import-field-survey-to-site-exploration.ts",
  "ops/database/import-site-inventory-station-coordinates.ts",
  "ops/database/import-site-inventory-stations.ts",
  "ops/database/migrate.ts",
  "ops/database/seed-local.ts",
  "ops/environment/scripts/container-healthcheck.ts",
  "ops/environment/scripts/validate-runtime-env.ts",
  "ops/pm2/run-with-env.cjs",
  "ops/site-selection-v2/create-analysis-tasks.ts",
  "ops/site-selection/scripts/run-titiler.ts",
  "ops/site-selection/scripts/setup-titiler.ts",
]);

const frameworkEnvironmentBoundaries = new Set([
  "apps/platform-web/src/features/product-shell/platform-modules.ts",
  "apps/platform-web/src/features/product-shell/platform-management-navigation.ts",
]);

const sourceRoots = ["apps", "ops"] as const;

const ignoredPathComponents = new Set([
  ".git", ".worktrees", ".cache", ".codex_tmp", ".venv", "node_modules", "dist", "build", "coverage", "outputs", "tests", "docs", "data", "migration-archive", "migrations",
]);
const javaScriptExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"]);
const sourceExtensions = new Set([...javaScriptExtensions, ".sh", ".py"]);
const declaredKeys = new Set([
  ...Object.keys(environmentVariables),
  ...Object.keys(deploymentVariables),
  ...platformOwnedEnvironmentKeys,
  ...Object.values(aliasesByRole).flatMap((aliases) => Object.values(aliases)),
]);
const frameworkKeys = new Set(["DEV", "PROD", "MODE", "BASE_URL", "SSR"]);

export function scanEnvironmentSource(input: { path: string; content: string }): EnvironmentUsageFinding[] {
  const path = normalizePath(input.path);
  if (path.endsWith(".sh")) return scanShellEnvironmentSource(path, input.content);
  if (path.endsWith(".py")) return scanPythonEnvironmentSource(path, input.content);
  return scanJavaScriptEnvironmentSource(path, input.content);
}

function scanJavaScriptEnvironmentSource(
  path: string,
  content: string,
): EnvironmentUsageFinding[] {
  const source = parse(content, {
    sourceType: "unambiguous",
    plugins: path.endsWith(".ts") || path.endsWith(".tsx") ? ["typescript", ...(path.endsWith(".tsx") ? ["jsx" as const] : [])] : ["jsx"],
  });
  const findings: EnvironmentUsageFinding[] = [];

  const visit = (node: AstNode, parent?: AstNode): void => {
    const kind = environmentObjectKind(node);
    if (kind) {
      const access = environmentAccess(node, parent);
      const approved = approvedEnvironmentBoundaries.has(path);
      const allowedFrameworkAccess = kind === "browser"
        && access.key !== undefined
        && frameworkKeys.has(access.key)
        && frameworkEnvironmentBoundaries.has(path);

      if (approved && access.key !== undefined && !declaredKeys.has(access.key) && !frameworkKeys.has(access.key)) {
        findings.push(finding(path, access.node, access.key, "Environment variable is not declared"));
      } else if (!approved && !allowedFrameworkAccess) {
        findings.push(finding(
          path,
          access.node,
          access.key,
          kind === "browser"
            ? "Direct browser environment access is not allowed"
            : "Direct application environment access is not allowed",
        ));
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end" || key === "extra") continue;
      if (isAstNode(value)) visit(value, node);
      else if (Array.isArray(value)) {
        for (const child of value) if (isAstNode(child)) visit(child, node);
      }
    }
  };
  visit(source as unknown as AstNode);
  return findings;
}

export function scanRuntimeEnvironmentUsage(root: string): EnvironmentUsageFinding[] {
  return sourceRoots.flatMap((sourceRoot) => {
    const absoluteRoot = resolve(root, sourceRoot);
    return sourceFiles(absoluteRoot).flatMap((absolutePath) => scanEnvironmentSource({
      path: normalizePath(relative(root, absolutePath)),
      content: readFileSync(absolutePath, "utf8"),
    }));
  }).sort(compareFindings);
}

function scanShellEnvironmentSource(path: string, content: string): EnvironmentUsageFinding[] {
  return regexFindings(path, content, /\$(?:\{([A-Z][A-Z0-9_]*)(?:[^}]*)\}|([A-Z][A-Z0-9_]*))/gu);
}

function scanPythonEnvironmentSource(path: string, content: string): EnvironmentUsageFinding[] {
  return regexFindings(
    path,
    content,
    /\bos\.(?:getenv|environ\.get)\(\s*["']([A-Z][A-Z0-9_]*)["']|\bos\.environ\s*\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\]/gu,
  );
}

function regexFindings(
  path: string,
  content: string,
  pattern: RegExp,
): EnvironmentUsageFinding[] {
  const findings: EnvironmentUsageFinding[] = [];
  const seen = new Set<string>();
  for (const match of content.matchAll(pattern)) {
    const key = match[1] ?? match[2];
    if (!key || declaredKeys.has(key)) continue;
    const index = match.index ?? 0;
    const before = content.slice(0, index);
    const line = before.split("\n").length;
    const lastNewline = before.lastIndexOf("\n");
    const column = index - lastNewline;
    const identity = `${line}:${column}:${key}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    findings.push({ path, line, column, key, message: "Environment variable is not declared" });
  }
  return findings;
}

function compareFindings(left: EnvironmentUsageFinding, right: EnvironmentUsageFinding): number {
  return left.path.localeCompare(right.path)
    || left.line - right.line
    || left.column - right.column
    || (left.key ?? "").localeCompare(right.key ?? "");
}

function sourceFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (ignoredPathComponents.has(entry.name)) continue;
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    else if (isSourceFile(entry.name)) files.push(path);
  }
  return files.sort();
}

function isSourceFile(name: string): boolean {
  if (name.startsWith(".env")) return false;
  if (name === "routeTree.gen.ts" || name.endsWith(".d.ts") || /\.(?:test|spec)\.[^.]+$/u.test(name)) return false;
  const extension = name.slice(name.lastIndexOf("."));
  return sourceExtensions.has(extension);
}

function environmentObjectKind(node: AstNode): "server" | "browser" | undefined {
  if (node.type !== "MemberExpression" || memberName(node) !== "env") return undefined;
  const object = node.object;
  if (isAstNode(object) && object.type === "Identifier" && (object.name === "process" || object.name === "Bun")) return "server";
  if (isAstNode(object) && object.type === "MetaProperty" && identifierName(object.meta) === "import" && identifierName(object.property) === "meta") return "browser";
  return undefined;
}

function environmentAccess(node: AstNode, parent?: AstNode): { node: AstNode; key?: string } {
  if (parent?.type === "MemberExpression" && parent.object === node) return { node: parent, key: memberName(parent) };
  return { node };
}

function finding(
  path: string,
  node: AstNode,
  key: string | undefined,
  message: string,
): EnvironmentUsageFinding {
  return { path, line: node.loc?.start.line ?? 1, column: (node.loc?.start.column ?? 0) + 1, key, message };
}

function memberName(node: AstNode): string | undefined {
  const property = node.property;
  if (!isAstNode(property)) return undefined;
  if (node.computed === true) {
    if (property.type === "StringLiteral") return typeof property.value === "string" ? property.value : undefined;
    if (property.type === "TemplateLiteral" && Array.isArray(property.expressions) && property.expressions.length === 0) {
      const quasis = property.quasis;
      if (Array.isArray(quasis) && isAstNode(quasis[0])) return identifierName(quasis[0].value);
    }
    return undefined;
  }
  return identifierName(property);
}

function identifierName(value: unknown): string | undefined {
  if (!isAstNode(value) && (typeof value !== "object" || value === null)) return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.name === "string") return record.name;
  if (typeof record.raw === "string") return record.raw;
  if (typeof record.cooked === "string") return record.cooked;
  return undefined;
}

function isAstNode(value: unknown): value is AstNode {
  return typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string";
}

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//u, "");
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "../../..");
  const findings = scanRuntimeEnvironmentUsage(root);
  if (findings.length > 0) throw new Error(JSON.stringify(findings));
}
