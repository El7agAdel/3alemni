/**
 * Emitted when an admin creates a user account.
 */
export class AdminUserCreatedEvent {
    static readonly eventName = "admin.user.created" as const;

    constructor(
        public readonly userId: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when an admin updates a user's profile fields.
 */
export class AdminUserUpdatedEvent {
    static readonly eventName = "admin.user.updated" as const;

    constructor(
        public readonly userId: string,
        public readonly changes: Record<string, unknown>,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when an admin overrides a user's email.
 */
export class AdminEmailChangedEvent {
    static readonly eventName = "admin.user.email_changed" as const;

    constructor(
        public readonly userId: string,
        public readonly oldEmail: string,
        public readonly newEmail: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when an admin overrides a user's phone.
 */
export class AdminPhoneChangedEvent {
    static readonly eventName = "admin.user.phone_changed" as const;

    constructor(
        public readonly userId: string,
        public readonly oldPhone: string,
        public readonly newPhone: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when an admin suspends a user.
 */
export class UserSuspendedByAdminEvent {
    static readonly eventName = "admin.user.suspended" as const;

    constructor(
        public readonly userId: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when an admin unsuspends a user.
 */
export class UserUnsuspendedByAdminEvent {
    static readonly eventName = "admin.user.unsuspended" as const;

    constructor(
        public readonly userId: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when an admin force logs out a user.
 */
export class UserForceLogoutEvent {
    static readonly eventName = "admin.user.force_logout" as const;

    constructor(
        public readonly userId: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when an admin immediately deletes a user.
 */
export class AdminUserDeletedEvent {
    static readonly eventName = "admin.user.deleted" as const;

    constructor(
        public readonly userId: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}
