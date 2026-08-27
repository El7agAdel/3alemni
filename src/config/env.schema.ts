import Joi from "joi";

import { slugify } from "@common/constants";

export const envSchema = Joi.object({
    // Application
    //
    // APP_NAME is the one place the product is named. Everything else that needs
    // the name - Swagger, emails, notifications, cache prefixes, the JWT issuer -
    // derives it from here. APP_SLUG defaults to a slugified APP_NAME and only
    // needs setting when the two must differ (an existing cache prefix, say).
    // .empty("") so a variable left blank in .env falls back to the default
    // instead of failing validation.
    APP_NAME: Joi.string().max(60).empty("").default("App"),
    APP_SLUG: Joi.string()
        .pattern(/^[a-z0-9]+(-[a-z0-9]+)*$/)
        .empty("")
        .default((parent: { APP_NAME?: string }) => slugify(parent.APP_NAME ?? "App") || "app")
        .messages({
            "string.pattern.base": "APP_SLUG must be lowercase alphanumeric words separated by single dashes",
        }),
    NODE_ENV: Joi.string().valid("development", "test", "staging", "production").required(),
    APP_PORT: Joi.number().port().required(),
    APP_URL: Joi.string().default("http://localhost"),
    APP_WEB_URL: Joi.string().required(),

    // API - Swagger
    SWAGGER_ENABLED: Joi.boolean().default(true),
    SWAGGER_AUTH_ENABLED: Joi.boolean().default(true),
    SWAGGER_USERNAME: Joi.string().when("SWAGGER_AUTH_ENABLED", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.string().allow("").optional(),
    }),
    SWAGGER_PASSWORD: Joi.string().when("SWAGGER_AUTH_ENABLED", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.string().allow("").optional(),
    }),

    // Security - CORS
    CORS_ENABLED: Joi.boolean().default(true),
    CORS_ORIGINS: Joi.string().default("*"),

    // Security - Throttler
    THROTTLE_TTL: Joi.number().min(1).default(60),
    THROTTLE_LIMIT: Joi.number().min(1).default(100),

    // Security - Request
    REQUEST_BODY_LIMIT: Joi.string().default("1mb"),
    REQUEST_TIMEOUT: Joi.number().min(1000).default(30000),

    // Database
    DATABASE_HOST: Joi.string().required(),
    DATABASE_PORT: Joi.number().required(),
    DATABASE_USERNAME: Joi.string().required(),
    DATABASE_PASSWORD: Joi.string().required(),
    DATABASE_NAME: Joi.string().required(),
    DATABASE_URL: Joi.string().required(),

    // Redis
    REDIS_HOST: Joi.string().required(),
    REDIS_PORT: Joi.number().port().required(),
    REDIS_PASSWORD: Joi.string().allow("").optional(),

    // Logger
    LOG_LEVEL: Joi.string().valid("trace", "debug", "info", "warn", "error", "fatal").default("info"),
    LOG_HTTP_ENABLED: Joi.boolean().default(true),
    LOG_SLOW_REQUEST_THRESHOLD: Joi.number().min(0).default(0),

    // Cache
    CACHE_REDIS_HOST: Joi.string().default("localhost"),
    CACHE_REDIS_PORT: Joi.number().default(6379),
    CACHE_REDIS_PASSWORD: Joi.string().allow("").optional(),

    // Queue
    QUEUE_REDIS_HOST: Joi.string().required(),
    QUEUE_REDIS_PORT: Joi.number().port().required(),
    QUEUE_REDIS_PASSWORD: Joi.string().allow("").optional(),

    // Queue - Bull Board
    BULL_BOARD_ENABLED: Joi.boolean().default(true),
    BULL_BOARD_AUTH_ENABLED: Joi.boolean().default(true),
    BULL_BOARD_USERNAME: Joi.string().when("BULL_BOARD_AUTH_ENABLED", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.string().allow("").optional(),
    }),
    BULL_BOARD_PASSWORD: Joi.string().when("BULL_BOARD_AUTH_ENABLED", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.string().allow("").optional(),
    }),

    // Communication
    COMMUNICATION_DEV_MODE: Joi.boolean().default(false),

    // Communication - Mailer (always required; email is the primary channel)
    SMTP_HOST: Joi.string().required(),
    SMTP_PORT: Joi.number().default(587),
    SMTP_SECURE: Joi.boolean().default(false),
    SMTP_USER: Joi.string().required(),
    SMTP_PASSWORD: Joi.string().required(),
    SMTP_FROM_ADDRESS: Joi.string().required(),
    SMTP_FROM_NAME: Joi.string()
        .empty("")
        .default((parent: { APP_NAME?: string }) => parent.APP_NAME ?? "App"),

    // Communication - WhatsApp (optional provider)
    WHATSAPP_ENABLED: Joi.boolean().default(false),
    WHATSAPP_PHONE_NUMBER_ID: Joi.string().when("WHATSAPP_ENABLED", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.string().allow("").optional(),
    }),
    WHATSAPP_ACCESS_TOKEN: Joi.string().when("WHATSAPP_ENABLED", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.string().allow("").optional(),
    }),

    // Communication - FCM (optional provider)
    FCM_ENABLED: Joi.boolean().default(false),
    FCM_PROJECT_ID: Joi.string().when("FCM_ENABLED", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.string().allow("").optional(),
    }),
    FCM_PRIVATE_KEY: Joi.string().when("FCM_ENABLED", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.string().allow("").optional(),
    }),
    FCM_CLIENT_EMAIL: Joi.string().when("FCM_ENABLED", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.string().allow("").optional(),
    }),

    // Storage (local is the only provider shipped with the boilerplate)
    STORAGE_PROVIDER: Joi.string().valid("local").default("local"),
    STORAGE_BASE_URL: Joi.string().required(),

    // Auth - JWT
    JWT_PRIVATE_KEY: Joi.string().required(),
    JWT_PUBLIC_KEY: Joi.string().required(),
    JWT_ACCESS_TOKEN_EXPIRY: Joi.string().default("15m"),
    JWT_REFRESH_TOKEN_EXPIRY: Joi.string().default("7d"),

    // Auth - OTP
    OTP_EXPIRY_SECONDS: Joi.number().default(600),
    OTP_MAX_REQUESTS_PER_WINDOW: Joi.number().default(5),
    OTP_LIMIT_WINDOW_SECONDS: Joi.number().default(900),
    OTP_MAX_FAILED_ATTEMPTS: Joi.number().default(5),
    OTP_LOCKOUT_DURATION: Joi.number().default(900),

    // Auth - Login
    LOGIN_MAX_ATTEMPTS: Joi.number().default(5),

    // Auth - Transactional Token
    TRANSACTIONAL_TOKEN_EXPIRY_SECONDS: Joi.number().default(600),

    // Auth - Account deletion
    ACCOUNT_DELETION_GRACE_PERIOD_DAYS: Joi.number().default(30),

    // Bootstrap admin (safe, idempotent seed input - optional)
    BOOTSTRAP_ADMIN_EMAIL: Joi.string().email().allow("").optional(),
    BOOTSTRAP_ADMIN_USERNAME: Joi.string().allow("").optional(),
    BOOTSTRAP_ADMIN_PHONE: Joi.string().allow("").optional(),
    BOOTSTRAP_ADMIN_PASSWORD: Joi.string().allow("").optional(),
});
