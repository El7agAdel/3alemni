import { Injectable, OnModuleInit } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";

import { SendEmailOptions } from "../interfaces/communication.interfaces";

@Injectable()
export class EmailProvider implements OnModuleInit {
    private transporters: Array<{
        transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
        account: {
            user: string;
            fromAddress: string;
            fromName?: string;
        };
    }> = [];

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
    ) {
        this.logger.setContext(EmailProvider.name);
    }

    async onModuleInit(): Promise<void> {
        const { accounts } = this.config.communication.mailer;

        if (accounts.length === 0) {
            this.logger.warn("No SMTP accounts configured");

            return;
        }

        for (const account of accounts) {
            const transporter = nodemailer.createTransport({
                host: account.host,
                port: account.port,
                secure: account.secure,
                auth: { user: account.user, pass: account.password },
            });

            try {
                await transporter.verify();
                this.transporters.push({ transporter, account });
            } catch (error) {
                this.logger.error("SMTP account connection failed", error, {
                    host: account.host,
                });
            }
        }

        this.logger.info("EmailProvider initialized", {
            accounts: this.transporters.length,
        });
    }

    /**
     * Send an email via SMTP.
     */
    async send(options: SendEmailOptions): Promise<void> {
        if (this.transporters.length === 0) throw new Error("No SMTP transporters available");

        // Get a random transporter for load distribution
        const index = Math.floor(Math.random() * this.transporters.length);
        const { transporter, account } = this.transporters[index];

        const from =
            options.from || (account.fromName ? `"${account.fromName}" <${account.fromAddress}>` : account.fromAddress);
        const recipients = Array.isArray(options.to) ? options.to : [options.to];

        try {
            const result = await transporter.sendMail({
                from,
                to: recipients.join(", "),
                subject: options.subject,
                html: options.html,
                attachments: options.attachments?.map((attachment) => ({
                    filename: attachment.filename,
                    content: attachment.content,
                    contentType: attachment.contentType,
                })),
            });

            this.logger.info("Email sent", {
                messageId: result.messageId,
                to: recipients,
                subject: options.subject,
                account: account.fromAddress,
            });
        } catch (error) {
            this.logger.error("Email send failed", error, {
                to: recipients,
                subject: options.subject,
                account: account.fromAddress,
            });

            throw error;
        }
    }
}
