export enum TransactionalTokenType {
    REGISTER_OTP_PENDING = "REGISTER_OTP_PENDING",

    REGISTER_COMPLETE = "REGISTER_COMPLETE",

    TWO_FACTOR_LOGIN = "TWO_FACTOR_LOGIN",

    PASSWORD_RESET_OTP_PENDING = "PASSWORD_RESET_OTP_PENDING",

    PASSWORD_RESET_COMPLETE = "PASSWORD_RESET_COMPLETE",
}

export const AuthCacheKeys = {
    BLACKLIST: (sessionId: string) => `auth:blacklist:${sessionId}`,

    TRANSACTIONAL: (token: string) => `auth:txn:${token}`,

    LOGIN_ATTEMPTS: (identifier: string) => `auth:login:attempts:${identifier}`,

    LOGIN_LOCKOUT: (identifier: string) => `auth:login:lockout:${identifier}`,

    LOGIN_LOCKOUT_COUNT: (identifier: string) => `auth:login:lockout:count:${identifier}`,

    REGISTER_PENDING: (identifier: string) => `auth:register:pending:${identifier}`,
} as const;

export const ReAuthCacheKeys = {
    WINDOW: (userId: string) => `reauth:window:${userId}`,

    PASSWORD_ATTEMPTS: (userId: string) => `reauth:password:attempts:${userId}`,

    PASSWORD_LOCKOUT: (userId: string) => `reauth:password:lockout:${userId}`,
} as const;

export const ReAuthMethod = {
    PASSWORD: "PASSWORD",
    OTP: "OTP",
} as const;

export type ReAuthMethod = (typeof ReAuthMethod)[keyof typeof ReAuthMethod];
