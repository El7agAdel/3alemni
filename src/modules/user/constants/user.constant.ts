import { IncludableRelations, SortableFields } from "@common/interfaces";
import { CacheKey } from "@infra/cache";

export const UserCacheKeys = {
    USERS_LIST: "users:list",

    USERS_LIST_QUERY: (query?: Record<string, unknown>) => CacheKey.withQuery("users:list", query ?? {}),

    PENDING_EMAIL_CHANGE: (userId: string) => `user:pending:email:${userId}`,

    PENDING_PHONE_CHANGE: (userId: string) => `user:pending:phone:${userId}`,

    USERS_LIST_PATTERN: "users:list*",
} as const;

export const UserQuery = {
    sort: {
        allowed: {
            username: "username",
            email: "email",
            createdAt: "createdAt",
            updatedAt: "updatedAt",
            status: "status",
        },
        defaultField: "createdAt",
        defaultOrder: "desc",
    } as SortableFields,

    search: ["username", "email", "phone", "firstName", "lastName", "displayName"],

    include: {
        roles: {
            userRoles: {
                include: { role: true },
                orderBy: { assignedAt: "asc" as const },
            },
        },
    } as IncludableRelations,
};
