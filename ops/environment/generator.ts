import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertRoleEnvironment } from "./parser";
import {
  activeEnvironmentRoles,
  deploymentVariables,
  environmentVariables,
  environmentValueForRole,
  type EnvironmentProfile,
  type EnvironmentRole,
  type EnvironmentVariableDefinition,
} from "./schema";

const header = "# 由 ops/environment/schema.ts 自动生成，请勿手工修改。";
const entries = Object.entries(environmentVariables) as [string, EnvironmentVariableDefinition][];

export function renderStableProfile(profile: EnvironmentProfile): string {
  return renderSections(entries.flatMap(([key, definition]) => {
    const value = definition.environments[profile];
    return value.source === "stable" ? [{
      scope: definition.scope,
      line: `# ${definition.description}\n# 用途：${definition.purpose}\n${key}=${value.value}`,
    }] : [];
  }));
}

export function renderExternalExample(
  profile: EnvironmentProfile,
  roles: readonly EnvironmentRole[],
): string {
  const wanted = new Set(roles);
  const seen = new Set<string>();
  return renderSections(entries.flatMap(([key, definition]) => {
    if (!definition.roles.some((role) => wanted.has(role)) || seen.has(key)) return [];
    const sources = roles.filter((role) => definition.roles.includes(role))
      .map((role) => environmentValueForRole(definition, profile, role).source);
    const source = sources.includes("external-required")
      ? "external-required"
      : sources.includes("external-optional") ? "external-optional" : undefined;
    if (!source) return [];
    seen.add(key);
    const assignment = `${key}=${exampleValue(profile, key, definition, source === "external-optional")}`;
    const renderedAssignment = source === "external-optional" ? `# ${assignment}` : assignment;
    return [{
      scope: definition.scope,
      line: `# ${definition.description}；用途：${definition.purpose}\n${renderedAssignment}`,
    }];
  }), true);
}

export function renderDeploymentExample(profile: EnvironmentProfile): string {
  const deployment = Object.entries(deploymentVariables).map(([key, definition]) =>
    `# ${definition.description}；用途：${definition.purpose}\n${key}=${definition.example}`
  ).join("\n\n");
  const external = renderExternalExample(profile, activeEnvironmentRoles)
    .split(/\r?\n/u)
    .filter((line) => line !== header)
    .join("\n")
    .trim();
  return [header, "# 仅用于部署的镜像与对外发布端口配置", deployment, "", external, ""].join("\n");
}

export function renderRoleSnapshot(
  profile: EnvironmentProfile,
  role: EnvironmentRole,
  externalValues: Readonly<Record<string, string | undefined>>,
): string {
  const output = new Map<string, string>();
  for (const [key, definition] of entries) {
    if (!definition.roles.includes(role)) continue;
    const profileValue = environmentValueForRole(definition, profile, role);
    let value: string | undefined;
    if (profileValue.source === "stable") value = externalValues[key] ?? profileValue.value;
    else if (profileValue.source === "external-required") value = externalValues[key] ?? "";
    else value = externalValues[key];
    if (value === undefined) continue;
    const outputKey = definition.aliases?.[role] ?? key;
    if (output.has(outputKey)) throw new Error(`Duplicate environment output key for ${role}: ${outputKey}`);
    output.set(outputKey, value);
  }
  return [...output].map(([key, value]) => `${key}=${value}`).join("\n");
}

export function expectedEnvironmentFiles(): Readonly<Record<string, string>> {
  return {
    "ops/.env.development": renderStableProfile("development"),
    "ops/.env.production": renderStableProfile("production"),
    "ops/deploy/production/compose.config.example": renderDeploymentExample("production"),
  };
}

export async function materializeRoleEnvironment(input: {
  profile: EnvironmentProfile;
  role: EnvironmentRole;
  externalValues: Readonly<Record<string, string | undefined>>;
  outputDir: string;
  validateRequired: boolean;
}): Promise<string> {
  const body = renderRoleSnapshot(input.profile, input.role, input.externalValues);
  if (input.validateRequired) assertRoleEnvironment(input.profile, input.role, parseAssignments(body));
  const output = join(input.outputDir, `${input.profile}.${input.role}.env`);
  await atomicWrite(output, `${header}\n${body}\n`);
  return output;
}

export async function atomicWrite(path: string, content: string): Promise<void> {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
    renameSync(temporary, path);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function renderSections(
  values: readonly { scope: string; line: string }[],
  separateEntries = false,
): string {
  const sections = new Map<string, string[]>();
  for (const value of values) {
    const lines = sections.get(value.scope) ?? [];
    lines.push(value.line);
    sections.set(value.scope, lines);
  }
  return [
    header,
    ...[...sections].flatMap(([scope, lines]) => [
      "",
      `# @scope ${scope}`,
      ...(separateEntries ? lines.flatMap((line, index) => index === 0 ? [line] : ["", line]) : lines),
    ]),
    "",
  ].join("\n");
}

function exampleValue(profile: EnvironmentProfile, key: string, definition: EnvironmentVariableDefinition, optional: boolean): string {
  const declared = definition.examples?.[profile];
  if (declared !== undefined) return declared;
  if (optional || definition.sensitive) return "";
  if (definition.validation === "http-origin") return "https://required.example.invalid";
  if (definition.validation === "http-url" || definition.validation === "https-url") return "https://required.example.invalid/path";
  if (definition.validation === "mysql-url") return "mysql://evcs:replace-me@mysql.internal:3306/evcs";
  if (definition.validation === "canonical-base64-32") return "<required-canonical-base64-32>";
  return `<required-${key}>`;
}

function parseAssignments(content: string): Record<string, string> {
  return Object.fromEntries(content.split(/\r?\n/u).filter(Boolean).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
}
