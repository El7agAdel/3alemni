import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SuspiciousLoginActivityEvent } from "@common/events";
import { AppExceptions } from "@common/exceptions";
import { ConfigService } from "@config";
import { CacheService } from "@infra/cache";
import { LoggingService } from "@infra/logging";

import { AuthCacheKeys } from "../constants/auth.constant";

@Injectable()
export class LoginProtectionService {
    private readonly loginConfig;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly cache: CacheService,
        private readonly emitter: EventEmitter2,
    ) {
        this.logger.setContext(LoginProtectionService.name);

        this.loginConfig = this.config.auth.login;
    }

    /**
     * Check if the identifier is currently locked out for failing many attempts.
     */
    async checkLockout(identifier: string): Promise<void> {
        const lockoutKey = AuthCacheKeys.LOGIN_LOCKOUT(identifier);
        const isLocked = await this.cache.exists(lockoutKey);

        if (isLocked) {
            const ttl = await this.cache.getTTL(lockoutKey);

            this.logger.debug("Login blocked. Account is locked", {
                identifier,
                retryAfter: ttl,
            });

            throw AppExceptions.loginLocked(ttl);
        }
    }

    /**
     * Record a failed login attempt. Applies a lockout if the threshold is exceeded.
     */
    async recordFailedAttempt(identifier: string, ip?: string): Promise<void> {
        const attemptsKey = AuthCacheKeys.LOGIN_ATTEMPTS(identifier);
        const lockoutCountKey = AuthCacheKeys.LOGIN_LOCKOUT_COUNT(identifier);

        const failureCount = await this.cache.increment(attemptsKey);

        if (failureCount === 1) {
            await this.cache.expire(attemptsKey, 3600);
        }

        if (failureCount >= this.loginConfig.failuresBeforeLockout) {
            const lockoutCount = (await this.cache.get<number>(lockoutCountKey)) ?? 0;
            const lockoutSeconds = this.calculateLockoutDuration(lockoutCount);

            await this.applyLockout(identifier, lockoutSeconds, failureCount, lockoutCount, ip);

            // Remember previous lockouts for 24 hours so repeat offenders escalate faster
            await this.cache.set(lockoutCountKey, lockoutCount + 1, 86400);

            await this.cache.delete(attemptsKey);
        }
    }

    /**
     * Clear all failure records on successful login.
     */
    async clearAttempts(identifier: string): Promise<void> {
        await Promise.all([
            this.cache.delete(AuthCacheKeys.LOGIN_ATTEMPTS(identifier)),
            this.cache.delete(AuthCacheKeys.LOGIN_LOCKOUT(identifier)),
            this.cache.delete(AuthCacheKeys.LOGIN_LOCKOUT_COUNT(identifier)),
        ]);

        this.logger.debug("Login failures cleared", {
            identifier,
        });
    }

    /**
     * Calculate lockout duration - progressive increase until the max duration is hit.
     */
    private calculateLockoutDuration(lockoutCount: number): number {
        const { baseLockoutSeconds, maxLockoutSeconds } = this.loginConfig;
        const duration = baseLockoutSeconds * Math.pow(2, lockoutCount);

        return Math.min(Math.floor(duration), maxLockoutSeconds);
    }

    /**
     * Apply the lockout and emit an event if it's an extreme case (repeated max-duration lockouts).
     */
    private async applyLockout(
        identifier: string,
        lockoutSeconds: number,
        attempts: number,
        lockoutCount: number,
        ip?: string,
    ): Promise<void> {
        const lockoutKey = AuthCacheKeys.LOGIN_LOCKOUT(identifier);
        await this.cache.set(lockoutKey, true, lockoutSeconds);

        this.logger.warn("Login lockout applied", {
            identifier,
            lockoutDuration: lockoutSeconds,
            lockoutNumber: lockoutCount + 1,
            attempts,
        });

        if (lockoutSeconds >= this.loginConfig.maxLockoutSeconds) {
            this.emitter.emit(
                SuspiciousLoginActivityEvent.eventName,
                new SuspiciousLoginActivityEvent(identifier, ip ?? null, attempts),
            );
        }
    }
}
