import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { materializeRoleEnvironment, renderExternalExample, renderRoleSnapshot, renderStableProfile } from "../generator";
import { assertRoleEnvironment } from "../parser";
import { loadProfileEnvironment } from "../profile-input";
import { activeEnvironmentRoles, environmentRoles, type EnvironmentRole } from "../schema";

const repositoryRoot = resolve(import.meta.dir, "../../..");
const stableInput = "ops/.env.development";
const localInput = "ops/.env.development.local";

export async function materializeDevelopmentEnvironment(
  root: string,
): Promise<Readonly<Record<(typeof activeEnvironmentRoles)[number], string>>> {
  const stablePath = resolve(root, stableInput);
  if (!existsSync(stablePath) || readFileSync(stablePath, "utf8") !== renderStableProfile("development")) {
    throw new Error(`${stableInput} is missing or stale; run bun run env:generate.`);
  }

  const localPath = resolve(root, localInput);
  if (!existsSync(localPath)) {
    const content = renderCentralLocalInput({});
    atomicPrivateWrite(localPath, materializeGeneratedDevelopmentValues(content));
  } else {
    const current = readFileSync(localPath, "utf8");
    const materialized = materializeGeneratedDevelopmentValues(current);
    if (materialized !== current) atomicPrivateWrite(localPath, materialized);
  }
  chmodSync(localPath, 0o600);

  const supplied = loadProfileEnvironment(root, "development", true);
  const outputDir = resolve(root, "ops/.env.generated");
  const outputs = {} as Record<(typeof activeEnvironmentRoles)[number], string>;
  for (const role of activeEnvironmentRoles) {
    assertRoleEnvironment("development", role, parseSnapshot(renderRoleSnapshot("development", role, supplied)));
  }
  for (const role of activeEnvironmentRoles) {
    outputs[role] = await materializeRoleEnvironment({
      profile: "development",
      role: role as EnvironmentRole,
      externalValues: supplied,
      outputDir,
      validateRequired: true,
    });
  }
  return outputs;
}

function renderCentralLocalInput(values: Readonly<Record<string, string>>): string {
  const template = renderExternalExample("development", environmentRoles);
  return template.split(/\r?\n/u).map((line) => {
    const assignment = line.match(/^(?:# )?([A-Z][A-Z0-9_]*)=(.*)$/u);
    if (!assignment) return line;
    const value = values[assignment[1]!];
    return value === undefined ? line : `${assignment[1]}=${value}`;
  }).join("\n");
}

function materializeGeneratedDevelopmentValues(content: string): string {
  return content.split(/(\r?\n)/u).map((part) => {
    if (!part.includes("=")) return part;
    const separator = part.indexOf("=");
    const marker = part.slice(separator + 1);
    if (marker === "<generate-a-local-secret>") {
      return `${part.slice(0, separator + 1)}${randomBytes(32).toString("base64url")}`;
    }
    if (marker === "<generate-a-canonical-keyring>") {
      return `${part.slice(0, separator + 1)}v1.${randomBytes(32).toString("base64url")}`;
    }
    return part;
  }).join("");
}

function atomicPrivateWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, content, { encoding: "utf8", flag: "wx", mode: 0o600 });
    renameSync(temporary, path);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function parseSnapshot(content: string): Record<string, string> {
  return Object.fromEntries(content.split(/\r?\n/u).filter(Boolean).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
}

if (import.meta.main) await materializeDevelopmentEnvironment(repositoryRoot);
