export interface AuthConfig {
    jwt: {
        /**
         * PEM-encoded private key.
         */
        privateKey: string;

        /**
         * PEM-encoded public key.
         */
        publicKey: string;

        /**
         * Access token lifetime in seconds.
         */
        accessTokenExpirySeconds: number;

        /**
         * Refresh token lifetime in seconds.
         */
        refreshTokenExpirySeconds: number;

        /**
         * JWT issuer claim.
         */
        issuer: string;

        /**
         * JWT audience claim.
         */
        audience: string;
    };

    otp: {
        /**
         * Number of digits in OTP code.
         */
        length: number;

        /**
         * How long the OTP stays valid in seconds.
         */
        expirySeconds: number;

        /**
         * Rate limit for OTP requests within the request window.
         */
        maxRequestsPerWindow: number;

        /**
         * OTP rate limit request window in seconds.
         */
        rateLimitWindowSeconds: number;

        /**
         * How many invalid attempts before a block.
         */
        maxFailedAttempts: number;

        /**
         * Lockout duration after failing OTP code for a number of times.
         */
        lockoutSeconds: number;
    };

    signup: {
        /**
         * How long the pending signup data lives in the cache.
         */
        pendingTtlSeconds: number;
    };

    login: {
        /**
         * Failed attempts before lockout kicks in.
         */
        failuresBeforeLockout: number;

        /**
         * First lockout duration.
         */
        baseLockoutSeconds: number;

        /**
         * Lockout cap, the lockout duration won't exceed this value.
         */
        maxLockoutSeconds: number;
    };

    transactionalToken: {
        /**
         * The lifetime of the transactional token in seconds.
         */
        expirySeconds: number;
    };

    session: {
        /**
         * Max active sessions per user at the same time.
         */
        maxPerUser: number;
    };

    reAuth: {
        /**
         * How long the re-authentication grace period lasts before asking for re-authentication again.
         */
        windowSeconds: number;
    };

    accountDeletion: {
        /**
         * Days a PENDING_DELETION account can still be restored before permanent deletion.
         */
        gracePeriodDays: number;
    };
}
