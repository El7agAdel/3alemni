import { Injectable } from "@nestjs/common";

import { Notification, NotificationChannelType } from "@generated/client";
import { LoggingService } from "@infra/logging";
import { UserPublicService } from "@modules/user";
import { EmailService, PushService, WhatsAppService } from "@shared/messaging";

import { DispatchPayload } from "../interfaces";

import { DeviceTokenService } from "./device-token.service";

@Injectable()
export class ChannelDispatcherService {
    constructor(
        private readonly logger: LoggingService,
        private readonly emailService: EmailService,
        private readonly whatsappService: WhatsAppService,
        private readonly pushService: PushService,
        private readonly deviceTokenService: DeviceTokenService,
        private readonly userPublic: UserPublicService,
    ) {
        this.logger.setContext(ChannelDispatcherService.name);
    }

    /**
     * Route a notification to one channel. Called per-channel by NotificationService.dispatch.
     * `notification` is null when this dispatch shouldn't create an inbox record.
     */
    async queue(
        channel: NotificationChannelType,
        notification: Notification | null,
        payload: DispatchPayload,
    ): Promise<void> {
        switch (channel) {
            case NotificationChannelType.EMAIL:
                return this.queueEmail(notification, payload);
            case NotificationChannelType.WHATSAPP:
                return this.queueWhatsapp(notification, payload);
            case NotificationChannelType.PUSH:
                return this.queuePush(notification, payload);
        }
    }

    /**
     * Queue an email. The caller supplies the email template with the appropriate data.
     * Logs and skips if the template or the user's email is missing.
     */
    private async queueEmail(notification: Notification | null, payload: DispatchPayload): Promise<void> {
        if (!payload.emailTemplate) {
            this.logger.warn("Email channel requested but no template supplied", {
                notificationId: notification?.id,
                userId: payload.userId,
            });

            return;
        }

        const user = await this.userPublic.findActiveById(payload.userId);

        if (!user?.email) {
            this.logger.warn("User has no email for delivery", {
                notificationId: notification?.id,
                userId: payload.userId,
            });

            return;
        }

        await this.emailService.queue(user.email, payload.emailTemplate);
    }

    /**
     * Queue a WhatsApp message. The caller supplies the WhatsApp template with the appropriate data.
     * Logs and skips if the template or the user's phone is missing.
     */
    private async queueWhatsapp(notification: Notification | null, payload: DispatchPayload): Promise<void> {
        if (!payload.whatsappTemplate) {
            this.logger.warn("WhatsApp channel requested but no template supplied", {
                notificationId: notification?.id,
                userId: payload.userId,
            });

            return;
        }

        const user = await this.userPublic.findActiveById(payload.userId);

        if (!user?.phone) {
            this.logger.warn("User has no phone for delivery", {
                notificationId: notification?.id,
                userId: payload.userId,
            });

            return;
        }

        await this.whatsappService.queue(user.phone, payload.whatsappTemplate);
    }

    /**
     * Distribute a push to every device token registered for this user.
     * Uses the title/body from the payload, not the notification row, so it works even without a
     * persisted record. If there are no device tokens, it skips silently.
     */
    private async queuePush(notification: Notification | null, payload: DispatchPayload): Promise<void> {
        const tokens = await this.deviceTokenService.listTokensForUsers([payload.userId]);

        if (tokens.length === 0) {
            this.logger.debug("No device tokens for user. skipping push", {
                notificationId: notification?.id,
                userId: payload.userId,
            });

            return;
        }

        await this.pushService.queueToTokens(
            tokens.map((t) => t.token),
            payload.title,
            payload.body,
            {
                notificationId: notification?.id ?? "",
                targetType: notification?.targetType ?? "",
                targetId: notification?.targetId ?? payload.targetId ?? "",
            },
        );
    }
}
