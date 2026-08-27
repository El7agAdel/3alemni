/**
 * Emitted when a user verifies their existing email.
 */
export class EmailVerifiedEvent {
    static readonly eventName = "user.email.verified" as const;

    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when a user verifies their existing phone.
 */
export class PhoneVerifiedEvent {
    static readonly eventName = "user.phone.verified" as const;

    constructor(
        public readonly userId: string,
        public readonly phone: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when the user changes their password.
 */
export class PasswordChangedEvent {
    static readonly eventName = "user.password.changed" as const;

    constructor(
        public readonly userId: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when a user changes their email.
 */
export class EmailChangedEvent {
    static readonly eventName = "user.email.changed" as const;

    constructor(
        public readonly userId: string,
        public readonly oldEmail: string,
        public readonly newEmail: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when a user changes their phone.
 */
export class PhoneChangedEvent {
    static readonly eventName = "user.phone.changed" as const;

    constructor(
        public readonly userId: string,
        public readonly oldPhone: string,
        public readonly newPhone: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when the user requests account deletion.
 */
export class UserDeletionRequestedEvent {
    static readonly eventName = "user.deletion.requested" as const;

    constructor(
        public readonly userId: string,
        public readonly scheduledDeletionAt: Date,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when a user logs in and their pending-deletion account is restored.
 */
export class AccountRestoredEvent {
    static readonly eventName = "user.account.restored" as const;

    constructor(
        public readonly userId: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}
