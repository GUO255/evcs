export function requirePlatformTestDatabaseUrl(): string {
  const url = process.env.PLATFORM_TEST_MYSQL_URL;
  if (!url) throw new Error("PLATFORM_TEST_MYSQL_URL is required for Platform migration integration tests");
  const identity = new URL(url);
  if (
    identity.protocol !== "mysql:" ||
    identity.hostname !== "127.0.0.1" ||
    identity.port !== "3310" ||
    identity.pathname !== "/evcs" ||
    identity.search !== ""
  ) {
    throw new Error("PLATFORM_TEST_MYSQL_URL must identify the isolated MySQL test database at 127.0.0.1:3310/evcs");
  }
  return url;
}
