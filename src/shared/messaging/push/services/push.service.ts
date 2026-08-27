import { Injectable } from "@nestjs/common";

import { ConfigService } from "@config";
import { FcmProvider } from "@infra/communication";
import { LoggingService } from "@infra/logging";

import { PushProducer } from "../producers/push.producer";

export interface PushSendOptions {
    imageUrl?: string;
    dryRun?: boolean;
}

@Injectable()
export class PushService {
    private readonly devMode: boolean;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly fcmProvider: FcmProvider,
        private readonly pushProducer: PushProducer,
    ) {
        this.logger.setContext(PushService.name);

        this.devMode = this.config.communication.devMode;
    }

    /**
     * Send an immediate push notification to a list of tokens.
     */
    async sendToTokens(
        tokens: string[],
        title: string,
        body: string,
        data?: Record<string, string>,
        options?: PushSendOptions,
    ): Promise<{ success: number; failure: number }> {
        if (this.devMode) {
            this.logger.info("Push sent in immediate dev mode", {
                tokenCount: tokens.length,
                title,
                body,
                imageUrl: options?.imageUrl,
                data,
            });

            return { success: tokens.length, failure: 0 };
        }

        if (!this.fcmProvider.isAvailable()) {
            this.logger.warn("FCM not available. Push not sent");

            return { success: 0, failure: tokens.length };
        }

        const payload = this.buildPayload(title, body, data, options?.imageUrl);

        const result = await this.fcmProvider.sendToTokens(tokens, payload, options?.dryRun);

        return { success: result.successCount, failure: result.failureCount };
    }

    /**
     * Send an immediate push notification to a topic.
     */
    async sendToTopic(
        topic: string,
        title: string,
        body: string,
        data?: Record<string, string>,
        options?: PushSendOptions,
    ): Promise<void> {
        if (this.devMode) {
            this.logger.info("Push topic sent in immediate dev mode", {
                topic,
                title,
                body,
            });

            return;
        }

        if (!this.fcmProvider.isAvailable()) {
            this.logger.warn("FCM not available. Topic push not sent");

            return;
        }

        const payload = this.buildPayload(title, body, data, options?.imageUrl);

        await this.fcmProvider.sendToTopic(topic, payload, options?.dryRun);
    }

    /**
     * Send an immediate push notification to a condition.
     */
    async sendToCondition(
        condition: string,
        title: string,
        body: string,
        data?: Record<string, string>,
        options?: PushSendOptions,
    ): Promise<void> {
        if (this.devMode) {
            this.logger.info("Push condition sent in immediate dev mode", {
                condition,
                title,
                body,
            });

            return;
        }

        if (!this.fcmProvider.isAvailable()) {
            this.logger.warn("FCM not available. Condition push not sent");

            return;
        }

        const payload = this.buildPayload(title, body, data, options?.imageUrl);

        await this.fcmProvider.sendToCondition(condition, payload, options?.dryRun);
    }

    /**
     * Queue a push notification for async delivery.
     */
    async queueToTokens(
        tokens: string[],
        title: string,
        body: string,
        data?: Record<string, string>,
        options?: PushSendOptions,
    ): Promise<string> {
        return this.pushProducer.produce({
            tokens,
            title,
            body,
            data: { ...data, sentAt: new Date().toISOString() },
            imageUrl: options?.imageUrl,
            dryRun: options?.dryRun,
        });
    }

    /**
     * Build the FCM payload.
     */
    private buildPayload(title?: string, body?: string, data?: Record<string, string>, imageUrl?: string) {
        return {
            notification: title || body ? { title, body, imageUrl } : undefined,
            data: { ...data, sentAt: new Date().toISOString() },
            android: {
                notification: { channelId: "default" },
                priority: "high" as const,
            },
            apns: undefined,
            webpush: undefined,
        };
    }
}
