import { Injectable } from "@nestjs/common";
import { JobsOptions } from "bullmq";

import { LoggingService } from "@infra/logging";

import { BaseJobData } from "../interfaces";
import { BaseJob } from "../jobs/base-job";
import { QueueService } from "../queue.service";

/**
 * Abstract base class for all job producers.
 * All producers extend this base class to handle enqueueing, validation, and logging.
 * Any class extending this should provide a generic type that extends BaseJobData.
 */
@Injectable()
export abstract class BaseProducer<T extends BaseJobData = BaseJobData> {
    protected constructor(
        protected readonly logger: LoggingService,
        protected readonly queueService: QueueService,
    ) {
        this.logger.setContext(this.getProducerName());
    }

    /**
     * Get the producer name.
     */
    protected abstract getProducerName(): string;

    /**
     * Create a job instance from data.
     */
    protected abstract createJob(data: T, options?: JobsOptions): BaseJob<T>;

    /**
     * Enqueue a job immediately.
     */
    async produce(data: T, options?: JobsOptions): Promise<string> {
        const jobId = await this.enqueueJob(data, options);

        this.logger.debug("Job enqueued", {
            jobId,
            producer: this.getProducerName(),
        });

        return jobId;
    }

    /**
     * Enqueue multiple jobs.
     */
    async produceBatch(items: T[], options?: JobsOptions): Promise<string[]> {
        const jobIds = await Promise.all(items.map((data) => this.enqueueJob(data, options)));

        this.logger.debug("Batch enqueued", {
            count: jobIds.length,
            producer: this.getProducerName(),
        });

        return jobIds;
    }

    /**
     * Enqueue a job with a delay in milliseconds for later execution.
     */
    async produceDelayed(data: T, delayMs: number, options?: JobsOptions): Promise<string> {
        return this.produce(data, { ...options, delay: delayMs });
    }

    /**
     * Schedule a recurring job with a cron pattern.
     */
    async produceRecurring(data: T, pattern: string, options?: JobsOptions): Promise<string> {
        const jobId = await this.enqueueJob(data, {
            ...options,
            repeat: { pattern },
        });

        this.logger.info("Recurring job scheduled", {
            jobId,
            producer: this.getProducerName(),
            pattern,
        });

        return jobId;
    }

    /**
     * Schedule a recurring job at fixed intervals.
     */
    async produceRecurringEvery(data: T, intervalMs: number, options?: JobsOptions): Promise<string> {
        const jobId = await this.enqueueJob(data, {
            ...options,
            repeat: { every: intervalMs },
        });

        this.logger.info("Recurring job scheduled", {
            jobId,
            producer: this.getProducerName(),
            every: intervalMs,
        });

        return jobId;
    }

    /**
     * Validates and adds a job to the queue.
     */
    private async enqueueJob(data: T, options?: JobsOptions): Promise<string> {
        const job = this.createJob(data, options);

        if (!job.validate()) {
            const errors = job.getValidationErrors();
            throw new Error(`Job validation failed: ${errors.join(", ")}`);
        }

        return this.queueService.addJob(job);
    }
}
