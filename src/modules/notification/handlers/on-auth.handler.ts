import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { appName } from "@common/constants";
import { RegisterCompletedEvent, SuspiciousLoginActivityEvent } from "@common/events";
import { LoggingService } from "@infra/logging";
import { UserPublicService } from "@modules/user";
import { SecurityAlertEmail, WelcomeEmail } from "@shared/messaging";

import { NotificationType } from "../constants";
import { NotificationService } from "../services";

@Injectable()
export class OnAuthNotificationHandler {
    constructor(
        private readonly logger: LoggingService,
        private readonly notificationService: NotificationService,
        private readonly userPublicService: UserPublicService,
    ) {
        this.logger.setContext(OnAuthNotificationHandler.name);
    }

    @OnEvent(RegisterCompletedEvent.eventName)
    async handleRegisterCompleted(event: RegisterCompletedEvent): Promise<void> {
        try {
            await this.notificationService.dispatch(NotificationType.WELCOME, {
                userId: event.userId,
                title: `Welcome to ${appName()}!`,
                body: "Your account is ready.",
                emailTemplate: new WelcomeEmail({
                    recipientName: event.username ?? undefined,
                }),
            });
        } catch (error) {
            this.logger.error("Failed to dispatch WELCOME notification", error, {
                userId: event.userId,
            });
        }
    }

    @OnEvent(SuspiciousLoginActivityEvent.eventName)
    async handleSuspiciousLogin(event: SuspiciousLoginActivityEvent): Promise<void> {
        try {
            const user = await this.userPublicService.findByIdentifier(event.identifier);

            if (!user) return;

            await this.notificationService.dispatch(NotificationType.SECURITY_ALERT, {
                userId: user.id,
                title: "Suspicious login activity",
                body: "Your account was temporarily locked after repeated failed login attempts.",
                emailTemplate: new SecurityAlertEmail({
                    recipientName: user.firstName ?? user.username,
                    event: "Your account was temporarily locked after repeated failed login attempts.",
                    occurredAt: new Date().toISOString(),
                    ipAddress: event.ipAddress ?? undefined,
                }),
            });
        } catch (error) {
            this.logger.error("Failed to dispatch SECURITY_ALERT notification", error, {
                identifier: event.identifier,
            });
        }
    }
}
