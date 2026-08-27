import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import {
    EmailChangedEvent,
    PasswordChangedEvent,
    PasswordResetCompletedEvent,
    PhoneChangedEvent,
} from "@common/events";
import { LoggingService } from "@infra/logging";

import { NotificationType } from "../constants";
import { NotificationService } from "../services";

@Injectable()
export class OnUserNotificationHandler {
    constructor(
        private readonly logger: LoggingService,
        private readonly notificationService: NotificationService,
    ) {
        this.logger.setContext(OnUserNotificationHandler.name);
    }

    @OnEvent(EmailChangedEvent.eventName)
    async handleEmailChanged(event: EmailChangedEvent): Promise<void> {
        await this.dispatchAccountUpdated(event.userId, "Your email address was changed.");
    }

    @OnEvent(PhoneChangedEvent.eventName)
    async handlePhoneChanged(event: PhoneChangedEvent): Promise<void> {
        await this.dispatchAccountUpdated(event.userId, "Your phone number was changed.");
    }

    @OnEvent(PasswordChangedEvent.eventName)
    async handlePasswordChanged(event: PasswordChangedEvent): Promise<void> {
        await this.dispatchPasswordChanged(event.userId);
    }

    @OnEvent(PasswordResetCompletedEvent.eventName)
    async handlePasswordReset(event: PasswordResetCompletedEvent): Promise<void> {
        await this.dispatchPasswordChanged(event.userId);
    }

    private async dispatchAccountUpdated(userId: string, body: string): Promise<void> {
        try {
            await this.notificationService.dispatch(NotificationType.ACCOUNT_UPDATED, {
                userId,
                title: "Account updated",
                body,
            });
        } catch (error) {
            this.logger.error("Failed to dispatch ACCOUNT_UPDATED notification", error, { userId });
        }
    }

    private async dispatchPasswordChanged(userId: string): Promise<void> {
        try {
            await this.notificationService.dispatch(NotificationType.PASSWORD_CHANGED, {
                userId,
                title: "Password changed",
                body: "Your password was changed. If this wasn't you, contact support immediately.",
            });
        } catch (error) {
            this.logger.error("Failed to dispatch PASSWORD_CHANGED notification", error, { userId });
        }
    }
}
