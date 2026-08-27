/**
 * Cache TTL presets in seconds.
 */
export const CacheTTL = {
    /**
     * 5 minutes.
     */
    VERY_SHORT: 300,

    /**
     * 15 minutes.
     */
    SHORT: 900,

    /**
     * 30 minutes.
     */
    MEDIUM: 1800,

    /**
     * 1 hour.
     */
    LONG: 3600,

    /**
     * 24 hours.
     */
    VERY_LONG: 86400,
} as const;

export type CacheTTLType = (typeof CacheTTL)[keyof typeof CacheTTL];
