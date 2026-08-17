import { assertRoleEnvironment } from "../parser";
import { environmentProfiles, environmentRoles, type EnvironmentProfile, type EnvironmentRole } from "../schema";

export function validateRuntimeEnvironment(argv: string[], source: Readonly<Record<string, string | undefined>>): {
  ok: true;
  profile: EnvironmentProfile;
  role: EnvironmentRole;
} {
  if (argv.length !== 2) throw new Error("usage: validate-runtime-env.ts <profile> <role>");
  const [profile, role] = argv;
  if (!environmentProfiles.includes(profile as EnvironmentProfile)) throw new Error("Invalid environment profile");
  if (!environmentRoles.includes(role as EnvironmentRole)) throw new Error("Invalid environment role");
  assertRoleEnvironment(profile as EnvironmentProfile, role as EnvironmentRole, source);
  return { ok: true, profile: profile as EnvironmentProfile, role: role as EnvironmentRole };
}

if (import.meta.main) {
  console.log(JSON.stringify(validateRuntimeEnvironment(process.argv.slice(2), process.env)));
}
