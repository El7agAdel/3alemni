import { Permission } from "../interfaces";

/**
 * Permission definitions.
 * Main source of truth for all permissions. Used by seeds and decorators.
 */
export const Permissions = {
    AuditLog: {
        READ: {
            key: "audit-log:read",
            resource: "audit-log",
            action: "read",
            displayName: "View Audit Logs",
            description: "View system audit logs and activity history",
            group: "System",
        },
    },

    User: {
        READ: {
            key: "user:read",
            resource: "user",
            action: "read",
            displayName: "View Users",
            description: "View user list and details",
            group: "User Management",
        },
        CREATE: {
            key: "user:create",
            resource: "user",
            action: "create",
            displayName: "Create Users",
            description: "Create user accounts",
            group: "User Management",
        },
        UPDATE: {
            key: "user:update",
            resource: "user",
            action: "update",
            displayName: "Edit Users",
            description: "Edit user profiles",
            group: "User Management",
        },
        DELETE: {
            key: "user:delete",
            resource: "user",
            action: "delete",
            displayName: "Delete Users",
            description: "Permanently delete user accounts",
            group: "User Management",
        },
        SUSPEND: {
            key: "user:suspend",
            resource: "user",
            action: "suspend",
            displayName: "Suspend Users",
            description: "Suspend and unsuspend user accounts",
            group: "User Management",
        },
    },

    Role: {
        READ: {
            key: "role:read",
            resource: "role",
            action: "read",
            displayName: "View Roles",
            description: "View roles and their permissions",
            group: "Role Management",
        },
        CREATE: {
            key: "role:create",
            resource: "role",
            action: "create",
            displayName: "Create Roles",
            description: "Create new roles",
            group: "Role Management",
        },
        UPDATE: {
            key: "role:update",
            resource: "role",
            action: "update",
            displayName: "Edit Roles",
            description: "Edit roles",
            group: "Role Management",
        },
        DELETE: {
            key: "role:delete",
            resource: "role",
            action: "delete",
            displayName: "Delete Roles",
            description: "Delete roles",
            group: "Role Management",
        },
        ASSIGN: {
            key: "role:assign",
            resource: "role",
            action: "assign",
            displayName: "Assign Roles",
            description: "Assign and remove roles to and from users",
            group: "Role Management",
        },
    },

    Upload: {
        READ: {
            key: "upload:read",
            resource: "upload",
            action: "read",
            displayName: "View Uploads",
            description: "View uploaded files list and details",
            group: "Upload Management",
        },
        DELETE: {
            key: "upload:delete",
            resource: "upload",
            action: "delete",
            displayName: "Delete Uploads",
            description: "Delete uploaded files",
            group: "Upload Management",
        },
    },

    Broadcast: {
        READ: {
            key: "broadcast:read",
            resource: "broadcast",
            action: "read",
            displayName: "View Broadcasts",
            description: "View broadcast list and details",
            group: "Notification Management",
        },
        CREATE: {
            key: "broadcast:create",
            resource: "broadcast",
            action: "create",
            displayName: "Send Broadcasts",
            description: "Compose and send broadcast notifications to users",
            group: "Notification Management",
        },
    },
};

export const AllPermissions: Permission[] = Object.values(Permissions).flatMap((group) => Object.values(group));

export type PermissionKey = (typeof AllPermissions)[number]["key"];
