export const developmentDatabaseEnvironmentDefinitions = {
  EVCS_DATABASE_URL: {
    description: "Canonical development database URL",
    sensitive: true,
  },
  EVCS_MYSQL_DATABASE: {
    description: "MySQL bootstrap schema",
    sensitive: false,
  },
  EVCS_MYSQL_USER: {
    description: "MySQL bootstrap application user",
    sensitive: false,
  },
  EVCS_MYSQL_PASSWORD: {
    description: "MySQL bootstrap application password",
    sensitive: true,
  },
  EVCS_MYSQL_ROOT_PASSWORD: {
    description: "MySQL bootstrap root password",
    sensitive: true,
  },
} as const;

export type DevelopmentDatabaseConfiguration = Readonly<{
  url: string;
  database: string;
  user: string;
  password: string;
}>;

export function parseDevelopmentDatabaseUrl(
  value: string | undefined,
): DevelopmentDatabaseConfiguration {
  if (!value) throw new Error("EVCS_DATABASE_URL is required");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("EVCS_DATABASE_URL must be an absolute MySQL URL");
  }
  if (
    url.protocol !== "mysql:" ||
    url.hostname !== "127.0.0.1" ||
    url.port !== "3306" ||
    url.pathname !== "/evcs" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Development EVCS_DATABASE_URL must target mysql://127.0.0.1:3306/evcs",
    );
  }
  const user = decodeCredential(url.username, "username");
  const password = decodeCredential(url.password, "password");
  return Object.freeze({ url: value, database: "evcs", user, password });
}

export function renderDevelopmentDatabaseEnvironment(
  configuration: DevelopmentDatabaseConfiguration,
): string {
  const values = {
    EVCS_DATABASE_URL: configuration.url,
    EVCS_MYSQL_DATABASE: configuration.database,
    EVCS_MYSQL_USER: configuration.user,
    EVCS_MYSQL_PASSWORD: configuration.password,
    EVCS_MYSQL_ROOT_PASSWORD: configuration.password,
  } satisfies Record<keyof typeof developmentDatabaseEnvironmentDefinitions, string>;
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`;
}

function decodeCredential(value: string, name: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    throw new Error(`EVCS_DATABASE_URL contains an invalid encoded ${name}`);
  }
  if (!decoded) throw new Error(`EVCS_DATABASE_URL ${name} is required`);
  const safe =
    name === "username" ? /^[A-Za-z0-9._~-]+$/u : /^[A-Za-z0-9._~!@^*+=,:/-]+$/u;
  if (!safe.test(decoded)) {
    throw new Error(`EVCS_DATABASE_URL ${name} must use Compose-safe characters`);
  }
  return decoded;
}
