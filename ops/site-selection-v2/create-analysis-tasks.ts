import { createDatabaseClient } from "../../apps/site-selection-v2-service/src/database/client";
import { createContactPhoneCrypto } from "../../apps/site-selection-v2-service/src/site-exploration/contact-phone-crypto";
import {
  createSiteAnalysisAdminAuthorizationRepository,
  type SiteAnalysisAdminAuthorizationRepository,
} from "../../apps/site-selection-v2-service/src/site-analysis/site-analysis-admin-authorization";
import {
  createSiteAnalysisTaskRepository,
} from "../../apps/site-selection-v2-service/src/site-analysis/site-analysis-task-repository";
import {
  createSiteAnalysisTaskCreationService,
  type SiteAnalysisTaskCreationService,
} from "../../apps/site-selection-v2-service/src/site-analysis/site-analysis-task-service";

export type CreateAnalysisTaskArgs = Readonly<{
  requestId: string;
  siteIds: readonly string[];
  memberId: string;
  dryRun: boolean;
}>;

const UNSIGNED_BIGINT_MAX = 18_446_744_073_709_551_615n;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export function parseCreateAnalysisTaskArgs(argv: readonly string[]): CreateAnalysisTaskArgs {
  let requestId: string | undefined;
  let memberId: string | undefined;
  const siteIds: string[] = [];
  let dryRun = false;
  let confirm = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (argument === "--dry-run" || argument === "--confirm") {
      if (argument === "--dry-run") {
        if (dryRun) throw new Error("duplicate --dry-run");
        dryRun = true;
      } else {
        if (confirm) throw new Error("duplicate --confirm");
        confirm = true;
      }
      continue;
    }
    if (!["--request-id", "--site-id", "--member-id"].includes(argument)) {
      throw new Error(`unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`missing value for ${argument}`);
    index += 1;
    if (argument === "--request-id") {
      if (requestId !== undefined) throw new Error("duplicate --request-id");
      requestId = value;
    } else if (argument === "--member-id") {
      if (memberId !== undefined) throw new Error("duplicate --member-id");
      memberId = parseUnsignedBigint(value, "--member-id");
    } else {
      const siteId = parseUnsignedBigint(value, "--site-id");
      if (siteIds.includes(siteId)) throw new Error("duplicate --site-id");
      siteIds.push(siteId);
    }
  }
  if (!requestId) throw new Error("--request-id is required");
  if (!REQUEST_ID_PATTERN.test(requestId)) throw new Error("invalid --request-id");
  if (!siteIds.length) throw new Error("--site-id is required");
  if (!memberId) throw new Error("--member-id is required");
  if (dryRun && confirm) throw new Error("--dry-run cannot be combined with --confirm");
  if (!dryRun && !confirm) throw new Error("--confirm is required for non-dry-run execution");
  return Object.freeze({ requestId, siteIds: Object.freeze(siteIds), memberId, dryRun });
}

export type CreateAnalysisTaskRunDependencies = Readonly<{
  authorization: SiteAnalysisAdminAuthorizationRepository;
  tasks: SiteAnalysisTaskCreationService;
  write: (line: string) => void;
}>;

export async function runCreateAnalysisTasks(
  args: CreateAnalysisTaskArgs,
  dependencies: CreateAnalysisTaskRunDependencies,
): Promise<0 | 1> {
  const authorization = await dependencies.authorization.authorize(args.memberId);
  if (!authorization.ok) throw new Error("member_not_authorized");
  let failed = false;
  for (const siteId of args.siteIds) {
    try {
      const result = await dependencies.tasks.createOrInspect({
        requestId: args.requestId,
        siteId,
        memberId: authorization.member.id,
        dryRun: args.dryRun,
      });
      dependencies.write(JSON.stringify(result));
    } catch {
      failed = true;
      dependencies.write(JSON.stringify({ siteId, outcome: "not-created", reason: "processing-error" }));
    }
  }
  return failed ? 1 : 0;
}

function parseUnsignedBigint(value: string, option: string): string {
  if (!/^[1-9]\d{0,19}$/.test(value) || BigInt(value) > UNSIGNED_BIGINT_MAX) {
    throw new Error(`invalid ${option}`);
  }
  return value;
}

async function main(): Promise<void> {
  const args = parseCreateAnalysisTaskArgs(process.argv.slice(2));
  const mysqlUrl = process.env.EVCS_DATABASE_URL?.trim();
  if (!mysqlUrl) throw new Error("EVCS_DATABASE_URL is required");
  const keyValue = process.env.SITE_SELECTION_V2_CONTACT_PHONE_ENCRYPTION_KEY?.trim();
  if (!keyValue) throw new Error("SITE_SELECTION_V2_CONTACT_PHONE_ENCRYPTION_KEY is required");
  const key = Buffer.from(keyValue, "base64");
  if (key.byteLength !== 32 || key.toString("base64") !== keyValue) {
    throw new Error("SITE_SELECTION_V2_CONTACT_PHONE_ENCRYPTION_KEY must be canonical base64 for 32 bytes");
  }
  const database = createDatabaseClient(mysqlUrl);
  try {
    const exitCode = await runCreateAnalysisTasks(args, {
      authorization: createSiteAnalysisAdminAuthorizationRepository(database),
      tasks: createSiteAnalysisTaskCreationService(
        createSiteAnalysisTaskRepository(database, createContactPhoneCrypto(key)),
      ),
      write: (line) => process.stdout.write(`${line}\n`),
    });
    process.exitCode = exitCode;
  } finally {
    await database.close();
  }
}

if (import.meta.main) await main();
