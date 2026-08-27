/**
 * Listing of all jobs that share processing logic.
 */
export const JOB_NAMES = {
    EMAIL: {
        SEND_EMAIL: "send-email",
    },

    WHATSAPP: {
        SEND_TEMPLATE: "send-whatsapp-template",
    },

    PUSH: {
        SEND_PUSH: "send-push",
    },

    BROADCAST: {
        DISPATCH: "dispatch-broadcast",
    },

    TASKS: {
        CLEANUP_EXPIRED_OTPS: "cleanup:expired-otps",
        CLEANUP_OLD_OTPS: "cleanup:old-otps",
        CLEANUP_EXPIRED_SESSIONS: "cleanup:expired-sessions",
        CLEANUP_EXPIRED_DELETION_REQUESTS: "cleanup:expired-deletion-requests",
        CLEANUP_ORPHANED_UPLOADS: "cleanup:orphaned-uploads",
        CLEANUP_STALE_DEVICE_TOKENS: "cleanup:stale-device-tokens",
        CLEANUP_OLD_NOTIFICATIONS: "cleanup:old-notifications",
    },
} as const;
