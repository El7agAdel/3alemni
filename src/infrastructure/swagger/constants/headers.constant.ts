/**
 * Common headers included in all API responses.
 */
const COMMON_RESPONSE_HEADERS = {
    "X-Request-Id": {
        description: "Unique request identifier for tracing",
        schema: { type: "string", example: "req-m1abc123" },
    },
};

/**
 * Rate limit headers included in all API responses.
 */
const RATE_LIMIT_HEADERS = {
    "X-RateLimit-Limit": {
        description: "Maximum requests allowed per time window",
        schema: { type: "integer", example: 100 },
    },
    "X-RateLimit-Remaining": {
        description: "Remaining requests in current time window",
        schema: { type: "integer", example: 99 },
    },
    "X-RateLimit-Reset": {
        description: "Seconds until the rate limit resets",
        schema: { type: "integer", example: 60 },
    },
};

export const RESPONSE_HEADERS = {
    ...COMMON_RESPONSE_HEADERS,
    ...RATE_LIMIT_HEADERS,
};
