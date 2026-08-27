/**
 * All available broadcast audiences.
 * Saved on the broadcast record and used to display available audiences to the client.
 */
export const BroadcastAudience = {
    ME: "ME",
    ALL_USERS: "ALL_USERS",
    NEW_USERS: "NEW_USERS",
    NEWSLETTER_SUBSCRIBERS: "NEWSLETTER_SUBSCRIBERS",
    USER_IDS: "USER_IDS",
    ROLES: "ROLES",
} as const;

export type BroadcastAudience = (typeof BroadcastAudience)[keyof typeof BroadcastAudience];

/**
 * Explicit-recipient audience parameters.
 */
export type UserIdsAudienceParams = {
    userIds?: string[];
};

/**
 * Role-based audience parameters.
 */
export type RolesAudienceParams = {
    roleIds?: string[];
};

/**
 * Union of every audience's param shape.
 * The resolver accepts this widened type and each audience case narrows to its own shape.
 */
export type AudienceParams = UserIdsAudienceParams & RolesAudienceParams;

/**
 * Audiences that require params. Any audience NOT in this set must be sent without params.
 */
export const PARAMETERIZED_AUDIENCES = new Set<BroadcastAudience>([
    BroadcastAudience.USER_IDS,
    BroadcastAudience.ROLES,
]);
