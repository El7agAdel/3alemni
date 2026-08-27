import { OtpChannel } from "@generated/client";

/**
 * Emitted when a user completes signup after the account is created and verified.
 */
export class RegisterCompletedEvent {
    static readonly eventName = "auth.signup.completed" as const;

    constructor(
        public readonly userId: string,
        public readonly username: string | null,
        public readonly email: string | null,
        public readonly phone: string | null,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted on successful login.
 */
export class LoginSucceededEvent {
    static readonly eventName = "auth.login.succeeded" as const;

    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        public readonly ipAddress: string | null,
        public readonly deviceType: string | null,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted on any failed login attempts.
 */
export class LoginFailedEvent {
    static readonly eventName = "auth.login.failed" as const;

    constructor(
        public readonly identifier: string,
        public readonly ipAddress: string | null,
        public readonly reason: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted on successful password reset, including completing the verification process.
 */
export class PasswordResetCompletedEvent {
    static readonly eventName = "auth.password.reset" as const;

    constructor(
        public readonly userId: string,
        public readonly revokedSessionCount: number,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when the user enables two-factor authentication.
 */
export class TwoFactorEnabledEvent {
    static readonly eventName = "auth.2fa.enabled" as const;

    constructor(
        public readonly userId: string,
        public readonly channel: OtpChannel,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when the user disables two-factor authentication.
 */
export class TwoFactorDisabledEvent {
    static readonly eventName = "auth.2fa.disabled" as const;

    constructor(
        public readonly userId: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when login failures hit the lockout threshold - a potential brute force attempt.
 */
export class SuspiciousLoginActivityEvent {
    static readonly eventName = "auth.login.suspicious" as const;

    constructor(
        public readonly identifier: string,
        public readonly ipAddress: string | null,
        public readonly failedAttempts: number,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when a session is revoked, whether by the user logging out or the system revoking it.
 */
export class SessionRevokedEvent {
    static readonly eventName = "auth.session.revoked" as const;

    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        public readonly revokedBy: "user" | "system" | "password_reset",
        public readonly timestamp: Date = new Date(),
    ) {}
}
