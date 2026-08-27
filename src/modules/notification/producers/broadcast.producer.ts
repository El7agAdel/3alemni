import { Injectable } from "@nestjs/common";
import { JobsOptions } from "bullmq";

import { LoggingService } from "@infra/logging";
import { BaseProducer, QueueService } from "@infra/queue";

import { DispatchBroadcastJob, DispatchBroadcastJobData } from "../jobs";

@Injectable()
export class BroadcastProducer extends BaseProducer<DispatchBroadcastJobData> {
    constructor(logger: LoggingService, queueService: QueueService) {
        super(logger, queueService);
    }

    protected getProducerName(): string {
        return BroadcastProducer.name;
    }

    protected createJob(data: DispatchBroadcastJobData, options?: JobsOptions): DispatchBroadcastJob {
        return new DispatchBroadcastJob(data, options);
    }
}
