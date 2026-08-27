import { Injectable } from "@nestjs/common";
import { JobsOptions } from "bullmq";

import { LoggingService } from "@infra/logging";
import { BaseProducer, QueueService } from "@infra/queue";

import { SendWhatsAppJob, WhatsAppJobData } from "../jobs";

@Injectable()
export class WhatsAppProducer extends BaseProducer<WhatsAppJobData> {
    constructor(logger: LoggingService, queueService: QueueService) {
        super(logger, queueService);
    }

    protected getProducerName(): string {
        return WhatsAppProducer.name;
    }

    protected createJob(data: WhatsAppJobData, options?: JobsOptions): SendWhatsAppJob {
        return new SendWhatsAppJob(data, options);
    }
}
