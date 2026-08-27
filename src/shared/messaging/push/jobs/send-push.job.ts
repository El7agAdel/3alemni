import { JobsOptions } from "bullmq";

import { BaseJob, JOB_NAMES, QUEUE_NAMES } from "@infra/queue";

import { PushJobData } from "./push-job-data.interface";

export class SendPushJob extends BaseJob<PushJobData> {
    readonly queueName = QUEUE_NAMES.PUSH;
    readonly jobName = JOB_NAMES.PUSH.SEND_PUSH;

    constructor(data: PushJobData, options?: JobsOptions) {
        super(data, options);
    }

    protected validateSpecific(): boolean {
        return this.data.tokens?.length > 0 && !!this.data.title && !!this.data.body;
    }

    protected getSpecificValidationErrors(): string[] {
        const errors: string[] = [];

        if (!this.data.tokens?.length) errors.push("Tokens are required");
        if (!this.data.title) errors.push("Title is required");
        if (!this.data.body) errors.push("Body is required");

        return errors;
    }
}
