import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { atomicWrite, expectedEnvironmentFiles } from "../generator";

const repositoryRoot = resolve(import.meta.dir, "../../..");

export async function generateEnvironmentFiles(root = repositoryRoot): Promise<void> {
  for (const [relativePath, content] of Object.entries(expectedEnvironmentFiles())) {
    await atomicWrite(resolve(root, relativePath), content);
  }
}

export async function checkEnvironmentFiles(root = repositoryRoot): Promise<void> {
  for (const [relativePath, expected] of Object.entries(expectedEnvironmentFiles())) {
    const target = resolve(root, relativePath);
    if (!existsSync(target) || await Bun.file(target).text() !== expected) {
      throw new Error(`Stale environment contract file: ${relativePath}`);
    }
  }
}

if (import.meta.main) {
  const [command] = process.argv.slice(2);
  if (process.argv.length !== 3 || (command !== "generate" && command !== "check")) {
    throw new Error("Usage: bun ops/environment/scripts/environment-files.ts <generate|check>");
  }
  if (command === "generate") await generateEnvironmentFiles();
  else await checkEnvironmentFiles();
}
