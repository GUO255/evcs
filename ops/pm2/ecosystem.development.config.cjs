const { resolve } = require("node:path");

const root = resolve(__dirname, "../..");
const launcher = resolve(__dirname, "run-with-env.cjs");

function app(name, snapshot, args) {
  return {
    name,
    namespace: "evcs-development",
    cwd: root,
    script: launcher,
    args: ["--env-file", `ops/.env.generated/${snapshot}`, "--", ...args],
    autorestart: true,
    watch: false,
    time: true,
  };
}

module.exports = {
  apps: [
    app("evcs-auth-service", "development.auth-service.env", ["run", "--filter", "@evcs/auth-service", "dev"]),
    app("evcs-platform-service", "development.platform-service.env", ["run", "--filter", "@evcs/platform-service", "dev"]),
    app("evcs-site-selection-v2-service", "development.site-selection-v2-api.env", ["run", "--filter", "@evcs/site-selection-v2-service", "dev"]),
    app("evcs-platform-web-bff", "development.platform-web-bff.env", ["run", "--filter", "@evcs/platform-web-bff", "dev"]),
    app("evcs-platform-web", "development.platform-web-build.env", ["run", "--filter", "@evcs/platform-web", "dev"]),
    app("evcs-charging-service", "development.platform-web-bff.env", ["run", "--filter", "@evcs/charging-service", "dev"]),
    app("evcs-charging-mini-program", "development.platform-web-build.env", ["run", "--filter", "@evcs/charging-mini-program", "dev:weapp"]),
    app("evcs-site-selection-worker", "development.site-selection-v2-worker.env", ["run", "--filter", "@evcs/site-selection-v2-service", "dev:worker"]),
    {
      name: "evcs-site-selection-titiler",
      namespace: "evcs-development",
      cwd: root,
      script: "bun",
      args: ["ops/site-selection/scripts/run-titiler.ts"],
      autorestart: true,
      watch: false,
      time: true,
    },
    app("evcs-auth-web-builder", "development.auth-web-build.env", ["run", "--filter", "@evcs/auth-web", "dev"]),
  ],
};
