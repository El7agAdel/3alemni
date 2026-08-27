import { Injectable } from "@nestjs/common";

import { ConfigService } from "@config";
import { WhatsAppProvider } from "@infra/communication";
import { LoggingService } from "@infra/logging";

import { WhatsAppProducer } from "../producers/whatsapp.producer";
import { BaseTemplate } from "../templates";

@Injectable()
export class WhatsAppService {
    private readonly devMode: boolean;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly whatsappProvider: WhatsAppProvider,
        private readonly whatsappProducer: WhatsAppProducer,
    ) {
        this.logger.setContext(WhatsAppService.name);

        this.devMode = this.config.communication.devMode;
    }

    /**
     * Send a WhatsApp template message immediately.
     * Logs and skips (does not throw) when WhatsApp is disabled, since it's an optional channel.
     */
    async send(phoneNumber: string, template: BaseTemplate, languageCode?: string): Promise<void> {
        if (!this.config.communication.whatsapp.enabled) {
            this.logger.warn("WhatsApp is disabled, skipping send", {
                to: phoneNumber,
                template: template.templateName,
            });

            return;
        }

        if (this.devMode) {
            this.logger.info("WhatsApp message sent in immediate dev mode", {
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
            template.hasButton,
            languageCode,
        );
    }

    /**
     * Queue a WhatsApp template message for async delivery.
     * Logs and skips (does not throw) when WhatsApp is disabled.
     */
    async queue(phoneNumber: string, template: BaseTemplate, languageCode?: string): Promise<string | null> {
        if (!this.config.communication.whatsapp.enabled) {
            this.logger.warn("WhatsApp is disabled, skipping queue", {
                to: phoneNumber,
                template: template.templateName,
            });

            return null;
        }

        return this.whatsappProducer.produce({
            phoneNumber,
            templateName: template.templateName,
            context: template.getContext(),
            hasButton: template.hasButton,
            languageCode,
        });
    }

    /**
     * Queue a WhatsApp template to many phone numbers.
     * Each recipient gets its own queued job.
     */
    async queueBulk(recipients: string[], template: BaseTemplate, languageCode?: string): Promise<void> {
        if (recipients.length === 0) return;

        for (const recipient of recipients) {
            await this.queue(recipient, template, languageCode);
        }
    }
}
