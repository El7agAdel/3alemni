import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import { ConfigService } from "@config";
import { Broadcast } from "@generated/client";
import { BroadcastStatus, NotificationChannelType } from "@generated/enums";
import { LoggingService } from "@infra/logging";
import { QUEUE_NAMES } from "@infra/queue";
import { UserPublicService } from "@modules/user";
import { BroadcastEmail, BroadcastTemplate, EmailService, PushService, WhatsAppService } from "@shared/messaging";

import { AudienceParams, BroadcastAudience, NotificationType } from "../constants";
import { DispatchBroadcastJobData } from "../jobs";
import { BroadcastRepository } from "../repositories";
import { AudienceResolverService, DeviceTokenService, NotificationService } from "../services";

@Processor(QUEUE_NAMES.BROADCAST, { concurrency: 1 })
export class BroadcastProcessor extends WorkerHost {
    private readonly batchSize: number;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly broadcastRepo: BroadcastRepository,
        private readonly audienceResolver: AudienceResolverService,
        private readonly userPublic: UserPublicService,
        private readonly deviceTokenService: DeviceTokenService,
        private readonly emailService: EmailService,
        private readonly whatsappService: WhatsAppService,
        private readonly pushService: PushService,
        private readonly notificationService: NotificationService,
    ) {
        super();

        this.logger.setContext(BroadcastProcessor.name);

        this.batchSize = this.config.notification.broadcast.batchSize;
    }

    async process(job: Job<DispatchBroadcastJobData>): Promise<void> {
        const { broadcastId } = job.data;

        const broadcast = await this.broadcastRepo.findById(broadcastId);

        if (!broadcast) {
            this.logger.error("Broadcast not found during processing", null, {
                broadcastId,
            });

            return;
        }

        try {
            const userIds = await this.audienceResolver.resolve(
                broadcast.audience as BroadcastAudience,
                broadcast.createdBy,
                (broadcast.audienceParams as AudienceParams | null) ?? undefined,
            );

            if (broadcast.persistAsNotification) {
                await this.persistRecords(broadcast, userIds);
            }

            await this.deliverChannel(broadcast, userIds);

            await this.broadcastRepo.update(broadcastId, {
                status: BroadcastStatus.COMPLETED,
                completedAt: new Date(),
            });

            this.logger.info("Broadcast processed successfully", {
                broadcastId,
                audience: broadcast.audience,
                channel: broadcast.channel,
                recipients: userIds.length,
                persistAsNotification: broadcast.persistAsNotification,
            });
        } catch (error) {
            this.logger.error("Broadcast processing failed", error, { broadcastId });

            await this.broadcastRepo.update(broadcastId, {
                status: BroadcastStatus.FAILED,
                completedAt: new Date(),
                failureReason: error instanceof Error ? error.message : "Unknown error",
            });

            throw error;
        }
    }

    /**
     * Delivers the broadcast through its chosen channel, in bounded batches rather than one
     * unbounded loop over the whole audience (which can be up to maxAudienceSize recipients).
     * Messaging services queue one job per recipient, so each batch stays a fixed, predictable size.
     */
    private async deliverChannel(broadcast: Broadcast, userIds: string[]): Promise<void> {
        for (const batch of this.chunk(userIds)) {
            switch (broadcast.channel) {
                case NotificationChannelType.EMAIL: {
                    const users = await this.userPublic.findManyByIds(batch);
                    const emails = users.map((u) => u.email).filter((email): email is string => !!email);
                    const template = new BroadcastEmail({
                        title: broadcast.title,
                        body: broadcast.body,
                    });

                    await this.emailService.queueBulk(emails, template);
                    break;
                }
                case NotificationChannelType.WHATSAPP: {
                    const users = await this.userPublic.findManyByIds(batch);
                    const phones = users.map((u) => u.phone).filter((p): p is string => !!p);
                    const template = new BroadcastTemplate({
                        title: broadcast.title,
                        body: broadcast.body,
                    });

                    await this.whatsappService.queueBulk(phones, template);
                    break;
                }
                case NotificationChannelType.PUSH: {
                    const tokens = await this.deviceTokenService.listTokensForUsers(batch);

                    if (tokens.length === 0) break;

                    await this.pushService.queueToTokens(
                        tokens.map((t) => t.token),
                        broadcast.title,
                        broadcast.body,
                        { broadcastId: broadcast.id },
                    );
                    break;
                }
            }
        }
    }

    /**
     * Write per-recipient notification rows so the broadcast shows up in users' inboxes.
     * Processed in bounded batches. Goes through NotificationService so the dedup key and routing
     * config apply, and retries never create duplicate inbox records for the same recipient.
     */
    private async persistRecords(broadcast: Broadcast, userIds: string[]): Promise<void> {
        for (const batch of this.chunk(userIds)) {
            await Promise.all(
                batch.map((userId) =>
                    this.notificationService
                        .dispatch(
                            NotificationType.BROADCAST,
                            {
                                userId,
                                title: broadcast.title,
                                body: broadcast.body,
                                broadcastId: broadcast.id,
                            },
                            { persistNotification: true },
                        )
                        .catch((error) => {
                            this.logger.warn("Failed to write broadcast notification record", {
                                broadcastId: broadcast.id,
                                userId,
                                error,
                            });
                        }),
                ),
            );
        }
    }

    /**
     * Split an array into fixed-size batches, bounded by the configured broadcast batch size.
     */
    private chunk<T>(items: T[]): T[][] {
        const batches: T[][] = [];

        for (let i = 0; i < items.length; i += this.batchSize) {
            batches.push(items.slice(i, i + this.batchSize));
        }

        return batches;
    }
}
