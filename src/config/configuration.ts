import { appName, appSlug } from "@common/constants";
import { DateUtil } from "@common/utils";

import { env, envBool, envInt, envList, envName, mapEmailAccounts } from "./env.helper";
import type {
    ApiConfig,
    AppConfig,
    AuthConfig,
    CacheConfig,
    CommunicationConfig,
    DatabaseConfig,
    LoggerConfig,
    NotificationConfig,
    QueueConfig,
    RedisConfig,
    SecurityConfig,
    StorageConfig,
} from "./namespaces";

export interface Configuration {
    app: AppConfig;
    api: ApiConfig;
    security: SecurityConfig;
    database: DatabaseConfig;
    redis: RedisConfig;
    logger: LoggerConfig;
    cache: CacheConfig;
    queue: QueueConfig;
    communication: CommunicationConfig;
    storage: StorageConfig;
    auth: AuthConfig;
    notification: NotificationConfig;
}
// eslint-disable-next-line max-lines-per-function
export default (): Configuration => ({
    app: {
        environment: env("NODE_ENV") as AppConfig["environment"],
        port: envInt("APP_PORT"),
        url: env("APP_URL"),
        webUrl: env("APP_WEB_URL"),
        name: appName(),
        description: `${appName()} Backend API`,
        version: "1.0.0",
    },

    api: {
        prefix: "api",
        version: "1",
        swagger: {
            enabled: envBool("SWAGGER_ENABLED"),
            title: `${appName()} API - ${envName()}`,
            description: `Swagger API documentation for the ${appName()} backend`,
            version: "1.0",
            path: "docs",
            auth: {
                enabled: envBool("SWAGGER_AUTH_ENABLED"),
                username: env("SWAGGER_USERNAME"),
                password: env("SWAGGER_PASSWORD"),
            },
            servers: [
                {
                    url: `http://localhost:${envInt("APP_PORT")}`,
                    description: "Development Server",
                },
            ],
        },
    },

    security: {
        cors: {
            enabled: envBool("CORS_ENABLED"),
            origins: envList("CORS_ORIGINS"),
        },
        throttler: {
            ttl: envInt("THROTTLE_TTL"),
            limit: envInt("THROTTLE_LIMIT"),
        },

        request: {
            bodyLimit: "1mb",
        },
    },

    database: {
        url: env("DATABASE_URL"),
    },

    redis: {
        host: env("REDIS_HOST"),
        port: envInt("REDIS_PORT"),
        password: env("REDIS_PASSWORD"),
    },

    logger: {
        level: env("LOG_LEVEL") as LoggerConfig["level"],
        httpLogging: envBool("LOG_HTTP_ENABLED"),
        slowRequestThreshold: envInt("LOG_SLOW_REQUEST_THRESHOLD"),
    },

    cache: {
        redis: {
            host: env("CACHE_REDIS_HOST"),
            port: envInt("CACHE_REDIS_PORT"),
            password: env("CACHE_REDIS_PASSWORD"),
            db: 0,
        },
        keyPrefix: appSlug(),
        ttl: 300,
    },

    queue: {
        redis: {
            host: env("QUEUE_REDIS_HOST"),
            port: envInt("QUEUE_REDIS_PORT"),
            password: env("QUEUE_REDIS_PASSWORD"),
            db: 1,
        },

        job: {
            attempts: 3,
            backoff: { type: "exponential" as const, delay: 2500 },
            removeOnComplete: 50,
            removeOnFail: 50,
        },

        bullBoard: {
            enabled: envBool("BULL_BOARD_ENABLED"),
            path: "queues",
            authEnabled: envBool("BULL_BOARD_AUTH_ENABLED"),
            username: env("BULL_BOARD_USERNAME"),
            password: env("BULL_BOARD_PASSWORD"),
        },
    },

    communication: {
        devMode: envBool("COMMUNICATION_DEV_MODE"),

        mailer: {
            accounts: mapEmailAccounts(
                envList("SMTP_HOST"),
                envList("SMTP_PORT"),
                envList("SMTP_USER"),
                envList("SMTP_PASSWORD"),
                envList("SMTP_SECURE"),
                envList("SMTP_FROM_ADDRESS"),
                envList("SMTP_FROM_NAME"),
            ),
        },

        whatsapp: {
            enabled: envBool("WHATSAPP_ENABLED"),
            apiUrl: "https://graph.facebook.com/v22.0",
            accessToken: env("WHATSAPP_ACCESS_TOKEN"),
            phoneNumberId: env("WHATSAPP_PHONE_NUMBER_ID"),
        },

        fcm: {
            enabled: envBool("FCM_ENABLED"),
            projectId: env("FCM_PROJECT_ID"),
            privateKey: env("FCM_PRIVATE_KEY").replace(/\\n/g, "\n"),
            clientEmail: env("FCM_CLIENT_EMAIL"),
        },
    },

    storage: {
        provider: env("STORAGE_PROVIDER") as StorageConfig["provider"],

        baseUrl: env("STORAGE_BASE_URL"),

        maxFileSizeBytes: 10485760,

        local: {
            basePath: "./uploads",
        },
    },

    auth: {
        jwt: {
            privateKey: env("JWT_PRIVATE_KEY").replace(/\\n/g, "\n"),
            publicKey: env("JWT_PUBLIC_KEY").replace(/\\n/g, "\n"),
            accessTokenExpirySeconds: DateUtil.durationToSeconds(env("JWT_ACCESS_TOKEN_EXPIRY")),
            refreshTokenExpirySeconds: DateUtil.durationToSeconds(env("JWT_REFRESH_TOKEN_EXPIRY")),
            issuer: appSlug(),
            audience: `${appSlug()}-clients`,
        },

        otp: {
            length: 6,
            expirySeconds: envInt("OTP_EXPIRY_SECONDS"),
            maxRequestsPerWindow: envInt("OTP_MAX_REQUESTS_PER_WINDOW"),
            rateLimitWindowSeconds: envInt("OTP_LIMIT_WINDOW_SECONDS"),
            maxFailedAttempts: envInt("OTP_MAX_FAILED_ATTEMPTS"),
            lockoutSeconds: envInt("OTP_LOCKOUT_DURATION"),
        },

        signup: {
            pendingTtlSeconds: 1800,
        },

        login: {
            failuresBeforeLockout: envInt("LOGIN_MAX_ATTEMPTS"),
            baseLockoutSeconds: 900,
            maxLockoutSeconds: 86400,
        },

        transactionalToken: {
            expirySeconds: envInt("TRANSACTIONAL_TOKEN_EXPIRY_SECONDS"),
        },

        session: {
            maxPerUser: 10,
        },

        reAuth: {
            windowSeconds: 900,
        },

        accountDeletion: {
            gracePeriodDays: envInt("ACCOUNT_DELETION_GRACE_PERIOD_DAYS"),
        },
    },

    notification: {
        retentionDays: 180,
        deviceToken: {
            cleanupAfterDays: 90,
        },
        broadcast: {
            batchSize: 500,
            maxAudienceSize: 20000,
            newUserWindowDays: 30,
        },
    },
});
