/**
 * Every auditable action across the app. Keep this list to concise,
 * security-relevant facts only - this is not a general application log.
 */
export const AuditActions = {
    // Admin user actions
    ADMIN_USER_CREATED: { resource: "user", action: "admin_created" },
    ADMIN_USER_UPDATED: { resource: "user", action: "admin_updated" },
    ADMIN_EMAIL_CHANGED: { resource: "user", action: "admin_email_changed" },
    ADMIN_PHONE_CHANGED: { resource: "user", action: "admin_phone_changed" },
    ADMIN_USER_SUSPENDED: { resource: "user", action: "admin_suspended" },
    ADMIN_USER_UNSUSPENDED: { resource: "user", action: "admin_unsuspended" },
    ADMIN_USER_DELETED: { resource: "user", action: "admin_deleted" },
    ADMIN_FORCE_LOGOUT: { resource: "user", action: "admin_force_logout" },

    // User self-service actions
    SELF_DELETION_REQUESTED: {
        resource: "user",
        action: "self_deletion_requested",
    },
    ACCOUNT_RESTORED: { resource: "user", action: "account_restored" },
    PASSWORD_RESET_COMPLETED: {
        resource: "user",
        action: "password_reset_completed",
    },
    TWO_FACTOR_ENABLED: { resource: "user", action: "two_factor_enabled" },
    TWO_FACTOR_DISABLED: { resource: "user", action: "two_factor_disabled" },
    LOGIN_LOCKED: { resource: "user", action: "login_locked" },

    // Role actions
    ROLE_CREATED: { resource: "role", action: "created" },
    ROLE_UPDATED: { resource: "role", action: "updated" },
    ROLE_DELETED: { resource: "role", action: "deleted" },
    ROLE_PERMISSIONS_CHANGED: { resource: "role", action: "permissions_changed" },

    // User role actions
    USER_ROLE_ASSIGNED: { resource: "user", action: "role_assigned" },
    USER_ROLE_REMOVED: { resource: "user", action: "role_removed" },

    // Upload actions
    UPLOAD_DELETED: { resource: "upload", action: "admin_deleted" },

    // Broadcast actions
    BROADCAST_SENT: { resource: "broadcast", action: "sent" },
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

const allActions = Object.values(AuditActions);

export const AuditResources = [...new Set(allActions.map((a) => a.resource))].sort();

export const AuditActionNames = [...new Set(allActions.map((a) => a.action))].sort();

/**
 * Maps each resource to all of its actions, used to populate filter dropdowns.
 */
export const AuditResourceActions: Record<string, string[]> = allActions.reduce(
    (acc, { resource, action }) => {
        if (!acc[resource]) acc[resource] = [];
        if (!acc[resource].includes(action)) acc[resource].push(action);
        return acc;
    },
    {} as Record<string, string[]>,
);
