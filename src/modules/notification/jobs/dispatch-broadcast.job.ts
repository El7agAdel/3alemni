import { JobsOptions } from "bullmq";

import { BaseJob, JOB_NAMES, QUEUE_NAMES } from "@infra/queue";

import { DispatchBroadcastJobData } from "./broadcast-job-data.interface";

export class DispatchBroadcastJob extends BaseJob<DispatchBroadcastJobData> {
    readonly queueName = QUEUE_NAMES.BROADCAST;
    readonly jobName = JOB_NAMES.BROADCAST.DISPATCH;

    constructor(data: DispatchBroadcastJobData, options?: JobsOptions) {
        super(data, options);
    }

    protected validateSpecific(): boolean {
        return !!this.data.broadcastId;
    }

    protected getSpecificValidationErrors(): string[] {
        return this.data.broadcastId ? [] : ["Broadcast Id is required"];
    }
}
