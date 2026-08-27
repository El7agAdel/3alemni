import { Injectable, OnModuleInit } from "@nestjs/common";
import * as admin from "firebase-admin";

import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";

import { FCM_BATCH_SIZE } from "../constants/fcm.constants";
import { FcmPayload, FcmSendResult } from "../interfaces/communication.interfaces";

@Injectable()
export class FcmProvider implements OnModuleInit {
    private initialized = false;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
    ) {
        this.logger.setContext(FcmProvider.name);
    }

    onModuleInit(): void {
        const { enabled, projectId, clientEmail, privateKey } = this.config.communication.fcm;

        if (!enabled) {
            this.logger.info("FCM is disabled, skipping initialization");
            return;
        }

        if (admin.apps.length > 0) {
            this.initialized = true;
            this.logger.debug("FCM already initialized, reusing existing app");
            return;
        }

        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });

            this.initialized = true;

            this.logger.info("FCM initialized", { projectId });
        } catch (error) {
            this.logger.error("FCM initialization failed", error, {
                projectId,
            });
        }
    }

    /**
     * Check if FCM is enabled and initialized.
     */
    isAvailable(): boolean {
        return this.initialized;
    }

    /**
     * Send push notification to multiple device tokens, in batches.
     */
    async sendToTokens(tokens: string[], payload: FcmPayload, dryRun = false): Promise<FcmSendResult> {
        if (!this.initialized) throw new Error("FCM not initialized");

        if (tokens.length <= FCM_BATCH_SIZE) {
            const result = await this.sendBatch(tokens, payload, dryRun);

            this.logger.debug("FCM send completed", {
                tokenCount: tokens.length,
                successCount: result.successCount,
                failureCount: result.failureCount,
                dryRun,
            });

            return result;
        }

        const allResponses: FcmSendResult["responses"] = [];
        let totalSuccess = 0;
        let totalFailure = 0;

        for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
            const batch = tokens.slice(i, i + FCM_BATCH_SIZE);
            const result = await this.sendBatch(batch, payload, dryRun);

            totalSuccess += result.successCount;
            totalFailure += result.failureCount;
            allResponses.push(...result.responses);
        }

        this.logger.debug("FCM multicast completed", {
            successCount: totalSuccess,
            failureCount: totalFailure,
            tokenCount: tokens.length,
            batches: Math.ceil(tokens.length / FCM_BATCH_SIZE),
            dryRun,
        });

        return {
            successCount: totalSuccess,
            failureCount: totalFailure,
            responses: allResponses,
        };
    }

    /**
     * Send a push notification to a certain topic.
     */
    async sendToTopic(topic: string, payload: FcmPayload, dryRun = false): Promise<string> {
        if (!this.initialized) throw new Error("FCM not initialized");

        const message: admin.messaging.Message = {
            topic,
            notification: payload.notification,
            data: payload.data,
            android: payload.android,
            apns: payload.apns as admin.messaging.ApnsConfig,
            webpush: payload.webpush,
        };

        const messageId = await admin.messaging().send(message, dryRun);

        this.logger.info("FCM topic message sent", { topic, messageId, dryRun });

        return messageId;
    }

    /**
     * Send a push notification to a condition inside a topic.
     */
    async sendToCondition(condition: string, payload: FcmPayload, dryRun = false): Promise<string> {
        if (!this.initialized) throw new Error("FCM not initialized");

        const message: admin.messaging.Message = {
            condition,
            notification: payload.notification,
            data: payload.data,
            android: payload.android,
            apns: payload.apns as admin.messaging.ApnsConfig,
            webpush: payload.webpush,
        };

        const messageId = await admin.messaging().send(message, dryRun);

        this.logger.info("FCM condition message sent", {
            condition,
            messageId,
            dryRun,
        });

        return messageId;
    }

    /**
     * Send a single batch. Can send up to 500 tokens.
     */
    private async sendBatch(tokens: string[], payload: FcmPayload, dryRun = false): Promise<FcmSendResult> {
        const message: admin.messaging.MulticastMessage = {
            tokens,
            notification: payload.notification,
            data: payload.data,
            android: payload.android,
            apns: payload.apns as admin.messaging.ApnsConfig,
            webpush: payload.webpush,
        };

        const response = await admin.messaging().sendEachForMulticast(message, dryRun);

        return {
            successCount: response.successCount,
            failureCount: response.failureCount,
            responses: response.responses.map((res) => ({
                success: res.success,
                messageId: res.messageId,
                error: res.error ? { code: res.error.code, message: res.error.message } : undefined,
            })),
        };
    }
}
