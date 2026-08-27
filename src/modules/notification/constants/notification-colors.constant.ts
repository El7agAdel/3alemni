/**
 * Severity colors for notification types. Clients map each value to a color.
 */
export const NotificationColor = {
    DEFAULT: "DEFAULT",
    INFO: "INFO",
    SUCCESS: "SUCCESS",
    WARNING: "WARNING",
    DANGER: "DANGER",
} as const;

export type NotificationColor = (typeof NotificationColor)[keyof typeof NotificationColor];
