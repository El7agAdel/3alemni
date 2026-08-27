import { JobsOptions } from "bullmq";

import { BaseJob, BaseJobData, JOB_NAMES, QUEUE_NAMES } from "@infra/queue";

export interface CleanupJobData extends BaseJobData {
    task:
        | "expired-otps"
        | "old-otps"
        | "expired-sessions"
        | "expired-deletion-requests"
        | "orphaned-uploads"
        | "stale-device-tokens"
        | "old-notifications";
    retentionDays?: number;
}

const JOB_NAME_MAP: Record<CleanupJobData["task"], string> = {
    "expired-otps": JOB_NAMES.TASKS.CLEANUP_EXPIRED_OTPS,
    "old-otps": JOB_NAMES.TASKS.CLEANUP_OLD_OTPS,
    "expired-sessions": JOB_NAMES.TASKS.CLEANUP_EXPIRED_SESSIONS,
    "expired-deletion-requests": JOB_NAMES.TASKS.CLEANUP_EXPIRED_DELETION_REQUESTS,
    "orphaned-uploads": JOB_NAMES.TASKS.CLEANUP_ORPHANED_UPLOADS,
    "stale-device-tokens": JOB_NAMES.TASKS.CLEANUP_STALE_DEVICE_TOKENS,
    "old-notifications": JOB_NAMES.TASKS.CLEANUP_OLD_NOTIFICATIONS,
};

export class CleanupJob extends BaseJob<CleanupJobData> {
    readonly queueName = QUEUE_NAMES.TASKS;
    readonly jobName: string;

    constructor(data: CleanupJobData, options: JobsOptions = {}) {
        super(data, {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
            ...options,
        });

        this.jobName = JOB_NAME_MAP[data.task];
    }

    protected validateSpecific(): boolean {
        return !!this.data.task && this.data.task in JOB_NAME_MAP;
    }

    protected getSpecificValidationErrors(): string[] {
        if (!this.data.task) return ["Task type is required"];
        if (!(this.data.task in JOB_NAME_MAP)) return [`Unknown task: ${this.data.task}`];

        return [];
    }
}
