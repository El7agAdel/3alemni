/**
 * Internal routing keys. Represents one notification type; grows with every new notification source.
 * Stored on every notification record. Add a type only when an implemented flow emits it.
 */
export const NotificationType = {
    BROADCAST: "BROADCAST",
    WELCOME: "WELCOME",
    SECURITY_ALERT: "SECURITY_ALERT",
    ACCOUNT_UPDATED: "ACCOUNT_UPDATED",
    PASSWORD_CHANGED: "PASSWORD_CHANGED",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
