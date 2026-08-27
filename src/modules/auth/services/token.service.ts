import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomBytes } from "crypto";

import { AppExceptions } from "@common/exceptions";
import { ConfigService } from "@config";
import { User } from "@generated/client";
import { CacheService } from "@infra/cache";
import { LoggingService } from "@infra/logging";

import { AuthCacheKeys, TransactionalTokenType } from "../constants/auth.constant";
import { JwtPayload, TransactionalTokenPayloads } from "../interfaces/auth.interface";

/**
 * Transactional token structure stored in the cache, based on the token type.
 */
interface StoredTokenPayload<T extends TransactionalTokenType = TransactionalTokenType> {
    type: T;
    data: TransactionalTokenPayloads[T];
    createdAt: number;
}

@Injectable()
export class TokenService {
    private readonly authConfig;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly cache: CacheService,
        private readonly jwtService: JwtService,
    ) {
        this.logger.setContext(TokenService.name);

        this.authConfig = this.config.auth;
    }

    /**
     * Generate a signed JWT access token for the user.
     */
    async generateAccessToken(user: Pick<User, "id" | "email">, sessionId: string): Promise<string> {
        const jti = randomBytes(16).toString("base64url");

        const payload: Omit<JwtPayload, "iat" | "exp" | "iss" | "aud"> = {
            sub: user.id,
            email: user.email,
            sessionId,
            jti,
        };

        const token = await this.jwtService.signAsync(payload);

        this.logger.debug("Access token generated", {
            userId: user.id,
            email: user.email,
            jti,
        });

        return token;
    }

    /**
     * Blacklist one or multiple access tokens on logout or manual revoke, keyed by session id.
     * Stores the session id in Redis with a TTL equal to the token's remaining lifetime.
     * Checked during JWT verification.
     */
    async blacklistAccessToken(sessionIds: string | string[]): Promise<void> {
        const ttl = this.authConfig.jwt.accessTokenExpirySeconds;
        const ids = Array.isArray(sessionIds) ? sessionIds : [sessionIds];

        await Promise.all(
            ids.map((sessionId: string) => {
                const key = AuthCacheKeys.BLACKLIST(sessionId);

                return this.cache.set(key, true, ttl);
            }),
        );

        this.logger.debug("Token(s) blacklisted", {
            sessionCount: ids.length,
            ttl,
        });
    }

    /**
     * Check if a session is blacklisted.
     */
    async isAccessTokenBlacklisted(sessionId: string): Promise<boolean> {
        const key = AuthCacheKeys.BLACKLIST(sessionId);
        const exists = await this.cache.get(key);

        return exists !== null;
    }

    /**
     * Create a transactional token for a given type and data.
     * Stored in Redis with a custom TTL for single use.
     */
    async createTransactionalToken<T extends TransactionalTokenType>(
        type: T,
        data: TransactionalTokenPayloads[T],
    ): Promise<string> {
        const token = randomBytes(32).toString("base64url");
        const key = AuthCacheKeys.TRANSACTIONAL(token);

        const payload: StoredTokenPayload<T> = {
            type,
            data,
            createdAt: Date.now(),
        };

        await this.cache.set(key, payload, this.authConfig.transactionalToken.expirySeconds);

        this.logger.debug("Transactional token created", { type });

        return token;
    }

    /**
     * Verify a transactional token and return its payload without consuming it.
     */
    async verifyTransactionalToken<T extends TransactionalTokenType>(
        token: string,
        expectedType: T,
    ): Promise<TransactionalTokenPayloads[T]> {
        const key = AuthCacheKeys.TRANSACTIONAL(token);
        const stored = await this.cache.get<StoredTokenPayload>(key);

        if (!stored) {
            this.logger.warn("Transactional token not found or expired");

            throw AppExceptions.transactionalTokenInvalid("Invalid or expired token");
        }

        if (stored.type !== expectedType) {
            this.logger.warn("Transactional token type mismatch", {
                expected: expectedType,
                actual: stored.type,
            });

            throw AppExceptions.transactionalTokenInvalid("Invalid token for this operation");
        }

        this.logger.debug("Transactional token verified", { type: stored.type });

        return stored.data as TransactionalTokenPayloads[T];
    }

    /**
     * Delete a transactional token after successful use.
     */
    async consumeTransactionalToken(token: string): Promise<void> {
        const key = AuthCacheKeys.TRANSACTIONAL(token);

        await this.cache.delete(key);

        this.logger.debug("Transactional token consumed");
    }
}
