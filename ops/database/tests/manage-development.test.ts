import { describe, expect, test } from "bun:test";

import {
  developmentDatabaseEnvironmentDefinitions,
  parseDevelopmentDatabaseUrl,
  renderDevelopmentDatabaseEnvironment,
} from "../development-environment";

describe("development database management", () => {
  test("owns the exact development database input and derived key contract", () => {
    expect(developmentDatabaseEnvironmentDefinitions).toEqual({
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
    });
  });

  test("derives the Compose inputs from the single canonical database URL", () => {
    const configuration = parseDevelopmentDatabaseUrl(
      "mysql://evcs:p%40ssword@127.0.0.1:3306/evcs",
    );
    expect(configuration).toEqual({
      url: "mysql://evcs:p%40ssword@127.0.0.1:3306/evcs",
      database: "evcs",
      user: "evcs",
      password: "p@ssword",
    });
    const rendered = renderDevelopmentDatabaseEnvironment(configuration);
    expect(rendered).toContain("EVCS_MYSQL_PASSWORD=p@ssword");
    expect(rendered.trim().split("\n").map((line) => line.split("=", 1)[0])).toEqual(
      Object.keys(developmentDatabaseEnvironmentDefinitions),
    );
  });

  test.each([
    [undefined, "is required"],
    ["not-a-url", "absolute MySQL URL"],
    ["mysql://evcs:secret@localhost:3306/evcs", "must target"],
    ["mysql://evcs:secret@127.0.0.1:3310/evcs", "must target"],
    ["mysql://evcs:secret@127.0.0.1:3306/other", "must target"],
    ["mysql://evcs@127.0.0.1:3306/evcs", "password is required"],
    ["mysql://evcs:p%24ss@127.0.0.1:3306/evcs", "Compose-safe characters"],
  ] as const)("rejects unsafe development target %s", (value, message) => {
    expect(() => parseDevelopmentDatabaseUrl(value)).toThrow(message);
  });
});
