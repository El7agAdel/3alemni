/**
 * Emitted when a role is created.
 */
export class RoleCreatedEvent {
    static readonly eventName = "rbac.role.created" as const;

    constructor(
        public readonly roleId: string,
        public readonly roleName: string,
        public readonly createdBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when a role is updated.
 */
export class RoleUpdatedEvent {
    static readonly eventName = "rbac.role.updated" as const;

    constructor(
        public readonly roleId: string,
        public readonly changes: Record<string, unknown>,
        public readonly updatedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when a role is deleted.
 */
export class RoleDeletedEvent {
    static readonly eventName = "rbac.role.deleted" as const;

    constructor(
        public readonly roleId: string,
        public readonly roleName: string,
        public readonly deletedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when role permissions are updated.
 */
export class RolePermissionsChangedEvent {
    static readonly eventName = "rbac.role.permissions.changed" as const;

    constructor(
        public readonly roleId: string,
        public readonly addedKeys: string[],
        public readonly removedKeys: string[],
        public readonly changedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when a role is assigned to a user.
 */
export class UserRoleAssignedEvent {
    static readonly eventName = "rbac.user.role.assigned" as const;

    constructor(
        public readonly userId: string,
        public readonly roleId: string,
        public readonly roleName: string,
        public readonly assignedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}

/**
 * Emitted when a role is removed from a user.
 */
export class UserRoleRemovedEvent {
    static readonly eventName = "rbac.user.role.removed" as const;

    constructor(
        public readonly userId: string,
        public readonly roleId: string,
        public readonly roleName: string,
        public readonly removedBy: string,
        public readonly timestamp: Date = new Date(),
    ) {}
}
