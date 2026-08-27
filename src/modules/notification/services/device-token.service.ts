import { Injectable } from "@nestjs/common";

import { DeviceToken } from "@generated/client";
import { LoggingService } from "@infra/logging";

import { RegisterDeviceTokenDto } from "../dto/requests";
import { DeviceTokenRepository } from "../repositories";

@Injectable()
export class DeviceTokenService {
    constructor(
        private readonly logger: LoggingService,
        private readonly deviceTokenRepo: DeviceTokenRepository,
    ) {
        this.logger.setContext(DeviceTokenService.name);
    }

    /**
     * List all device push tokens for the user.
     */
    async listForUser(userId: string): Promise<DeviceToken[]> {
        return this.deviceTokenRepo.listByUserId(userId);
    }

    /**
     * Register or refresh a push token for a user/device pair.
     * If this device was previously registered to a different user, drop those rows so the previous
     * user stops receiving push notifications on that device (handles shared-device account switching).
     */
    async register(userId: string, dto: RegisterDeviceTokenDto): Promise<DeviceToken> {
        await this.deviceTokenRepo.deleteByDeviceIdExceptUser(dto.deviceId, userId);

        const existing = await this.deviceTokenRepo.findByUserAndDevice(userId, dto.deviceId);

        if (existing) {
            const updated = await this.deviceTokenRepo.update(existing.id, {
                token: dto.token,
                platform: dto.platform,
                deviceName: dto.deviceName ?? existing.deviceName,
                lastSeenAt: new Date(),
            });

            this.logger.debug("Refreshed device token", {
                userId,
                tokenId: updated.id,
                deviceId: dto.deviceId,
                platform: dto.platform,
            });

            return updated;
        }

        const created = await this.deviceTokenRepo.create({
            userId,
            deviceId: dto.deviceId,
            token: dto.token,
            platform: dto.platform,
            deviceName: dto.deviceName ?? null,
        });

        this.logger.info("Registered new device", {
            userId,
            tokenId: created.id,
            deviceId: dto.deviceId,
            platform: dto.platform,
        });

        return created;
    }

    /**
     * Unregister a specific token by id, scoped to the current user.
     * Silently succeeds if the token doesn't exist or belongs to someone else.
     */
    async unregister(userId: string, tokenId: string): Promise<void> {
        const token = await this.deviceTokenRepo.findById(tokenId);

        if (!token || token.userId !== userId) return;

        await this.deviceTokenRepo.delete(tokenId);

        this.logger.info("Unregistered device token", { tokenId, userId });
    }

    /**
     * Bulk token lookup for push delivery. Returns every device token row across the given users.
     */
    async listTokensForUsers(userIds: string[]): Promise<DeviceToken[]> {
        return this.deviceTokenRepo.listByUserIds(userIds);
    }

    /**
     * Delete device tokens whose `lastSeenAt` is older than `cleanupAfterDays`.
     * Called by the cleanup task.
     */
    async cleanupStaleTokens(cleanupAfterDays: number): Promise<{ deleted: number }> {
        const beforeDate = new Date(Date.now() - cleanupAfterDays * 24 * 60 * 60 * 1000);

        const result = await this.deviceTokenRepo.deleteOlderThan(beforeDate);

        return { deleted: result.count };
    }
}
