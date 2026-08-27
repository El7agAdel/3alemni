import { Injectable } from "@nestjs/common";

import { ConfigService } from "@config";

import { NotificationRepository } from "../repositories";

@Injectable()
export class NotificationPublicService {
    constructor(
        private readonly config: ConfigService,
        private readonly notificationRepo: NotificationRepository,
    ) {}

    /**
     * Delete notifications older than the configured retention window.
     * Called by the cleanup task.
     */
    async cleanOldNotifications(): Promise<number> {
        const days = this.config.notification.retentionDays;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const { count } = await this.notificationRepo.deleteOlderThan(cutoff);

        return count;
    }
}
