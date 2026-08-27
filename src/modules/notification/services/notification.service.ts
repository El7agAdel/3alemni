import { Injectable } from "@nestjs/common";

import { AppExceptions } from "@common/exceptions";
import { PaginatedResult } from "@common/interfaces";
import { QueryBuilderUtil } from "@common/utils";
import { Notification, Prisma } from "@generated/client";
import { LoggingService } from "@infra/logging";

import { NotificationQuery, NotificationRouting, NotificationType } from "../constants";
import { NotificationQueryDto } from "../dto/requests";
import { DispatchPayload, NotificationOverrides } from "../interfaces";
import { NotificationRepository } from "../repositories";

import { ChannelDispatcherService } from "./channel-dispatcher.service";

@Injectable()
export class NotificationService {
    constructor(
        private readonly logger: LoggingService,
        private readonly notificationRepo: NotificationRepository,
        private readonly channelDispatcherService: ChannelDispatcherService,
    ) {
        this.logger.setContext(NotificationService.name);
    }

    /**
     * List a user's notifications with an optional custom filter.
     */
    async listForUser(userId: string, query: NotificationQueryDto): Promise<PaginatedResult<Notification>> {
        const options = this.buildNotificationQuery(userId, query);

        return this.notificationRepo.list(options);
    }

    /**
     * Get details of a single notification scoped to the requesting user.
     * Throws not found if the user is not the owner.
     */
    async findByIdForUser(userId: string, id: string): Promise<Notification> {
        const notification = await this.notificationRepo.findById(id);

        if (!notification || notification.userId !== userId) {
            throw AppExceptions.notFound("Notification", id);
        }

        return notification;
    }

    /**
     * Mark one notification as read. Idempotent - calling it multiple times is a no-op after the first.
     */
    async markRead(userId: string, id: string): Promise<Notification> {
        const notification = await this.findByIdForUser(userId, id);

        if (notification.readAt !== null) return notification;

        return this.notificationRepo.update(id, { readAt: new Date() });
    }

    /**
     * Mark every unread notification owned by this user as read. Returns the affected row count.
     */
    async markAllRead(userId: string): Promise<{ marked: number }> {
        const result = await this.notificationRepo.markAllReadForUser(userId);

        this.logger.info("Marked all notifications read", {
            userId,
            marked: result.count,
        });

        return { marked: result.count };
    }

    /**
     * Get the total number of unread notifications, for a badge counter.
     */
    async countUnreadForUser(userId: string): Promise<number> {
        return this.notificationRepo.countUnreadForUser(userId);
    }

    /**
     * Main entry point for notification creation.
     * Resolves the routing config, applies any overrides, writes the notification record, and
     * queues channel delivery. Returns null if the dedup key collides, so duplicates aren't shown twice.
     */
    async dispatch(
        type: NotificationType,
        payload: DispatchPayload,
        overrides?: NotificationOverrides,
    ): Promise<Notification | null> {
        const config = NotificationRouting[type];

        if (!config) {
            throw new Error(`No routing config for NotificationType: ${type}`);
        }

        const icon = overrides?.icon ?? config.icon;
        const color = overrides?.color ?? config.color;
        const channels = overrides?.channels ?? config.channels;
        const persistNotification = overrides?.persistNotification ?? config.persistNotification;
        const dedupKey = payload.dedupKey ?? this.buildDefaultDedupKey(type, payload);

        let notification: Notification | null = null;

        if (persistNotification) {
            try {
                notification = await this.notificationRepo.create({
                    userId: payload.userId,
                    type,
                    title: payload.title,
                    body: payload.body,
                    icon,
                    color,
                    category: config.category,
                    targetType: config.targetType,
                    targetId: payload.targetId ?? null,
                    broadcastId: payload.broadcastId ?? null,
                    dedupKey,
                });
            } catch (error) {
                if (this.isDedupCollision(error)) {
                    this.logger.debug("Skipped duplicate notification", {
                        type,
                        userId: payload.userId,
                        dedupKey,
                    });

                    return null;
                }

                throw error;
            }
        }

        for (const channel of channels) {
            try {
                await this.channelDispatcherService.queue(channel, notification, payload);
            } catch (error) {
                this.logger.error("Failed to queue channel delivery", error, {
                    notificationId: notification?.id,
                    channel,
                    type,
                });
            }
        }

        return notification;
    }

    /**
     * Build a default dedup key from the dispatch payload when the caller doesn't supply one.
     */
    private buildDefaultDedupKey(type: NotificationType, payload: DispatchPayload): string {
        const parts: string[] = [type];

        if (payload.broadcastId) parts.push(payload.broadcastId);
        if (payload.targetId) parts.push(payload.targetId);

        parts.push(payload.userId);

        return parts.join(":");
    }

    /**
     * Recognizes a repeated dispatch via the unique constraint on `dedupKey`, swallowing only that case.
     */
    private isDedupCollision(error: unknown): boolean {
        return (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002" &&
            Array.isArray(error.meta?.target) &&
            (error.meta.target as string[]).includes("dedupKey")
        );
    }

    /**
     * Build query options for listing a user's notifications, always scoped to that user.
     */
    private buildNotificationQuery(userId: string, query: NotificationQueryDto) {
        const builder = QueryBuilderUtil.create().paginate(query).sort(query, NotificationQuery.sort).where({ userId });

        if (query.read === true) builder.where({ readAt: { not: null } });
        if (query.read === false) builder.where({ readAt: null });

        return builder.build();
    }
}
