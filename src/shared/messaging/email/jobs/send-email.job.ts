import { JobsOptions } from "bullmq";

import { BaseJob, JOB_NAMES, QUEUE_NAMES } from "@infra/queue";

import { EmailJobData } from "./email-job-data.interface";

export class SendEmailJob extends BaseJob<EmailJobData> {
    readonly queueName = QUEUE_NAMES.EMAIL;
    readonly jobName = JOB_NAMES.EMAIL.SEND_EMAIL;

    constructor(data: EmailJobData, options?: JobsOptions) {
        super(data, options);
    }

    protected validateSpecific(): boolean {
        return !!this.data.to && !!this.data.templateName && !!this.data.context;
    }

    protected getSpecificValidationErrors(): string[] {
        const errors: string[] = [];

        if (!this.data.to) errors.push("Email recipient is required");
        if (!this.data.templateName) errors.push("Template name is required");
        if (!this.data.context) errors.push("Email context is required");

        return errors;
    }
}
