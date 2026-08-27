import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Job } from "bullmq";

import { ConfigService } from "@config";
import { FCM_BATCH_SIZE, FcmProvider, INVALID_TOKEN_CODES } from "@infra/communication";
import { LoggingService } from "@infra/logging";
import { QUEUE_NAMES } from "@infra/queue";

import { PushJobData } from "../jobs";

@Processor(QUEUE_NAMES.PUSH, { concurrency: 3 })
export class PushProcessor extends WorkerHost {
    private readonly devMode: boolean;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly emitter: EventEmitter2,
        private readonly fcmProvider: FcmProvider,
    ) {
        super();

        this.logger.setContext(PushProcessor.name);

        this.devMode = this.config.communication.devMode;
    }

    async process(job: Job<PushJobData>): Promise<void> {
        const { tokens, title, body, data, imageUrl, dryRun } = job.data;

        this.logger.debug("Processing push job", {
            jobId: job.id,
            tokenCount: tokens.length,
            title,
        });

        if (this.devMode) {
            this.logger.info("Push sent in queued dev mode", {
                jobId: job.id,
                tokenCount: tokens.length,
                title,
                body,
                imageUrl,
                data,
            });

            return;
        }

        if (!this.fcmProvider.isAvailable()) {
            this.logger.warn("FCM not available. Push not sent", { jobId: job.id });

            return;
        }

        try {
            const payload = {
                notification: { title, body, imageUrl },
                data: { ...data, sentAt: new Date().toISOString() },
                android: {
                    notification: { channelId: "default" },
                    priority: "high" as const,
                },
                apns: undefined,
                webpush: undefined,
            };

            let totalSuccess = 0;
            let totalFailure = 0;

            for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
                const batch = tokens.slice(i, i + FCM_BATCH_SIZE);

                const result = await this.fcmProvider.sendToTokens(batch, payload, dryRun);

                totalSuccess += result.successCount;
                totalFailure += result.failureCount;

                // Identify invalid tokens
                const invalidTokens = result.responses.flatMap((response, i) => {
                    const code = response.error?.code;
                    return code && INVALID_TOKEN_CODES.has(code) ? [batch[i]] : [];
                });

                if (invalidTokens.length > 0) {
                    this.emitter.emit("push.tokens.invalid", { tokens: invalidTokens });

                    this.logger.warn("Invalid FCM tokens detected", {
                        count: invalidTokens.length,
                    });
                }

                const progress = Math.floor(((i + batch.length) / tokens.length) * 100);
                await job.updateProgress(progress);
            }

            this.logger.info("Push job completed", {
                jobId: job.id,
                success: totalSuccess,
                failure: totalFailure,
            });
        } catch (error) {
            this.logger.error("Push job failed", error, { jobId: job.id });

            throw error;
        }
    }

    @OnWorkerEvent("completed")
    onCompleted(job: Job<PushJobData>): void {
        this.logger.debug("Push job completed", { jobId: job.id });
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job<PushJobData>, error: Error): void {
        this.logger.error("Push job failed permanently", error, {
            jobId: job.id,
            attempts: job.attemptsMade,
        });
    }
}
