import { Injectable } from "@nestjs/common";
import { JobsOptions } from "bullmq";

import { LoggingService } from "@infra/logging";
import { BaseProducer, QueueService } from "@infra/queue";

import { CleanupJob, CleanupJobData } from "./cleanup.job";

@Injectable()
export class CleanupProducer extends BaseProducer<CleanupJobData> {
    constructor(logger: LoggingService, queueService: QueueService) {
        super(logger, queueService);
    }

    protected getProducerName(): string {
        return CleanupProducer.name;
    }

    protected createJob(data: CleanupJobData, options?: JobsOptions): CleanupJob {
        return new CleanupJob(data, options);
    }
}
