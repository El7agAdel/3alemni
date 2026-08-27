import { Injectable } from "@nestjs/common";

import { ConfigService } from "@config";
import { EmailProvider } from "@infra/communication";
import { LoggingService } from "@infra/logging";

import { EmailProducer } from "../producers/email.producer";
import { BaseEmail } from "../templates";

import { EmailRendererService } from "./email-renderer.service";

@Injectable()
export class EmailService {
    private readonly devMode: boolean;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly emailProvider: EmailProvider,
        private readonly emailRenderer: EmailRendererService,
        private readonly emailProducer: EmailProducer,
    ) {
        this.logger.setContext(EmailService.name);

        this.devMode = this.config.communication.devMode;
    }

    /**
     * Send an email immediately.
     */
    async send(to: string | string[], email: BaseEmail): Promise<void> {
        const html = this.emailRenderer.render(email.templateName, email.getContext());

        const recipients = Array.isArray(to) ? to : [to];

        if (this.devMode) {
            this.logger.info("Email sent in immediate dev mode", {
                to: recipients,
                subject: email.subject,
                template: email.templateName,
                context: email.getContext(),
            });

            return;
        }

        await this.emailProvider.send({
            to: recipients,
            subject: email.subject,
            html,
            from: email.from,
            attachments: email.attachments,
        });
    }

    /**
     * Queue an email for async delivery.
     */
    async queue(to: string | string[], email: BaseEmail): Promise<string> {
        return this.emailProducer.produce({
            to,
            templateName: email.templateName,
            context: email.getContext() as Record<string, unknown>,
            subject: email.subject,
            from: email.from,
            attachments: email.attachments?.map((file) => ({
                ...file,
                content: typeof file.content === "string" ? file.content : file.content.toString("base64"),
            })),
        });
    }

    /**
     * Queue an email to many recipients with the same template.
     * Each recipient gets its own queued job since providers don't bulk-send email.
     */
    async queueBulk(recipients: string[], email: BaseEmail): Promise<void> {
        if (recipients.length === 0) return;

        for (const recipient of recipients) {
            await this.queue(recipient, email);
        }
    }
}
