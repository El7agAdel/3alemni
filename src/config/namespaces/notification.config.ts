export interface NotificationConfig {
    /**
     * Hard delete notifications older than this many days.
     */
    retentionDays: number;

    deviceToken: {
        /**
         * Delete device tokens whose `lastSeenAt` is older than this many days.
         */
        cleanupAfterDays: number;
    };

    broadcast: {
        /**
         * How many recipients each delivery job handles in one batch.
         */
        batchSize: number;

        /**
         * Hard ceiling on broadcast recipients. Refuses sends above this.
         */
        maxAudienceSize: number;

        /**
         * "Created in the last N days" window used by the NEW_USERS broadcast audience.
         */
        newUserWindowDays: number;
    };
}
