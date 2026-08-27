import { Injectable } from "@nestjs/common";

import { ConfigService } from "@config";
import { UserStatus } from "@generated/enums";
import { PrismaService } from "@infra/database";
import { LoggingService } from "@infra/logging";
import { DeviceTokenPublicService, NotificationPublicService } from "@modules/notification";
import { UploadPublicService } from "@modules/upload";
import { OtpService } from "@shared/otp";

@Injectable()
export class CleanupService {
    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly prisma: PrismaService,
        private readonly otpService: OtpService,
        private readonly uploadPublic: UploadPublicService,
        private readonly deviceTokenPublic: DeviceTokenPublicService,
        private readonly notificationPublic: NotificationPublicService,
    ) {
        this.logger.setContext(CleanupService.name);
    }

    async cleanExpiredOtps(): Promise<number> {
        const count = await this.otpService.cleanupExpired();

        if (count > 0) this.logger.info("Cleaned expired OTPs", { count });

        return count;
    }

    async cleanOldOtps(retentionDays = 7): Promise<number> {
        const date = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
        const count = await this.otpService.cleanupUsedBefore(date);

        if (count > 0) this.logger.info("Cleaned old OTPs", { count, retentionDays });

        return count;
    }

    async cleanExpiredSessions(): Promise<number> {
        const result = await this.prisma.session.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });

        if (result.count > 0) this.logger.info("Cleaned expired sessions", { count: result.count });

        return result.count;
    }

    /**
     * Permanently delete accounts whose PENDING_DELETION grace period has expired.
     * The grace period defaults to config.auth.accountDeletion.gracePeriodDays.
     */
    async cleanExpiredDeletionRequests(retentionDays?: number): Promise<number> {
        const days = retentionDays ?? this.config.auth.accountDeletion.gracePeriodDays;
        const deleteBefore = new Date();
        deleteBefore.setDate(deleteBefore.getDate() - days);

        const users = await this.prisma.user.findMany({
            where: {
                status: UserStatus.PENDING_DELETION,
                deletionRequestedAt: { lt: deleteBefore },
            },
            select: { id: true },
        });

        if (users.length === 0) return 0;

        const result = await this.prisma.user.deleteMany({
            where: { id: { in: users.map((u) => u.id) } },
        });

        this.logger.info("Permanently deleted expired user accounts", {
            count: result.count,
        });

        return result.count;
    }

    /**
     * Remove uploads with no uploadable id after a retention period.
     */
    async cleanOrphanUploads(retentionDays = 7): Promise<number> {
        return this.uploadPublic.cleanupOrphans(retentionDays);
    }

    /**
     * Remove old device tokens that haven't been seen in a while.
     */
    async cleanStaleDeviceTokens(): Promise<number> {
        const count = await this.deviceTokenPublic.cleanStaleDeviceTokens();

        if (count > 0) {
            this.logger.info("Device tokens cleanup pass complete", { count });
        }

        return count;
    }

    /**
     * Remove old notifications so they don't accumulate over time.
     */
    async cleanOldNotifications(): Promise<number> {
        const count = await this.notificationPublic.cleanOldNotifications();

        if (count > 0) {
            this.logger.info("Notifications cleanup pass complete", { count });
        }

        return count;
    }
}
