export const environmentProfiles = ["development", "production"] as const;
export type EnvironmentProfile = (typeof environmentProfiles)[number];

export const activeEnvironmentRoles = [
  "auth-service",
  "auth-web-build",
  "platform-service",
  "platform-web-bff",
  "platform-web-build",
  "site-selection-v2-api",
  "site-selection-v2-worker",
] as const;

export const legacyEnvironmentRoles = [
  "site-selection-service-api",
  "site-selection-service-worker",
  "site-selection-web-build",
] as const;

export const environmentRoles = [...activeEnvironmentRoles, ...legacyEnvironmentRoles] as const;

export type EnvironmentRole = (typeof environmentRoles)[number];
export type EnvironmentSource = "stable" | "external-required" | "external-optional" | "runtime-managed";
export type EnvironmentValue =
  { readonly source: "stable"; readonly value: string } | { readonly source: Exclude<EnvironmentSource, "stable"> };
export type EnvironmentValidation =
  | "non-empty"
  | "positive-integer"
  | "non-negative-integer"
  | "boolean"
  | "http-url"
  | "https-url"
  | "http-origin"
  | "mysql-url"
  | "redis-url"
  | "canonical-keyring"
  | "canonical-base64-32";

export type EnvironmentVariableDefinition = {
  readonly description: string;
  readonly purpose: string;
  readonly roles: readonly EnvironmentRole[];
  readonly scope: string;
  readonly environments: Readonly<Record<EnvironmentProfile, EnvironmentValue>>;
  readonly sensitive?: boolean;
  readonly exposure?: "server" | "build-public";
  readonly validation?: EnvironmentValidation;
  readonly aliases?: Readonly<Partial<Record<EnvironmentRole, string>>>;
  readonly examples?: Readonly<Partial<Record<EnvironmentProfile, string>>>;
  readonly optionalRoles?: readonly EnvironmentRole[];
};

export type DeploymentVariableDefinition = {
  readonly description: string;
  readonly purpose: string;
  readonly sensitive?: boolean;
  readonly validation: EnvironmentValidation;
  readonly example: string;
};

const allActiveServerRoles = [
  "auth-service",
  "platform-service",
  "site-selection-v2-api",
  "site-selection-v2-worker",
] as const;
const siteSelectionV2Roles = ["site-selection-v2-api", "site-selection-v2-worker"] as const;
const legacySiteSelectionServerRoles = ["site-selection-service-api", "site-selection-service-worker"] as const;

export const environmentVariables = {
  NODE_ENV: {
    description: "运行环境",
    purpose: "配置运行环境，供 runtime 配置域内的相关服务使用。",
    roles: [...allActiveServerRoles, "platform-web-bff", "auth-web-build", "site-selection-service-api"],
    scope: "runtime",
    environments: {
      development: { source: "stable", value: "development" },
      production: { source: "stable", value: "production" },
    },
  },
  EVCS_DATABASE_URL: {
    description: "EVCS 共享 MySQL 连接地址",
    purpose: "配置EVCS 共享 MySQL 连接地址，供 database 配置域内的相关服务使用。",
    roles: [...allActiveServerRoles, "platform-web-bff", ...legacySiteSelectionServerRoles],
    scope: "database",
    sensitive: true,
    validation: "mysql-url",
    exposure: "server",
    examples: {
      development: "mysql://evcs:<password>@127.0.0.1:3306/evcs",
      production: "mysql://<rds-user>:<url-encoded-password>@<rds-internal-host>:3306/evcs",
    },
    aliases: {
      "auth-service": "AUTH_MYSQL_URL",
      "platform-service": "PLATFORM_MYSQL_URL",
      "platform-web-bff": "PLATFORM_WEB_BFF_DATABASE_URL",
      "site-selection-v2-api": "SITE_SELECTION_V2_MYSQL_URL",
      "site-selection-v2-worker": "SITE_SELECTION_V2_MYSQL_URL",
      "site-selection-service-api": "DATABASE_URL",
      "site-selection-service-worker": "DATABASE_URL",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PLATFORM_WEB_ORIGIN: {
    description: "平台管理端浏览器源地址",
    purpose: "定义认证服务、平台服务、平台 Web BFF 与选址 V2 共同使用的规范浏览器源地址。",
    roles: ["auth-service", "platform-service", "platform-web-bff", "site-selection-v2-api"],
    scope: "platform",
    validation: "http-origin",
    aliases: {
      "auth-service": "AUTH_PLATFORM_WEB_ORIGIN",
      "site-selection-v2-api": "SITE_SELECTION_V2_WEB_ORIGIN",
    },
    examples: { production: "https://evcs.hztgwm.com" },
    environments: {
      development: { source: "stable", value: "http://127.0.0.1:3250" },
      production: { source: "external-required" },
    },
  },
  AUTH_INTERNAL_PROVISIONING_SECRET: {
    description: "认证服务内部开通共享密钥",
    purpose: "配置认证服务内部开通共享密钥，供 auth-internal 配置域内的相关服务使用。",
    roles: ["auth-service", "platform-service"],
    scope: "auth-internal",
    sensitive: true,
    validation: "non-empty",
    exposure: "server",
    aliases: { "platform-service": "PLATFORM_AUTH_INTERNAL_SECRET" },
    examples: {
      development: "<generate-a-local-secret>",
      production: "<replace-with-shared-32-plus-character-secret>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AUTH_HOST: {
    description: "认证服务监听地址",
    purpose: "配置认证服务监听地址，供 auth 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth",
    environments: {
      development: { source: "stable", value: "127.0.0.1" },
      production: { source: "stable", value: "0.0.0.0" },
    },
  },
  AUTH_PORT: {
    description: "认证服务端口",
    purpose: "配置认证服务端口，供 auth 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "3200" },
      production: { source: "stable", value: "3200" },
    },
  },
  AUTH_PUBLIC_URL: {
    description: "认证服务公网地址",
    purpose: "配置认证服务公网地址，供 auth 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth",
    validation: "http-origin",
    examples: {
      development: "http://127.0.0.1:3200",
      production: "https://evcs-auth.hztgwm.com",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AUTH_BETTER_AUTH_SECRET: {
    description: "Better Auth 签名密钥",
    purpose: "配置Better Auth 签名密钥，供 auth-secret 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-secret",
    sensitive: true,
    examples: {
      development: "<generate-a-local-secret>",
      production: "<replace-with-unique-32-plus-character-secret>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AUTH_RATE_LIMIT_SECRET: {
    description: "认证服务限流密钥",
    purpose: "配置认证服务限流密钥，供 auth-secret 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-secret",
    sensitive: true,
    examples: {
      development: "<generate-a-local-secret>",
      production: "<replace-with-unique-32-plus-character-secret>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AUTH_SMS_OUTBOX_ENCRYPTION_SECRET: {
    description: "短信发件箱加密密钥",
    purpose: "配置短信发件箱加密密钥，供 auth-secret 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-secret",
    sensitive: true,
    examples: {
      development: "<generate-a-local-secret>",
      production: "<replace-with-unique-32-plus-character-secret>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AUTH_ACCESS_TOKEN_TTL_SECONDS: {
    description: "访问令牌有效期",
    purpose: "配置访问令牌有效期，供 auth-policy 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-policy",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "900" },
      production: { source: "stable", value: "900" },
    },
  },
  AUTH_PLATFORM_LOGIN_TTL_SECONDS: {
    description: "平台登录有效期",
    purpose: "配置平台登录有效期，供 auth-policy 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-policy",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "2592000" },
      production: { source: "stable", value: "2592000" },
    },
  },
  AUTH_SIGNING_KEY_ROTATION_SECONDS: {
    description: "签名密钥轮换周期",
    purpose: "配置签名密钥轮换周期，供 auth-policy 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-policy",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "2592000" },
      production: { source: "stable", value: "2592000" },
    },
  },
  AUTH_SIGNING_KEY_GRACE_SECONDS: {
    description: "签名密钥宽限期",
    purpose: "配置签名密钥宽限期，供 auth-policy 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-policy",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "86400" },
      production: { source: "stable", value: "86400" },
    },
  },
  AUTH_PLATFORM_ENABLED: {
    description: "平台认证开关",
    purpose: "配置平台认证开关，供 auth-policy 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-policy",
    validation: "boolean",
    environments: {
      development: { source: "stable", value: "true" },
      production: { source: "stable", value: "true" },
    },
  },
  AUTH_SMS_PROVIDER: {
    description: "短信服务商",
    purpose: "配置短信服务商，供 auth-provider 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-provider",
    examples: { development: "mock", production: "mock" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AUTH_MOCK_SMS_ALLOW_NON_TTY: {
    description: "模拟短信非交互终端开关",
    purpose: "配置模拟短信非交互终端开关，供 auth-provider 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-provider",
    validation: "boolean",
    examples: { development: "true", production: "true" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AUTH_PLATFORM_OTP_RATE_LIMIT_ENABLED: {
    description: "一次性验证码限流开关",
    purpose: "配置一次性验证码限流开关，供 auth-provider 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-provider",
    validation: "boolean",
    examples: { development: "true", production: "false" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AUTH_ALIYUN_SMS_SIGN_NAME: {
    description: "阿里云短信签名",
    purpose: "配置阿里云短信签名，供 auth-provider 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-provider",
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-optional" },
    },
  },
  AUTH_ALIYUN_SMS_TEMPLATE_CODE: {
    description: "阿里云短信模板编码",
    purpose: "配置阿里云短信模板编码，供 auth-provider 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-provider",
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-optional" },
    },
  },
  ALIBABA_CLOUD_ACCESS_KEY_ID: {
    description: "阿里云访问密钥 ID",
    purpose: "配置阿里云短信 SDK 使用的访问密钥 ID。",
    roles: ["auth-service"],
    scope: "auth-provider",
    sensitive: true,
    examples: {
      development: "<replace-with-aliyun-access-key-id>",
      production: "<replace-with-aliyun-access-key-id>",
    },
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-optional" },
    },
  },
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: {
    description: "阿里云访问密钥 Secret",
    purpose: "配置阿里云短信 SDK 使用的访问密钥 Secret。",
    roles: ["auth-service"],
    scope: "auth-provider",
    sensitive: true,
    examples: {
      development: "<replace-with-aliyun-access-key-secret>",
      production: "<replace-with-aliyun-access-key-secret>",
    },
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-optional" },
    },
  },
  AUTH_CLIENT_IP_HEADER: {
    description: "可信客户端 IP 请求头",
    purpose: "配置可信客户端 IP 请求头，供 auth-network 配置域内的相关服务使用。",
    roles: ["auth-service"],
    scope: "auth-network",
    examples: { development: "X-Real-IP", production: "X-Forwarded-For" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AUTH_TRUSTED_PROXY_CIDRS: {
    description: "可信代理网段",
    purpose: "定义认证服务解析原始客户端地址时可以信任的代理网段。",
    roles: ["auth-service"],
    scope: "auth-network",
    examples: { development: "", production: "100.64.0.0/10" },
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-required" },
    },
  },

  PLATFORM_SERVICE_HOST: {
    description: "平台服务监听地址",
    purpose: "配置平台服务监听地址，供 platform-service 配置域内的相关服务使用。",
    roles: ["platform-service"],
    scope: "platform-service",
    environments: {
      development: { source: "stable", value: "127.0.0.1" },
      production: { source: "stable", value: "0.0.0.0" },
    },
  },
  PLATFORM_SERVICE_PORT: {
    description: "平台服务端口",
    purpose: "配置平台服务端口，供 platform-service 配置域内的相关服务使用。",
    roles: ["platform-service"],
    scope: "platform-service",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "3300" },
      production: { source: "stable", value: "3300" },
    },
  },
  PLATFORM_AUTH_ISSUER: {
    description: "平台认证签发方",
    purpose: "配置平台认证签发方，供 platform-auth 配置域内的相关服务使用。",
    roles: ["platform-service"],
    scope: "platform-auth",
    validation: "http-url",
    examples: {
      development: "http://127.0.0.1:3200/platform",
      production: "https://evcs-auth.hztgwm.com/platform",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PLATFORM_AUTH_JWKS_URL: {
    description: "平台认证 JWKS 地址",
    purpose: "配置平台认证 JWKS 地址，供 platform-auth 配置域内的相关服务使用。",
    roles: ["platform-service"],
    scope: "platform-auth",
    validation: "http-url",
    examples: {
      development: "http://127.0.0.1:3200/platform/jwks",
      production: "https://evcs-auth.hztgwm.com/platform/jwks",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PLATFORM_AUTH_AUDIENCE: {
    description: "平台认证受众",
    purpose: "配置平台认证受众，供 platform-auth 配置域内的相关服务使用。",
    roles: ["platform-service"],
    scope: "platform-auth",
    environments: {
      development: { source: "stable", value: "platform-service" },
      production: { source: "stable", value: "platform-service" },
    },
  },
  PLATFORM_AUTH_CLIENT_ID: {
    description: "平台认证客户端",
    purpose: "配置平台认证客户端，供 platform-auth 配置域内的相关服务使用。",
    roles: ["platform-service"],
    scope: "platform-auth",
    environments: {
      development: { source: "stable", value: "platform-web-bff" },
      production: { source: "stable", value: "platform-web-bff" },
    },
  },
  PLATFORM_AUTH_ALGORITHM: {
    description: "平台认证签名算法",
    purpose: "配置平台认证签名算法，供 platform-auth 配置域内的相关服务使用。",
    roles: ["platform-service"],
    scope: "platform-auth",
    environments: {
      development: { source: "stable", value: "EdDSA" },
      production: { source: "stable", value: "EdDSA" },
    },
  },
  PLATFORM_AUTH_REQUIRED_SCOPE: {
    description: "平台服务必需权限范围",
    purpose: "配置平台服务必需权限范围，供 platform-auth 配置域内的相关服务使用。",
    roles: ["platform-service"],
    scope: "platform-auth",
    environments: {
      development: { source: "stable", value: "platform:read" },
      production: { source: "stable", value: "platform:read" },
    },
  },
  PLATFORM_AUTH_JWKS_FETCH_TIMEOUT_MS: {
    description: "平台服务获取 JWKS 超时时间",
    purpose: "配置平台服务获取 JWKS 超时时间，供 platform-auth 配置域内的相关服务使用。",
    roles: ["platform-service"],
    scope: "platform-auth",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "2000" },
      production: { source: "stable", value: "2000" },
    },
  },
  PLATFORM_AUTH_INTERNAL_BASE_URL: {
    description: "认证服务内部访问地址",
    purpose: "配置认证服务内部访问地址，供 platform-auth 配置域内的相关服务使用。",
    roles: ["platform-service"],
    scope: "platform-auth",
    validation: "http-origin",
    examples: {
      development: "http://127.0.0.1:3200",
      production: "https://evcs-auth.hztgwm.com",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PLATFORM_AUTH_INTERNAL_TIMEOUT_MS: {
    description: "认证服务内部调用超时时间",
    purpose: "配置认证服务内部调用超时时间，供 platform-auth 配置域内的相关服务使用。",
    roles: ["platform-service"],
    scope: "platform-auth",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "1500" },
      production: { source: "stable", value: "1500" },
    },
  },

  PLATFORM_WEB_BFF_HOST: {
    description: "平台 Web BFF 监听地址",
    purpose: "配置平台 Web BFF 监听地址，供 platform-bff 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff",
    environments: {
      development: { source: "stable", value: "127.0.0.1" },
      production: { source: "stable", value: "0.0.0.0" },
    },
  },
  PLATFORM_WEB_BFF_PORT: {
    description: "平台 Web BFF 端口",
    purpose: "配置平台 Web BFF 端口，供 platform-bff 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "3210" },
      production: { source: "stable", value: "3210" },
    },
  },
  PLATFORM_WEB_BFF_AUTH_ISSUER: {
    description: "平台 Web BFF 认证签发方",
    purpose: "配置平台 Web BFF 认证签发方，供 platform-bff-auth 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-auth",
    validation: "http-url",
    examples: {
      development: "http://127.0.0.1:3200/platform",
      production: "https://evcs-auth.hztgwm.com/platform",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PLATFORM_WEB_BFF_OAUTH_CLIENT_ID: {
    description: "平台 Web BFF OAuth 客户端",
    purpose: "配置平台 Web BFF OAuth 客户端，供 platform-bff-auth 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-auth",
    environments: {
      development: { source: "stable", value: "platform-web-bff" },
      production: { source: "stable", value: "platform-web-bff" },
    },
  },
  PLATFORM_WEB_BFF_OAUTH_CLIENT_SECRET: {
    description: "平台 Web BFF OAuth 共享客户端密钥",
    purpose: "配置平台 Web BFF OAuth 共享客户端密钥，供 platform-bff-secret 配置域内的相关服务使用。",
    roles: ["auth-service", "platform-web-bff"],
    scope: "platform-bff-secret",
    sensitive: true,
    validation: "non-empty",
    exposure: "server",
    aliases: { "auth-service": "AUTH_PLATFORM_WEB_BFF_CLIENT_SECRET" },
    examples: {
      development: "<generate-a-local-secret>",
      production: "<replace-with-unique-32-plus-character-secret>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PLATFORM_WEB_BFF_OAUTH_RESOURCE: {
    description: "平台 Web BFF OAuth 资源",
    purpose: "配置平台 Web BFF OAuth 资源，供 platform-bff-auth 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-auth",
    environments: {
      development: { source: "stable", value: "platform-service" },
      production: { source: "stable", value: "platform-service" },
    },
  },
  PLATFORM_WEB_BFF_OAUTH_SCOPES: {
    description: "平台 Web BFF OAuth 权限范围",
    purpose: "配置平台 Web BFF OAuth 权限范围，供 platform-bff-auth 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-auth",
    environments: {
      development: {
        source: "stable",
        value: "openid profile email platform:read site-selection:read site-selection:write offline_access",
      },
      production: {
        source: "stable",
        value: "openid profile email platform:read site-selection:read site-selection:write offline_access",
      },
    },
  },
  PLATFORM_WEB_BFF_REDIS_URL: {
    description: "平台 Web BFF Redis 连接地址",
    purpose: "配置平台 Web BFF Redis 连接地址，供 platform-bff-session 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-session",
    sensitive: true,
    validation: "redis-url",
    exposure: "server",
    examples: {
      development: "redis://127.0.0.1:6379/0",
      production: "redis://:<password>@<redis-internal-host>:6379/0",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PLATFORM_WEB_BFF_TOKEN_KEYRING: {
    description: "平台 Web BFF 令牌加密密钥环",
    purpose: "配置平台 Web BFF 令牌加密密钥环，供 platform-bff-secret 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-secret",
    sensitive: true,
    validation: "canonical-keyring",
    exposure: "server",
    examples: {
      development: "<generate-a-canonical-keyring>",
      production: "<replace-with-versioned-aes-256-keyring>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PLATFORM_WEB_BFF_RATE_LIMIT_SECRET: {
    description: "平台 Web BFF 限流密钥",
    purpose: "配置平台 Web BFF 限流密钥，供 platform-bff-secret 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-secret",
    sensitive: true,
    validation: "non-empty",
    exposure: "server",
    examples: {
      development: "<generate-a-local-secret>",
      production: "<replace-with-unique-32-plus-character-secret>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PLATFORM_WEB_BFF_SESSION_TTL_SECONDS: {
    description: "平台 Web BFF 会话绝对有效期",
    purpose: "配置平台 Web BFF 会话绝对有效期，供 platform-bff-session 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-session",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "2592000" },
      production: { source: "stable", value: "2592000" },
    },
  },
  PLATFORM_WEB_BFF_LOGIN_TTL_SECONDS: {
    description: "平台 Web BFF 登录事务有效期",
    purpose: "配置平台 Web BFF 登录事务有效期，供 platform-bff-session 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-session",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "600" },
      production: { source: "stable", value: "600" },
    },
  },
  PLATFORM_WEB_BFF_AUTH_TIMEOUT_MS: {
    description: "平台 Web BFF 认证调用超时时间",
    purpose: "配置平台 Web BFF 认证调用超时时间，供 platform-bff-network 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-network",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "5000" },
      production: { source: "stable", value: "5000" },
    },
  },
  PLATFORM_WEB_BFF_PROXY_TIMEOUT_MS: {
    description: "平台 Web BFF 代理超时时间",
    purpose: "配置平台 Web BFF 代理超时时间，供 platform-bff-network 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-network",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "900000" },
      production: { source: "stable", value: "900000" },
    },
  },
  PLATFORM_WEB_BFF_MAX_REQUEST_BYTES: {
    description: "平台 Web BFF 最大请求字节数",
    purpose: "配置平台 Web BFF 最大请求字节数，供 platform-bff-network 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-network",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "314638336" },
      production: { source: "stable", value: "314638336" },
    },
  },
  PLATFORM_WEB_BFF_PLATFORM_ORIGIN: {
    description: "平台 Web BFF 的平台服务源地址",
    purpose: "配置平台 Web BFF 的平台服务源地址，供 platform-bff-upstream 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-upstream",
    validation: "http-origin",
    examples: {
      development: "http://127.0.0.1:3300",
      production: "https://evcs-service.hztgwm.com",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PLATFORM_WEB_BFF_SITE_SELECTION_ORIGIN: {
    description: "平台 Web BFF 的选址 V2 服务源地址",
    purpose: "配置平台 Web BFF 的选址 V2 服务源地址，供 platform-bff-upstream 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-upstream",
    validation: "http-origin",
    examples: {
      development: "http://127.0.0.1:5004",
      production: "https://site-agent-service.hztgwm.com",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PLATFORM_WEB_BFF_CLIENT_IP_HEADER: {
    description: "平台 Web BFF 可信客户端 IP 请求头",
    purpose: "配置平台 Web BFF 可信客户端 IP 请求头，供 platform-bff-network 配置域内的相关服务使用。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-network",
    environments: {
      development: { source: "stable", value: "x-forwarded-for" },
      production: { source: "stable", value: "x-forwarded-for" },
    },
  },
  PLATFORM_WEB_BFF_TRUSTED_PROXY_CIDRS: {
    description: "平台 Web BFF 可信代理网段",
    purpose: "定义平台 Web BFF 解析原始客户端地址时可以信任的代理网段。",
    roles: ["platform-web-bff"],
    scope: "platform-bff-network",
    examples: { development: "", production: "100.64.0.0/10" },
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-required" },
    },
  },

  PLATFORM_WEB_PORT: {
    description: "平台 Web 开发端口",
    purpose: "配置平台 Web 开发服务器端口；生产监听端口由运行平台注入。",
    roles: ["platform-web-build"],
    scope: "platform-web",
    validation: "positive-integer",
    aliases: { "platform-web-build": "PORT" },
    environments: {
      development: { source: "stable", value: "3250" },
      production: { source: "runtime-managed" },
    },
  },
  PUBLIC_TIANDITU_TOKEN: {
    description: "浏览器端天地图令牌",
    purpose: "配置浏览器端天地图令牌，供 platform-web 配置域内的相关服务使用。",
    roles: ["platform-web-build", "site-selection-web-build"],
    scope: "platform-web",
    exposure: "build-public",
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-optional" },
    },
  },
  PUBLIC_AMAP_KEY: {
    description: "浏览器端高德地图密钥",
    purpose: "配置浏览器端高德地图密钥，供 platform-web 配置域内的相关服务使用。",
    roles: ["platform-web-build", "site-selection-web-build"],
    scope: "platform-web",
    exposure: "build-public",
    optionalRoles: ["site-selection-web-build"],
    examples: {
      development: "<replace-with-amap-browser-key>",
      production: "<replace-with-amap-browser-key>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PUBLIC_AMAP_SECURITY_JS_CODE: {
    description: "浏览器端高德地图安全密钥",
    purpose: "配置浏览器端高德地图安全密钥，供 platform-web 配置域内的相关服务使用。",
    roles: ["platform-web-build", "site-selection-web-build"],
    scope: "platform-web",
    exposure: "build-public",
    optionalRoles: ["site-selection-web-build"],
    examples: {
      development: "<replace-with-amap-security-code>",
      production: "<replace-with-amap-security-code>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },

  SITE_SELECTION_V2_SERVICE_HOST: {
    description: "选址 V2 服务监听地址",
    purpose: "配置选址 V2 服务监听地址，供 site-selection-v2 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2",
    environments: {
      development: { source: "stable", value: "127.0.0.1" },
      production: { source: "stable", value: "0.0.0.0" },
    },
  },
  SITE_SELECTION_V2_SERVICE_PORT: {
    description: "选址 V2 服务端口",
    purpose: "配置选址 V2 服务端口，供 site-selection-v2 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "5004" },
      production: { source: "stable", value: "5004" },
    },
  },
  SITE_SELECTION_V2_AUTH_ISSUER: {
    description: "选址 V2 认证签发方",
    purpose: "配置选址 V2 认证签发方，供 site-selection-v2-auth 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-auth",
    validation: "http-url",
    examples: {
      development: "http://127.0.0.1:3200/platform",
      production: "https://evcs-auth.hztgwm.com/platform",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_AUTH_JWKS_URL: {
    description: "选址 V2 认证 JWKS 地址",
    purpose: "配置选址 V2 认证 JWKS 地址，供 site-selection-v2-auth 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-auth",
    validation: "http-url",
    examples: {
      development: "http://127.0.0.1:3200/platform/jwks",
      production: "https://evcs-auth.hztgwm.com/platform/jwks",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_AUTH_AUDIENCE: {
    description: "选址 V2 认证受众",
    purpose: "配置选址 V2 认证受众，供 site-selection-v2-auth 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-auth",
    environments: {
      development: { source: "stable", value: "platform-service" },
      production: { source: "stable", value: "platform-service" },
    },
  },
  SITE_SELECTION_V2_AUTH_CLIENT_ID: {
    description: "选址 V2 认证客户端",
    purpose: "配置选址 V2 认证客户端，供 site-selection-v2-auth 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-auth",
    environments: {
      development: { source: "stable", value: "platform-web-bff" },
      production: { source: "stable", value: "platform-web-bff" },
    },
  },
  SITE_SELECTION_V2_AUTH_ALGORITHM: {
    description: "选址 V2 认证签名算法",
    purpose: "配置选址 V2 认证签名算法，供 site-selection-v2-auth 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-auth",
    environments: {
      development: { source: "stable", value: "EdDSA" },
      production: { source: "stable", value: "EdDSA" },
    },
  },
  SITE_SELECTION_V2_AUTH_READ_SCOPE: {
    description: "选址 V2 读取权限范围",
    purpose: "配置选址 V2 读取权限范围，供 site-selection-v2-auth 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-auth",
    environments: {
      development: { source: "stable", value: "site-selection:read" },
      production: { source: "stable", value: "site-selection:read" },
    },
  },
  SITE_SELECTION_V2_AUTH_WRITE_SCOPE: {
    description: "选址 V2 写入权限范围",
    purpose: "配置选址 V2 写入权限范围，供 site-selection-v2-auth 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-auth",
    environments: {
      development: { source: "stable", value: "site-selection:write" },
      production: { source: "stable", value: "site-selection:write" },
    },
  },
  SITE_SELECTION_V2_AUTH_JWKS_FETCH_TIMEOUT_MS: {
    description: "选址 V2 获取 JWKS 超时时间",
    purpose: "配置选址 V2 获取 JWKS 超时时间，供 site-selection-v2-auth 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-auth",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "2000" },
      production: { source: "stable", value: "2000" },
    },
  },
  SITE_SELECTION_V2_TRAFFIC_PRODUCT_ROOT: {
    description: "交通产品根目录",
    purpose: "配置交通产品根目录，供 site-selection-v2-traffic 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-traffic",
    examples: {
      development: "/absolute/path/to/EVCS/.data/traffic/products",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "stable", value: "/data/traffic/products" },
    },
  },
  SITE_SELECTION_V2_TRAFFIC_TITILER_URL: {
    description: "TiTiler 服务地址",
    purpose: "配置TiTiler 服务地址，供 site-selection-v2-traffic 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-traffic",
    validation: "http-origin",
    environments: {
      development: { source: "stable", value: "http://127.0.0.1:8000" },
      production: { source: "stable", value: "http://127.0.0.1:8000" },
    },
  },
  SITE_SELECTION_V2_TRAFFIC_TILE_MIN_ZOOM: {
    description: "交通图层最小缩放级别",
    purpose: "配置交通图层最小缩放级别，供 site-selection-v2-traffic 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-traffic",
    validation: "non-negative-integer",
    environments: {
      development: { source: "stable", value: "5" },
      production: { source: "stable", value: "5" },
    },
  },
  SITE_SELECTION_V2_TRAFFIC_TILE_MAX_ZOOM: {
    description: "交通图层最大缩放级别",
    purpose: "配置交通图层最大缩放级别，供 site-selection-v2-traffic 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-traffic",
    validation: "non-negative-integer",
    environments: {
      development: { source: "stable", value: "14" },
      production: { source: "stable", value: "14" },
    },
  },
  SITE_SELECTION_V2_CLICKHOUSE_HTTP_URL: {
    description: "ClickHouse 服务地址",
    purpose: "配置ClickHouse 服务地址，供 site-selection-v2-clickhouse 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-clickhouse",
    validation: "http-url",
    examples: {
      development: "https://<clickhouse-host>:8443",
      production: "https://<clickhouse-host>:8443",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_CLICKHOUSE_USERNAME: {
    description: "ClickHouse 用户名",
    purpose: "配置ClickHouse 用户名，供 site-selection-v2-clickhouse 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-clickhouse",
    examples: {
      development: "<clickhouse-username>",
      production: "<replace-with-clickhouse-user>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_CLICKHOUSE_PASSWORD: {
    description: "ClickHouse 密码",
    purpose: "配置ClickHouse 密码，供 site-selection-v2-clickhouse 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-clickhouse",
    sensitive: true,
    examples: {
      development: "<clickhouse-password>",
      production: "<replace-with-clickhouse-password>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_CLICKHOUSE_DATABASE: {
    description: "ClickHouse 数据库名",
    purpose: "配置ClickHouse 数据库名，供 site-selection-v2-clickhouse 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-clickhouse",
    examples: {
      development: "traffic",
      production: "<replace-with-clickhouse-database>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_CLICKHOUSE_TLS_CA_CERT_PATH: {
    description: "ClickHouse TLS CA 证书路径",
    purpose: "配置ClickHouse 私有 CA 证书路径，供 site-selection-v2-clickhouse 配置域内的相关服务校验服务端证书。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-clickhouse",
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-optional" },
    },
  },
  SITE_SELECTION_V2_CLICKHOUSE_TLS_REJECT_UNAUTHORIZED: {
    description: "ClickHouse TLS 证书校验开关",
    purpose: "配置ClickHouse TLS 证书校验开关，供 site-selection-v2-clickhouse 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-clickhouse",
    validation: "boolean",
    environments: {
      development: { source: "stable", value: "false" },
      production: { source: "external-optional" },
    },
  },
  SITE_SELECTION_V2_ROAD_EXPRESSWAY_GEOJSON: {
    description: "高速公路 GeoJSON 文件路径",
    purpose: "配置高速公路 GeoJSON 文件路径，供 site-selection-v2-road 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-road",
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-optional" },
    },
  },
  SITE_SELECTION_V2_ROAD_ORDINARY_GEOJSON: {
    description: "普通道路 GeoJSON 文件路径",
    purpose: "配置普通道路 GeoJSON 文件路径，供 site-selection-v2-road 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-road",
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-optional" },
    },
  },
  SITE_SELECTION_V2_ROAD_NETWORK_VERSION: {
    description: "路网数据版本",
    purpose: "配置路网数据版本，供 site-selection-v2-road 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-road",
    environments: {
      development: { source: "stable", value: "henan-road-20260805-v1" },
      production: { source: "stable", value: "henan-road-20260805-v1" },
    },
  },
  SITE_SELECTION_V2_ROAD_MATCHING_ALGORITHM_VERSION: {
    description: "道路匹配算法版本",
    purpose: "配置道路匹配算法版本，供 site-selection-v2-road 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-road",
    environments: {
      development: { source: "stable", value: "nearest-100m-v1" },
      production: { source: "stable", value: "nearest-100m-v1" },
    },
  },
  SITE_SELECTION_V2_ROAD_ENERGY_STATISTICS_AVAILABLE: {
    description: "道路能量统计开关",
    purpose: "配置道路能量统计开关，供 site-selection-v2-road 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-road",
    validation: "boolean",
    environments: {
      development: { source: "stable", value: "true" },
      production: { source: "stable", value: "true" },
    },
  },
  SITE_SELECTION_V2_CONTACT_PHONE_ENCRYPTION_KEY: {
    description: "联系人电话加密密钥",
    purpose: "配置联系人电话加密密钥，供 site-selection-v2-secret 配置域内的相关服务使用。",
    roles: siteSelectionV2Roles,
    scope: "site-selection-v2-secret",
    sensitive: true,
    validation: "canonical-base64-32",
    examples: {
      development: "<32-byte-key-in-base64>",
      production: "<replace-with-canonical-base64-32-byte-key>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_OSS_REGION: {
    description: "对象存储地域",
    purpose: "配置对象存储地域，供 site-selection-v2-oss 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-oss",
    examples: {
      development: "oss-cn-hangzhou",
      production: "<replace-with-oss-region>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_OSS_ENDPOINT: {
    description: "对象存储访问端点",
    purpose: "配置对象存储访问端点，供 site-selection-v2-oss 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-oss",
    validation: "https-url",
    examples: {
      development: "https://oss-cn-hangzhou.aliyuncs.com",
      production: "https://<oss-endpoint>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_OSS_ACCESS_KEY_ID: {
    description: "对象存储访问密钥 ID",
    purpose: "配置对象存储访问密钥 ID，供 site-selection-v2-oss 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-oss",
    sensitive: true,
    examples: {
      development: "<access-key-id>",
      production: "<replace-with-oss-access-key-id>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_OSS_ACCESS_KEY_SECRET: {
    description: "对象存储访问密钥 Secret",
    purpose: "配置对象存储访问密钥 Secret，供 site-selection-v2-oss 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-oss",
    sensitive: true,
    examples: {
      development: "<access-key-secret>",
      production: "<replace-with-oss-access-key-secret>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_OSS_BUCKET: {
    description: "对象存储 Bucket",
    purpose: "配置对象存储 Bucket，供 site-selection-v2-oss 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-oss",
    examples: {
      development: "<bucket-name>",
      production: "<replace-with-oss-bucket>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_OSS_PUBLIC_BASE_URL: {
    description: "对象存储公网基础地址",
    purpose: "配置对象存储公网基础地址，供 site-selection-v2-oss 配置域内的相关服务使用。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-oss",
    validation: "https-url",
    examples: {
      development: "https://<public-cdn-domain>/site-exploration",
      production: "https://<oss-public-host>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_OSS_UPLOAD_ROLE_ARN: {
    description: "对象存储浏览器直传 RAM 角色 ARN",
    purpose: "配置浏览器直传对象存储时由站点选择 V2 API 申请短期 STS 凭证使用的 RAM 角色。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-oss",
    examples: {
      development: "acs:ram::1234567890123456:role/evcs-site-upload",
      production: "acs:ram::<account-id>:role/evcs-site-upload",
    },
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_UPLOAD_TICKET_SECRET: {
    description: "勘探文件上传票据签名密钥",
    purpose: "签发并校验勘探文件直传完成票据，绑定站点、成员、文件元数据和对象存储键。",
    roles: ["site-selection-v2-api"],
    scope: "site-selection-v2-secret",
    sensitive: true,
    validation: "canonical-base64-32",
    examples: {
      development: "<32-byte-key-in-base64>",
      production: "<replace-with-canonical-base64-32-byte-key>",
    },
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_LLM_PROVIDER: {
    description: "大模型服务商协议",
    purpose: "配置大模型服务商协议，供 site-selection-v2-llm 配置域内的相关服务使用。",
    roles: siteSelectionV2Roles,
    scope: "site-selection-v2-llm",
    environments: {
      development: { source: "stable", value: "openai-compatible" },
      production: { source: "stable", value: "openai-compatible" },
    },
  },
  SITE_SELECTION_V2_LLM_BASE_URL: {
    description: "大模型服务基础地址",
    purpose: "配置大模型服务基础地址，供 site-selection-v2-llm 配置域内的相关服务使用。",
    roles: siteSelectionV2Roles,
    scope: "site-selection-v2-llm",
    validation: "https-url",
    examples: {
      development: "https://llm.example.com/v1",
      production: "https://<llm-api-host>/v1",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_LLM_API_KEY: {
    description: "大模型服务 API 密钥",
    purpose: "配置大模型服务 API 密钥，供 site-selection-v2-llm 配置域内的相关服务使用。",
    roles: siteSelectionV2Roles,
    scope: "site-selection-v2-llm",
    sensitive: true,
    examples: {
      development: "<llm-api-key>",
      production: "<replace-with-llm-api-key>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_LLM_MODEL: {
    description: "大模型名称",
    purpose: "配置大模型名称，供 site-selection-v2-llm 配置域内的相关服务使用。",
    roles: siteSelectionV2Roles,
    scope: "site-selection-v2-llm",
    examples: {
      development: "<model-name>",
      production: "<replace-with-model-name>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_V2_LLM_TEMPERATURE: {
    description: "大模型生成温度",
    purpose: "配置大模型生成温度，供 site-selection-v2-llm 配置域内的相关服务使用。",
    roles: siteSelectionV2Roles,
    scope: "site-selection-v2-llm",
    environments: {
      development: { source: "stable", value: "0.1" },
      production: { source: "stable", value: "0.2" },
    },
  },
  SITE_SELECTION_V2_LLM_TIMEOUT_MS: {
    description: "大模型调用超时时间",
    purpose: "配置大模型调用超时时间，供 site-selection-v2-llm 配置域内的相关服务使用。",
    roles: siteSelectionV2Roles,
    scope: "site-selection-v2-llm",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "60000" },
      production: { source: "stable", value: "120000" },
    },
  },
  SITE_SELECTION_V2_LLM_MAX_OUTPUT_TOKENS: {
    description: "大模型最大输出令牌数",
    purpose: "配置大模型最大输出令牌数，供 site-selection-v2-llm 配置域内的相关服务使用。",
    roles: siteSelectionV2Roles,
    scope: "site-selection-v2-llm",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "16384" },
      production: { source: "stable", value: "8192" },
    },
  },
  SITE_SELECTION_V2_LLM_MAX_INPUT_CHARS: {
    description: "大模型最大输入字符数",
    purpose: "配置大模型最大输入字符数，供 site-selection-v2-llm 配置域内的相关服务使用。",
    roles: siteSelectionV2Roles,
    scope: "site-selection-v2-llm",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "60000" },
      production: { source: "stable", value: "120000" },
    },
  },
  SITE_SELECTION_V2_LLM_MAX_CONCURRENCY: {
    description: "大模型最大并发数",
    purpose: "配置选址任务工作进程调用大模型时的最大并发数。",
    roles: ["site-selection-v2-worker"],
    scope: "site-selection-v2-llm",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "2" },
      production: { source: "stable", value: "2" },
    },
  },
  SITE_SELECTION_V2_WORKER_INTERVAL_SECONDS: {
    description: "任务工作进程轮询间隔",
    purpose: "配置任务工作进程轮询间隔，供 site-selection-v2-worker 配置域内的相关服务使用。",
    roles: ["site-selection-v2-worker"],
    scope: "site-selection-v2-worker",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "1" },
      production: { source: "stable", value: "5" },
    },
  },
  SITE_SELECTION_V2_WORKER_LEASE_SECONDS: {
    description: "任务工作进程租约时长",
    purpose: "配置任务工作进程租约时长，供 site-selection-v2-worker 配置域内的相关服务使用。",
    roles: ["site-selection-v2-worker"],
    scope: "site-selection-v2-worker",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "120" },
      production: { source: "stable", value: "60" },
    },
  },
  SITE_SELECTION_V2_WORKER_HEARTBEAT_SECONDS: {
    description: "任务工作进程心跳间隔",
    purpose: "配置任务工作进程心跳间隔，供 site-selection-v2-worker 配置域内的相关服务使用。",
    roles: ["site-selection-v2-worker"],
    scope: "site-selection-v2-worker",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "30" },
      production: { source: "stable", value: "20" },
    },
  },
  SITE_SELECTION_V2_WORKER_SHUTDOWN_TIMEOUT_SECONDS: {
    description: "任务工作进程关闭超时时间",
    purpose: "配置任务工作进程关闭超时时间，供 site-selection-v2-worker 配置域内的相关服务使用。",
    roles: ["site-selection-v2-worker"],
    scope: "site-selection-v2-worker",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "30" },
      production: { source: "stable", value: "30" },
    },
  },

  CLICKHOUSE_HTTP_URL: {
    description: "旧版 ClickHouse 服务地址",
    purpose: "配置旧版 ClickHouse 服务地址，供 site-selection-clickhouse 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-clickhouse",
    validation: "http-url",
    examples: {
      development: "https://<clickhouse-vpc-host>:8443",
      production: "https://<clickhouse-vpc-host>:8443",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  CLICKHOUSE_USERNAME: {
    description: "旧版 ClickHouse 用户名",
    purpose: "配置旧版 ClickHouse 用户名，供 site-selection-clickhouse 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-clickhouse",
    examples: {
      development: "<clickhouse-username>",
      production: "<clickhouse-username>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  CLICKHOUSE_PASSWORD: {
    description: "旧版 ClickHouse 密码",
    purpose: "配置旧版 ClickHouse 密码，供 site-selection-clickhouse 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-clickhouse",
    sensitive: true,
    examples: {
      development: "<clickhouse-password>",
      production: "<clickhouse-password>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  CLICKHOUSE_DATABASE: {
    description: "旧版 ClickHouse 数据库名",
    purpose: "配置旧版 ClickHouse 数据库名，供 site-selection-clickhouse 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-clickhouse",
    examples: { development: "traffic", production: "traffic" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  CLICKHOUSE_GRID_VERSION: {
    description: "旧版 ClickHouse 网格版本",
    purpose: "配置旧版 ClickHouse 网格版本，供 site-selection-traffic 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-traffic",
    environments: {
      development: { source: "stable", value: "henan_mvp" },
      production: { source: "stable", value: "henan_mvp" },
    },
  },
  CLICKHOUSE_TLS_CA_CERT_PATH: {
    description: "旧版 ClickHouse CA 证书路径",
    purpose: "配置旧版 ClickHouse CA 证书路径，供 site-selection-clickhouse 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-clickhouse",
    environments: {
      development: { source: "external-optional" },
      production: { source: "external-optional" },
    },
  },
  CLICKHOUSE_TLS_REJECT_UNAUTHORIZED: {
    description: "旧版 ClickHouse TLS 证书校验开关",
    purpose: "配置旧版 ClickHouse TLS 证书校验开关，供 site-selection-clickhouse 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-clickhouse",
    validation: "boolean",
    environments: {
      development: { source: "stable", value: "true" },
      production: { source: "stable", value: "true" },
    },
  },
  TRAFFIC_PRODUCT_ROOT: {
    description: "旧版交通产品根目录",
    purpose: "配置旧版交通产品根目录，供 site-selection-traffic 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-traffic",
    examples: {
      development: "/data/traffic/products",
      production: "/data/traffic/products",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  TRAFFIC_STATE_ROOT: {
    description: "旧版交通状态根目录",
    purpose: "配置旧版交通状态根目录，供 site-selection-traffic 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-traffic",
    examples: {
      development: "/data/traffic/state",
      production: "/data/traffic/state",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  TRAFFIC_TITILER_URL: {
    description: "旧版 TiTiler 服务地址",
    purpose: "配置旧版 TiTiler 服务地址，供 site-selection-traffic 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-traffic",
    validation: "http-origin",
    examples: {
      development: "http://127.0.0.1:8000",
      production: "http://127.0.0.1:8000",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  TRAFFIC_GRAY_MAX: {
    description: "旧版交通灰度最大值",
    purpose: "配置旧版交通灰度最大值，供 site-selection-traffic 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-traffic",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "51" },
      production: { source: "stable", value: "500" },
    },
  },
  TRAFFIC_GRAY_SCALE_VERSION: {
    description: "旧版交通灰度版本",
    purpose: "配置旧版交通灰度版本，供 site-selection-traffic 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-traffic",
    environments: {
      development: { source: "stable", value: "p99_20260115_available_v1" },
      production: { source: "stable", value: "mvp_v1" },
    },
  },
  TRAFFIC_TILE_MIN_ZOOM: {
    description: "旧版交通图层最小缩放级别",
    purpose: "配置旧版交通图层最小缩放级别，供 site-selection-traffic 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-traffic",
    validation: "non-negative-integer",
    environments: {
      development: { source: "stable", value: "5" },
      production: { source: "stable", value: "5" },
    },
  },
  TRAFFIC_TILE_MAX_ZOOM: {
    description: "旧版交通图层最大缩放级别",
    purpose: "配置旧版交通图层最大缩放级别，供 site-selection-traffic 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-traffic",
    validation: "non-negative-integer",
    environments: {
      development: { source: "stable", value: "14" },
      production: { source: "stable", value: "14" },
    },
  },
  GDAL_TRANSLATE_BIN: {
    description: "旧版 GDAL Translate 可执行文件",
    purpose: "配置旧版 GDAL Translate 可执行文件，供 site-selection-traffic 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-traffic",
    environments: {
      development: { source: "stable", value: "gdal_translate" },
      production: { source: "stable", value: "gdal_translate" },
    },
  },
  GDALINFO_BIN: {
    description: "旧版 GDAL Info 可执行文件",
    purpose: "配置旧版 GDAL Info 可执行文件，供 site-selection-traffic 配置域内的相关服务使用。",
    roles: legacySiteSelectionServerRoles,
    scope: "site-selection-traffic",
    environments: {
      development: { source: "stable", value: "gdalinfo" },
      production: { source: "stable", value: "gdalinfo" },
    },
  },

  SITE_SELECTION_SERVICE_PORT: {
    description: "旧版选址 API 端口",
    purpose: "配置旧版选址 API 端口，供 site-selection-api 配置域内的相关服务使用。",
    roles: ["site-selection-service-api"],
    scope: "site-selection-api",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "5003" },
      production: { source: "stable", value: "5003" },
    },
  },
  SITE_SELECTION_PUBLIC_API_ORIGIN: {
    description: "旧版选址公网 API 源地址",
    purpose: "配置旧版选址公网 API 源地址，供 site-selection-api 配置域内的相关服务使用。",
    roles: ["site-selection-service-api"],
    scope: "site-selection-api",
    validation: "http-origin",
    examples: {
      development: "http://localhost:5003",
      production: "https://<site-selection-api-host>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_WEB_ORIGIN: {
    description: "旧版选址 Web 源地址",
    purpose: "配置旧版选址 Web 源地址，供 site-selection-api 配置域内的相关服务使用。",
    roles: ["site-selection-service-api"],
    scope: "site-selection-api",
    validation: "http-origin",
    examples: {
      development: "http://localhost:3003",
      production: "https://site-selection.example.com",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  SITE_SELECTION_SESSION_SECRET: {
    description: "旧版选址会话密钥",
    purpose: "配置旧版选址会话密钥，供 site-selection-secret 配置域内的相关服务使用。",
    roles: ["site-selection-service-api"],
    scope: "site-selection-secret",
    sensitive: true,
    examples: {
      development: "<at-least-32-random-characters>",
      production: "<at-least-32-random-characters>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  HEAVY_TRUCK_SSO_SHARED_SECRET: {
    description: "重卡单点登录共享密钥",
    purpose: "配置重卡单点登录共享密钥，供 site-selection-secret 配置域内的相关服务使用。",
    roles: ["site-selection-service-api"],
    scope: "site-selection-secret",
    sensitive: true,
    examples: {
      development: "<at-least-32-random-characters-shared-with-heavy-truck>",
      production: "<at-least-32-random-characters-shared-with-heavy-truck>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  HEAVY_TRUCK_SSO_START_URL: {
    description: "重卡单点登录入口地址",
    purpose: "配置重卡单点登录入口地址，供 site-selection-api 配置域内的相关服务使用。",
    roles: ["site-selection-service-api"],
    scope: "site-selection-api",
    validation: "http-url",
    examples: {
      development: "http://localhost:3000/auth/sso/start",
      production: "https://heavy-truck.hztgwm.com/auth/sso/start",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AGENTOS_BASE_URL: {
    description: "AgentOS 服务基础地址",
    purpose: "配置AgentOS 服务基础地址，供 site-selection-agentos 配置域内的相关服务使用。",
    roles: ["site-selection-service-api"],
    scope: "site-selection-agentos",
    validation: "http-origin",
    examples: {
      development: "<agentos-base-url>",
      production: "<agentos-base-url>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AGENTOS_API_KEY: {
    description: "AgentOS API 密钥",
    purpose: "配置AgentOS API 密钥，供 site-selection-agentos 配置域内的相关服务使用。",
    roles: ["site-selection-service-api"],
    scope: "site-selection-agentos",
    sensitive: true,
    examples: {
      development: "<agentos-api-key>",
      production: "<agentos-api-key>",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },

  SITE_ANALYSIS_SCAN_BATCH_SIZE: {
    description: "旧版分析任务扫描批次大小",
    purpose: "配置旧版分析任务扫描批次大小，供 site-selection-worker 配置域内的相关服务使用。",
    roles: ["site-selection-service-worker"],
    scope: "site-selection-worker",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "20" },
      production: { source: "stable", value: "20" },
    },
  },
  SITE_ANALYSIS_TIMEOUT_SECONDS: {
    description: "旧版分析任务超时时间",
    purpose: "配置旧版分析任务超时时间，供 site-selection-worker 配置域内的相关服务使用。",
    roles: ["site-selection-service-worker"],
    scope: "site-selection-worker",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "900" },
      production: { source: "stable", value: "900" },
    },
  },
  SITE_ANALYSIS_WORKER_INTERVAL_SECONDS: {
    description: "旧版工作进程轮询间隔",
    purpose: "配置旧版工作进程轮询间隔，供 site-selection-worker 配置域内的相关服务使用。",
    roles: ["site-selection-service-worker"],
    scope: "site-selection-worker",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "5" },
      production: { source: "stable", value: "5" },
    },
  },
  SITE_ANALYSIS_WORKER_SHUTDOWN_TIMEOUT_SECONDS: {
    description: "旧版工作进程关闭超时时间",
    purpose: "配置旧版工作进程关闭超时时间，供 site-selection-worker 配置域内的相关服务使用。",
    roles: ["site-selection-service-worker"],
    scope: "site-selection-worker",
    validation: "positive-integer",
    environments: {
      development: { source: "stable", value: "25" },
      production: { source: "stable", value: "25" },
    },
  },
  AGENTOS_SITE_ANALYSIS_SURVEY_AGENT_ID: {
    description: "AgentOS 调研智能体 ID",
    purpose: "配置AgentOS 调研智能体 ID，供 site-selection-agentos 配置域内的相关服务使用。",
    roles: ["site-selection-service-worker"],
    scope: "site-selection-agentos",
    examples: { development: "<agent-id>", production: "<agent-id>" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AGENTOS_SITE_ANALYSIS_TRAFFIC_AGENT_ID: {
    description: "AgentOS 交通智能体 ID",
    purpose: "配置AgentOS 交通智能体 ID，供 site-selection-agentos 配置域内的相关服务使用。",
    roles: ["site-selection-service-worker"],
    scope: "site-selection-agentos",
    examples: { development: "<agent-id>", production: "<agent-id>" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AGENTOS_SITE_ANALYSIS_ROAD_AGENT_ID: {
    description: "AgentOS 道路智能体 ID",
    purpose: "配置AgentOS 道路智能体 ID，供 site-selection-agentos 配置域内的相关服务使用。",
    roles: ["site-selection-service-worker"],
    scope: "site-selection-agentos",
    examples: { development: "<agent-id>", production: "<agent-id>" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AGENTOS_SITE_ANALYSIS_SUPPORT_AGENT_ID: {
    description: "AgentOS 配套智能体 ID",
    purpose: "配置AgentOS 配套智能体 ID，供 site-selection-agentos 配置域内的相关服务使用。",
    roles: ["site-selection-service-worker"],
    scope: "site-selection-agentos",
    examples: { development: "<agent-id>", production: "<agent-id>" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AGENTOS_SITE_ANALYSIS_COMPETITION_AGENT_ID: {
    description: "AgentOS 竞争智能体 ID",
    purpose: "配置AgentOS 竞争智能体 ID，供 site-selection-agentos 配置域内的相关服务使用。",
    roles: ["site-selection-service-worker"],
    scope: "site-selection-agentos",
    examples: { development: "<agent-id>", production: "<agent-id>" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AGENTOS_SITE_ANALYSIS_LAND_AGENT_ID: {
    description: "AgentOS 土地智能体 ID",
    purpose: "配置AgentOS 土地智能体 ID，供 site-selection-agentos 配置域内的相关服务使用。",
    roles: ["site-selection-service-worker"],
    scope: "site-selection-agentos",
    examples: { development: "<agent-id>", production: "<agent-id>" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  AGENTOS_SITE_ANALYSIS_REPORT_AGENT_ID: {
    description: "AgentOS 报告智能体 ID",
    purpose: "配置AgentOS 报告智能体 ID，供 site-selection-agentos 配置域内的相关服务使用。",
    roles: ["site-selection-service-worker"],
    scope: "site-selection-agentos",
    examples: { development: "<agent-id>", production: "<agent-id>" },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },

  SITE_SELECTION_WEB_PORT: {
    description: "旧版选址 Web 开发端口",
    purpose: "配置旧版选址 Web 开发服务器端口；生产监听端口由运行平台注入。",
    roles: ["site-selection-web-build"],
    scope: "site-selection-web",
    validation: "positive-integer",
    aliases: { "site-selection-web-build": "PORT" },
    environments: {
      development: { source: "stable", value: "3003" },
      production: { source: "runtime-managed" },
    },
  },
  PUBLIC_API_BASE_URL: {
    description: "旧版浏览器端 API 基础地址",
    purpose: "配置旧版浏览器端 API 基础地址，供 site-selection-web 配置域内的相关服务使用。",
    roles: ["site-selection-web-build"],
    scope: "site-selection-web",
    exposure: "build-public",
    validation: "http-url",
    examples: {
      development: "http://localhost:5003",
      production: "https://site-agent-service.hztgwm.com",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
  PUBLIC_TRAFFIC_DEFAULT_WINDOW_START: {
    description: "旧版默认交通时间窗口",
    purpose: "配置旧版默认交通时间窗口，供 site-selection-web 配置域内的相关服务使用。",
    roles: ["site-selection-web-build"],
    scope: "site-selection-web",
    exposure: "build-public",
    examples: {
      development: "2026-01-15 10:00:00",
      production: "2026-01-15 10:00:00",
    },
    environments: {
      development: { source: "external-required" },
      production: { source: "external-required" },
    },
  },
} as const satisfies Readonly<Record<string, EnvironmentVariableDefinition>>;

export const deploymentVariables = {
  EVCS_ACR_REGISTRY: {
    description: "生产镜像仓库地址",
    purpose: "配置生产镜像仓库地址，供生产部署流程使用。",
    validation: "non-empty",
    example: "registry.cn-hangzhou.aliyuncs.com",
  },
  EVCS_ACR_NAMESPACE: {
    description: "生产镜像仓库命名空间",
    purpose: "配置生产镜像仓库命名空间，供生产部署流程使用。",
    validation: "non-empty",
    example: "tgwm-electric",
  },
  EVCS_RELEASE_OUTPUT: {
    description: "镜像发布元数据的工作区相对输出路径",
    purpose: "配置镜像发布元数据的工作区相对输出路径，供生产部署流程使用。",
    validation: "non-empty",
    example: "ops/.release/production-images.env",
  },
  EVCS_BUN_BASE_IMAGE: {
    description: "Bun 服务基础镜像",
    purpose: "配置Bun 服务基础镜像，供生产部署流程使用。",
    validation: "non-empty",
    example: "registry.cn-hangzhou.aliyuncs.com/tgwm-electric/node:20.15-bookworm-slim",
  },
  EVCS_NGINX_BASE_IMAGE: {
    description: "平台 Web Nginx 基础镜像",
    purpose: "配置平台 Web Nginx 基础镜像，供生产部署流程使用。",
    validation: "non-empty",
    example: "registry.cn-hangzhou.aliyuncs.com/tgwm-electric/nginx",
  },
  EVCS_AUTH_IMAGE: {
    description: "认证服务镜像",
    purpose: "配置认证服务镜像，供生产部署流程使用。",
    validation: "non-empty",
    example: "evcs-auth-service:local",
  },
  EVCS_PLATFORM_IMAGE: {
    description: "平台服务镜像",
    purpose: "配置平台服务镜像，供生产部署流程使用。",
    validation: "non-empty",
    example: "evcs-platform-service:local",
  },
  EVCS_PLATFORM_WEB_BFF_IMAGE: {
    description: "平台 Web BFF 镜像",
    purpose: "配置平台 Web BFF 镜像，供生产部署流程使用。",
    validation: "non-empty",
    example: "evcs-platform-web-bff:local",
  },
  EVCS_PLATFORM_WEB_IMAGE: {
    description: "平台 Web 镜像",
    purpose: "配置平台 Web 镜像，供生产部署流程使用。",
    validation: "non-empty",
    example: "evcs-platform-web:local",
  },
  EVCS_SITE_SELECTION_V2_IMAGE: {
    description: "选址 V2 服务镜像",
    purpose: "配置选址 V2 服务镜像，供生产部署流程使用。",
    validation: "non-empty",
    example: "evcs-site-selection-v2-service:local",
  },
  EVCS_AUTH_PORT: {
    description: "认证服务对外发布端口",
    purpose: "配置认证服务对外发布端口，供生产部署流程使用。",
    validation: "positive-integer",
    example: "3200",
  },
  EVCS_PLATFORM_PORT: {
    description: "平台服务对外发布端口",
    purpose: "配置平台服务对外发布端口，供生产部署流程使用。",
    validation: "positive-integer",
    example: "3300",
  },
  EVCS_PLATFORM_WEB_PORT: {
    description: "平台 Web 对外发布端口",
    purpose: "配置平台 Web 对外发布端口，供生产部署流程使用。",
    validation: "positive-integer",
    example: "8080",
  },
  EVCS_SITE_SELECTION_PORT: {
    description: "选址 V2 服务对外发布端口",
    purpose: "配置选址 V2 服务对外发布端口，供生产部署流程使用。",
    validation: "positive-integer",
    example: "5004",
  },
} as const satisfies Readonly<Record<string, DeploymentVariableDefinition>>;

const entries = Object.entries(environmentVariables) as [string, EnvironmentVariableDefinition][];
export const keysByRole = Object.fromEntries(
  environmentRoles.map((role) => [
    role,
    entries.flatMap(([key, definition]) => (definition.roles.includes(role) ? [key] : [])),
  ]),
) as Record<EnvironmentRole, readonly string[]>;
export const aliasesByRole = Object.fromEntries(
  environmentRoles.map((role) => [
    role,
    Object.fromEntries(
      entries.flatMap(([key, definition]) => {
        const alias = definition.aliases?.[role];
        return alias ? [[key, alias]] : [];
      }),
    ),
  ]),
) as Record<EnvironmentRole, Readonly<Record<string, string>>>;

export const platformOwnedEnvironmentKeys = new Set([
  "PATH",
  "HOME",
  "TMPDIR",
  "LANG",
  "CI",
  "BASH_SOURCE",
  "EVCS_ENVIRONMENT_PROFILE",
  "EVCS_MIGRATION_SCOPE",
  "EVCS_GIT_SHA",
  ...Object.keys(deploymentVariables),
  "AUTH_TEST_MYSQL_URL",
  "PLATFORM_TEST_MYSQL_URL",
  "SITE_SELECTION_V2_TEST_MYSQL_URL",
  "SITE_SELECTION_V2_WORKER_TEST_MYSQL_URL",
  "VITE_CACHE_DIR",
]);

/**
 * 应用配置命名空间。容器可以携带 PATH、HOME 等操作系统变量，但这些前缀下的
 * 变量必须由中央 schema 明确授权给当前角色。
 */
export const applicationEnvironmentPrefixes = [
  "AGENTOS_",
  "AUTH_",
  "EVCS_",
  "PLATFORM_",
  "PUBLIC_",
  "SITE_SELECTION_",
] as const;

const runtimePlatformEnvironmentKeys = new Set(["EVCS_ENVIRONMENT_PROFILE"]);

const outputKeysByRole = Object.fromEntries(
  environmentRoles.map((role) => [
    role,
    new Set(keysByRole[role].map((key) => aliasesByRole[role][key] ?? key)),
  ]),
) as Readonly<Record<EnvironmentRole, ReadonlySet<string>>>;

export function environmentOutputKeysForRole(role: EnvironmentRole): ReadonlySet<string> {
  return outputKeysByRole[role];
}

export function isUnauthorizedApplicationEnvironmentKey(
  role: EnvironmentRole,
  key: string,
): boolean {
  if (key === "NODE_ENV") return !environmentOutputKeysForRole(role).has(key);
  if (!applicationEnvironmentPrefixes.some((prefix) => key.startsWith(prefix))) return false;
  if (runtimePlatformEnvironmentKeys.has(key)) return false;
  return !environmentOutputKeysForRole(role).has(key);
}

export function environmentValueForRole(
  definition: EnvironmentVariableDefinition,
  profile: EnvironmentProfile,
  role: EnvironmentRole,
): EnvironmentValue {
  const value = definition.environments[profile];
  return value.source === "external-required" && definition.optionalRoles?.includes(role)
    ? { source: "external-optional" }
    : value;
}
