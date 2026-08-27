import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import { LoggingService } from "@infra/logging";
import { QUEUE_NAMES } from "@infra/queue";

import { CleanupJobData } from "./cleanup.job";
import { CleanupService } from "./cleanup.service";

@Processor(QUEUE_NAMES.TASKS, { concurrency: 1 })
export class CleanupProcessor extends WorkerHost {
    constructor(
        private readonly logger: LoggingService,
        private readonly cleanupService: CleanupService,
    ) {
        super();

        this.logger.setContext(CleanupProcessor.name);
    }

    async process(job: Job<CleanupJobData>): Promise<number> {
        if (!job.name.startsWith("cleanup:")) return 0;

        const { task, retentionDays } = job.data;

        switch (task) {
            case "expired-otps":
                return this.cleanupService.cleanExpiredOtps();
            case "old-otps":
                return this.cleanupService.cleanOldOtps(retentionDays);
            case "expired-sessions":
                return this.cleanupService.cleanExpiredSessions();
            case "expired-deletion-requests":
                return this.cleanupService.cleanExpiredDeletionRequests(retentionDays);
            case "orphaned-uploads":
                return this.cleanupService.cleanOrphanUploads(retentionDays);
            case "stale-device-tokens":
                return this.cleanupService.cleanStaleDeviceTokens();
            case "old-notifications":
                return this.cleanupService.cleanOldNotifications();
            default:
                this.logger.warn(`Unknown cleanup task: ${String(task)}`);
                return 0;
        }
    }
}
