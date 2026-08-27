import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import { ConfigService } from "@config";
import { WhatsAppProvider } from "@infra/communication";
import { LoggingService } from "@infra/logging";
import { QUEUE_NAMES } from "@infra/queue";

import { WhatsAppJobData } from "../jobs";
import { WhatsAppFactory } from "../whatsapp.factory";

@Processor(QUEUE_NAMES.WHATSAPP, { concurrency: 5 })
export class WhatsAppProcessor extends WorkerHost {
    private readonly devMode: boolean;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly whatsappProvider: WhatsAppProvider,
        private readonly whatsappFactory: WhatsAppFactory,
    ) {
        super();

        this.logger.setContext(WhatsAppProcessor.name);

        this.devMode = this.config.communication.devMode;
    }

    async process(job: Job<WhatsAppJobData>): Promise<void> {
        const { phoneNumber, templateName, context, hasButton, languageCode } = job.data;

        this.logger.debug("Processing WhatsApp job", {
            jobId: job.id,
            template: templateName,
        });

        if (!this.config.communication.whatsapp.enabled) {
            this.logger.warn("WhatsApp is disabled, skipping job", {
                jobId: job.id,
                template: templateName,
            });

            return;
        }

        try {
            const template = this.whatsappFactory.create(templateName, context);

            if (this.devMode) {
                this.logger.info("WhatsApp message sent in queued dev mode", {
                    jobId: job.id,
                    to: phoneNumber,
                    template: template.templateName,
                    context: template.getContext(),
                    languageCode,
                });

                return;
            }

            await this.whatsappProvider.sendTemplate(
                phoneNumber,
                template.templateName,
                template.getContext(),
                hasButton,
                languageCode,
            );

            this.logger.info("WhatsApp message sent", {
                jobId: job.id,
                template: templateName,
            });
        } catch (error) {
            this.logger.error("WhatsApp job failed", error, { jobId: job.id });

            throw error;
        }
    }

    @OnWorkerEvent("completed")
    onCompleted(job: Job<WhatsAppJobData>): void {
        this.logger.debug("WhatsApp job completed", { jobId: job.id });
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job<WhatsAppJobData>, error: Error): void {
        this.logger.error("WhatsApp job failed permanently", error, {
            jobId: job.id,
            attempts: job.attemptsMade,
        });
    }
}
