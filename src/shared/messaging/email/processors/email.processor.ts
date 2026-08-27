import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";

import { ConfigService } from "@config";
import { EmailProvider } from "@infra/communication";
import { LoggingService } from "@infra/logging";
import { QUEUE_NAMES } from "@infra/queue";

import { EmailFactory } from "../email.factory";
import { EmailJobData } from "../jobs";
import { EmailRendererService } from "../services";

@Processor(QUEUE_NAMES.EMAIL, {
    concurrency: 5,
    limiter: { max: 100, duration: 60000 },
})
export class EmailProcessor extends WorkerHost {
    private readonly devMode: boolean;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly emailProvider: EmailProvider,
        private readonly emailRenderer: EmailRendererService,
        private readonly emailFactory: EmailFactory,
    ) {
        super();

        this.logger.setContext(EmailProcessor.name);

        this.devMode = this.config.communication.devMode;
    }

    async process(job: Job<EmailJobData>): Promise<void> {
        const { to, templateName, context, subject, from, attachments } = job.data;

        this.logger.debug("Processing email job", {
            jobId: job.id,
            template: templateName,
            to,
        });

        try {
            const email = this.emailFactory.create(templateName, context);

            const html = this.emailRenderer.render(templateName, context);

            const resolvedSubject = subject || email.subject;

            if (this.devMode) {
                this.logger.info("Email sent in queued dev mode", {
                    jobId: job.id,
                    to,
                    subject: resolvedSubject,
                    template: templateName,
                    context,
                });

                return;
            }

            await this.emailProvider.send({
                to,
                subject: resolvedSubject,
                html,
                from,
                attachments: attachments?.map((file) => ({
                    ...file,
                    content: Buffer.from(file.content, "base64"),
                })),
            });

            this.logger.info("Email sent successfully", {
                jobId: job.id,
                template: templateName,
                to,
            });
        } catch (error) {
            this.logger.error("Email job failed", error, {
                jobId: job.id,
                template: templateName,
                to,
            });

            throw error;
        }
    }

    @OnWorkerEvent("completed")
    onCompleted(job: Job<EmailJobData>): void {
        this.logger.debug("Email job completed", { jobId: job.id });
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job<EmailJobData>, error: Error): void {
        this.logger.error("Email job failed permanently", error, {
            jobId: job.id,
            attempts: job.attemptsMade,
        });
    }
}
