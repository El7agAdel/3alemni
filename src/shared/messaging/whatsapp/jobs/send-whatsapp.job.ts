import { JobsOptions } from "bullmq";

import { BaseJob, JOB_NAMES, QUEUE_NAMES } from "@infra/queue";

import { WhatsAppJobData } from "./whatsapp-job-data.interface";

export class SendWhatsAppJob extends BaseJob<WhatsAppJobData> {
    readonly queueName = QUEUE_NAMES.WHATSAPP;
    readonly jobName = JOB_NAMES.WHATSAPP.SEND_TEMPLATE;

    constructor(data: WhatsAppJobData, options?: JobsOptions) {
        super(data, options);
    }

    protected validateSpecific(): boolean {
        return !!this.data.phoneNumber && !!this.data.templateName && !!this.data.context;
    }

    protected getSpecificValidationErrors(): string[] {
        const errors: string[] = [];

        if (!this.data.phoneNumber) errors.push("Phone number is required");
        if (!this.data.templateName) errors.push("Template name is required");
        if (!this.data.context) errors.push("Template context is required");

        return errors;
    }
}
