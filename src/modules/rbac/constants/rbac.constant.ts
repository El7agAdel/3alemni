import { IncludableRelations, SortableFields } from "@common/interfaces";
import { CacheKey } from "@infra/cache";

/**
 * Role every new user gets at signup. Must match a seeded role name.
 */
export const DEFAULT_SIGNUP_ROLE = "Student";

export const RbacCacheKeys = {
    PERMISSIONS_LIST: "rbac:permissions:list",

    ROLES_LIST: "rbac:roles:list",

    ROLES_LIST_QUERY: (query?: Record<string, unknown>) => CacheKey.withQuery("rbac:roles:list", query ?? {}),

    ROLE_PERMISSIONS: (roleId: string) => `rbac:roles:${roleId}:permissions`,

    USER_PERMISSIONS: (userId: string) => `rbac:users:${userId}:permissions`,
    USER_ROLES: (userId: string) => `rbac:users:${userId}:roles`,

    ROLES_LIST_PATTERN: "rbac:roles:list*",
} as const;

export const RoleQuery = {
    sort: {
        allowed: { name: "name", createdAt: "createdAt", updatedAt: "updatedAt" },
        defaultField: "name",
        defaultOrder: "asc",
    } as SortableFields,

    search: ["name"],

    include: {
        permissions: {
            rolePermissions: {
                include: { permission: true },
            },
        },
    } as IncludableRelations,
};
