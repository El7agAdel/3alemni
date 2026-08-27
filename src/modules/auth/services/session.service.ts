import { Injectable } from "@nestjs/common";
import crypto from "crypto";
import { nanoid } from "nanoid";

import { AppExceptions } from "@common/exceptions";
import { ConfigService } from "@config";
import { Session } from "@generated/client";
import { LoggingService } from "@infra/logging";

import { SessionInfo, SessionMetadata } from "../interfaces/auth.interface";
import { SessionRepository } from "../repositories";

import { TokenService } from "./token.service";

@Injectable()
export class SessionService {
    private readonly sessionConfig;
    private readonly refreshTokenExpiry: number;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly sessionRepo: SessionRepository,
        private readonly tokenService: TokenService,
    ) {
        this.logger.setContext(SessionService.name);

        this.sessionConfig = this.config.auth.session;
        this.refreshTokenExpiry = this.config.auth.jwt.refreshTokenExpirySeconds;
    }

    /**
     * Find a session by refresh token.
     */
    async findByRefreshToken(refreshToken: string): Promise<Session | null> {
        const hashed = this.hashToken(refreshToken);

        return this.sessionRepo.findByRefreshToken(hashed);
    }

    /**
     * List all active sessions for a user.
     */
    async listActive(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
        const sessions = await this.sessionRepo.findAllByUser(userId);

        return sessions.map((session) => ({
            ...session,
            isCurrent: session.id === currentSessionId,
        }));
    }

    /**
     * Create a new session.
     */
    async create(userId: string, metadata: SessionMetadata): Promise<{ sessionId: string; refreshToken: string }> {
        const sessionCount = await this.sessionRepo.countByUser(userId);

        if (sessionCount >= this.sessionConfig.maxPerUser) {
            await this.sessionRepo.deleteOldest(userId);

            this.logger.debug("Oldest session evicted", { userId });
        }

        const refreshToken = nanoid(48);
        const hashedToken = this.hashToken(refreshToken);
        const expiresAt = new Date(Date.now() + this.refreshTokenExpiry * 1000);

        const session = await this.sessionRepo.create({
            userId,
            refreshToken: hashedToken,
            metadata,
            expiresAt,
        });

        this.logger.info("Session created", {
            userId,
            sessionId: session.id,
            deviceType: metadata.deviceType,
            ipAddress: metadata.ipAddress,
        });

        return { sessionId: session.id, refreshToken };
    }

    /**
     * Rotate a refresh token: generates a new one and updates the session.
     */
    async rotate(oldRefreshToken: string): Promise<{ sessionId: string; refreshToken: string; userId: string }> {
        const hashedOld = this.hashToken(oldRefreshToken);
        const session = await this.sessionRepo.findByRefreshToken(hashedOld);

        if (!session) throw AppExceptions.sessionInvalid();

        if (session.expiresAt < new Date()) {
            await this.sessionRepo.delete(session.id);

            throw AppExceptions.sessionExpired();
        }

        const newRefreshToken = nanoid(48);
        const newHashedToken = this.hashToken(newRefreshToken);
        const expiresAt = new Date(Date.now() + this.refreshTokenExpiry * 1000);

        await this.sessionRepo.update(session.id, {
            refreshToken: newHashedToken,
            expiresAt,
            lastActiveAt: new Date(),
        });

        this.logger.debug("Refresh token rotated", {
            sessionId: session.id,
            userId: session.userId,
        });

        return {
            sessionId: session.id,
            refreshToken: newRefreshToken,
            userId: session.userId,
        };
    }

    /**
     * Revoke a single session by id.
     */
    async revoke(sessionId: string, userId: string): Promise<void> {
        const session = await this.sessionRepo.findById(sessionId);

        if (!session) {
            throw AppExceptions.notFound("Session", sessionId);
        }

        if (session.userId !== userId) {
            throw AppExceptions.forbidden("Cannot revoke this session");
        }

        await this.sessionRepo.delete(sessionId);
        await this.tokenService.blacklistAccessToken(sessionId);

        this.logger.info("Session revoked", { sessionId, userId });
    }

    /**
     * Revoke all sessions for a user.
     */
    async revokeAll(userId: string, excludeSessionId?: string): Promise<{ revokedCount: number }> {
        const sessions = await this.sessionRepo.findAllByUser(userId);

        const toBlacklist = sessions.filter((session) => session.id !== excludeSessionId).map((session) => session.id);

        const revokedCount = await this.sessionRepo.deleteAllForUser(userId, excludeSessionId);

        if (toBlacklist.length > 0) {
            await this.tokenService.blacklistAccessToken(toBlacklist);
        }

        this.logger.info("All sessions revoked", {
            userId,
            revokedCount,
            excludedSession: excludeSessionId,
        });

        return { revokedCount };
    }

    /**
     * Clean up all expired sessions.
     */
    async cleanupExpired(): Promise<{ deletedCount: number }> {
        const deletedCount = await this.sessionRepo.deleteExpired();

        if (deletedCount > 0) {
            this.logger.info("Expired sessions cleaned up", { deletedCount });
        }

        return { deletedCount };
    }

    /**
     * Hash a refresh token for storage/lookup.
     */
    private hashToken(token: string): string {
        return crypto.createHash("sha256").update(token).digest("hex");
    }
}
