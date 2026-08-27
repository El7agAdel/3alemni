/**
 * Icon groups for each notification type. Clients display icons based on these values.
 */
export const NotificationIcon = {
    SYSTEM: "SYSTEM",
    ACCOUNT: "ACCOUNT",
    SECURITY: "SECURITY",
} as const;

export type NotificationIcon = (typeof NotificationIcon)[keyof typeof NotificationIcon];
