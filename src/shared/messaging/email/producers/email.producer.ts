import { Injectable } from "@nestjs/common";
import { JobsOptions } from "bullmq";

import { LoggingService } from "@infra/logging";
import { BaseProducer, QueueService } from "@infra/queue";

import { EmailJobData, SendEmailJob } from "../jobs";

@Injectable()
export class EmailProducer extends BaseProducer<EmailJobData> {
    constructor(logger: LoggingService, queueService: QueueService) {
        super(logger, queueService);
    }

    protected getProducerName(): string {
        return EmailProducer.name;
    }

    protected createJob(data: EmailJobData, options?: JobsOptions): SendEmailJob {
        return new SendEmailJob(data, options);
    }
}
