import { Injectable } from "@nestjs/common";
import { JobsOptions } from "bullmq";

import { LoggingService } from "@infra/logging";
import { BaseProducer, QueueService } from "@infra/queue";

import { PushJobData, SendPushJob } from "../jobs";

@Injectable()
export class PushProducer extends BaseProducer<PushJobData> {
    constructor(logger: LoggingService, queueService: QueueService) {
        super(logger, queueService);
    }

    protected getProducerName(): string {
        return PushProducer.name;
    }

    protected createJob(data: PushJobData, options?: JobsOptions): SendPushJob {
        return new SendPushJob(data, options);
    }
}
