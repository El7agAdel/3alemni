import { Injectable, OnModuleInit } from "@nestjs/common";

import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";
import { JOB_NAMES } from "@infra/queue";

import { CleanupProducer } from "./cleanup";

@Injectable()
export class TasksService implements OnModuleInit {
    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly cleanupProducer: CleanupProducer,
    ) {
        this.logger.setContext(TasksService.name);
    }

    async onModuleInit(): Promise<void> {
        await this.registerCleanupTasks();

        this.logger.info("All recurring tasks registered");
    }

    private async registerCleanupTasks(): Promise<void> {
        // Expired OTPs
        await this.cleanupProducer.produceRecurring(
            { task: "expired-otps", jobId: JOB_NAMES.TASKS.CLEANUP_EXPIRED_OTPS },
            "0 */6 * * *",
        );

        // Old (used) OTPs
        await this.cleanupProducer.produceRecurring(
            {
                task: "old-otps",
                retentionDays: 7,
                jobId: JOB_NAMES.TASKS.CLEANUP_OLD_OTPS,
            },
            "0 3 * * *",
        );

        // Expired sessions
        await this.cleanupProducer.produceRecurring(
            {
                task: "expired-sessions",
                jobId: JOB_NAMES.TASKS.CLEANUP_EXPIRED_SESSIONS,
            },
            "0 */6 * * *",
        );

        // Accounts whose deletion grace period has expired
        await this.cleanupProducer.produceRecurring(
            {
                task: "expired-deletion-requests",
                retentionDays: this.config.auth.accountDeletion.gracePeriodDays,
                jobId: JOB_NAMES.TASKS.CLEANUP_EXPIRED_DELETION_REQUESTS,
            },
            "0 4 * * *",
        );

        // Orphaned uploads
        await this.cleanupProducer.produceRecurring(
            {
                task: "orphaned-uploads",
                jobId: JOB_NAMES.TASKS.CLEANUP_ORPHANED_UPLOADS,
            },
            "0 3 * * 0",
        );

        // Stale device tokens
        await this.cleanupProducer.produceRecurring(
            {
                task: "stale-device-tokens",
                jobId: JOB_NAMES.TASKS.CLEANUP_STALE_DEVICE_TOKENS,
            },
            "0 3 * * 0",
        );

        // Old notifications
        await this.cleanupProducer.produceRecurring(
            {
                task: "old-notifications",
                jobId: JOB_NAMES.TASKS.CLEANUP_OLD_NOTIFICATIONS,
            },
            "30 3 * * *",
        );

        this.logger.info("Cleanup tasks registered");
    }
}
