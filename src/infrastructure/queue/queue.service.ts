import { getQueueToken } from "@nestjs/bullmq";
import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { Job, Queue } from "bullmq";

import { LoggingService } from "@infra/logging";

import { QUEUE_NAMES, QueueName } from "./constants";
import { BaseJob } from "./jobs/base-job";

/**
 * Main service for queue operations.
 * Handles job dispatch, queue lifecycle, and monitoring.
 */
@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
    private readonly queues: Map<string, Queue> = new Map();

    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly logger: LoggingService,
    ) {
        this.logger.setContext(QueueService.name);
    }

    onModuleInit(): void {
        const failed: string[] = [];

        for (const queueName of Object.values(QUEUE_NAMES)) {
            try {
                const queue = this.moduleRef.get<Queue>(getQueueToken(queueName), {
                    strict: false,
                });

                this.queues.set(queueName, queue);

                this.setupQueueListeners(queue, queueName);
            } catch (error) {
                failed.push(queueName);

                this.logger.error("Failed to initialize queue", error, {
                    queue: queueName,
                });
            }
        }

        this.logger.info("Queue service initialized", {
            queues: Array.from(this.queues.keys()),
            failed: failed.length > 0 ? failed : undefined,
        });
    }

    async onModuleDestroy(): Promise<void> {
        for (const [name, queue] of this.queues) {
            await queue.close();

            this.logger.debug("Queue closed", { queue: name });
        }

        this.queues.clear();

        this.logger.debug("Queue service destroyed");
    }

    /**
     * Add a validated job to a queue.
     */
    async addJob<T extends BaseJob>(job: T): Promise<string> {
        const queue = this.getQueue(job.queueName);

        const bullJob = await queue.add(job.jobName, job.data, {
            ...job.options,
            jobId: job.data.jobId,
        });

        return bullJob.id as string;
    }

    /**
     * Check if the queue connection is available, used by the health check.
     */
    async isAvailable(): Promise<boolean> {
        const queue = this.queues.values().next().value;

        if (!queue) return false;

        try {
            await queue.client;

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get all registered queues.
     */
    getAllQueues(): Queue[] {
        return Array.from(this.queues.values());
    }

    /**
     * Get a single queue by name.
     */
    getQueue(queueName: string): Queue {
        const queue = this.queues.get(queueName);

        if (!queue) {
            throw new Error(`Queue not found: ${queueName}`);
        }

        return queue;
    }

    /**
     * Pause a queue.
     */
    async pauseQueue(queueName: string): Promise<void> {
        const queue = this.getQueue(queueName);
        await queue.pause();
    }

    /**
     * Resume a queue.
     */
    async resumeQueue(queueName: string): Promise<void> {
        const queue = this.getQueue(queueName);
        await queue.resume();
    }

    /**
     * Get job details and counts for a specific queue.
     */
    async getJobCounts(queueName: QueueName): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }> {
        const queue = this.getQueue(queueName);
        const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");

        return {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
        };
    }

    /**
     * Get a specific job by ID.
     */
    async getJob(queueName: QueueName, jobId: string): Promise<Job | undefined> {
        const queue = this.getQueue(queueName);

        return queue.getJob(jobId);
    }

    /**
     * Remove a job by ID.
     */
    async removeJob(queueName: QueueName, jobId: string): Promise<void> {
        const job = await this.getJob(queueName, jobId);

        if (job) {
            await job.remove();

            this.logger.debug("Job removed", { queue: queueName, jobId });
        }
    }

    /**
     * List all repeatable jobs across all queues.
     */
    async listAllRepeatable(): Promise<
        Array<{
            queue: string;
            schedulers: Awaited<ReturnType<Queue["getJobSchedulers"]>>;
        }>
    > {
        const queueNames = Object.values(QUEUE_NAMES);

        return Promise.all(
            queueNames.map(async (queueName) => {
                const queue = this.getQueue(queueName);

                return { queue: queueName, schedulers: await queue.getJobSchedulers() };
            }),
        );
    }

    /**
     * List repeatable jobs for a specific queue.
     */
    async listQueueRepeatable(queueName: QueueName) {
        const queue = this.getQueue(queueName);

        return queue.getJobSchedulers();
    }

    /**
     * Remove a repeatable job by its ID.
     */
    async removeRepeatable(queueName: QueueName, schedulerId: string): Promise<void> {
        const queue = this.getQueue(queueName);

        await queue.removeJobScheduler(schedulerId);

        this.logger.debug("Repeatable job removed", {
            queue: queueName,
            schedulerId,
        });
    }

    /**
     * Clean old jobs from a queue.
     */
    async cleanJobs(
        queueName: QueueName,
        grace: number,
        status: "completed" | "failed" | "delayed" | "wait",
        limit: number = 1000,
    ): Promise<string[]> {
        const queue = this.getQueue(queueName);
        const removed = await queue.clean(grace, limit, status);

        this.logger.debug("Jobs cleaned", {
            queue: queueName,
            status,
            removed: removed.length,
        });

        return removed;
    }

    /**
     * Set up queue event listeners for monitoring.
     */
    private setupQueueListeners(queue: Queue, queueName: string): void {
        queue.on("error", (error) => {
            this.logger.error(`Queue error`, error, { queue: queueName });
        });

        queue.on("paused", () => {
            this.logger.info("Queue paused", { queue: queueName });
        });

        queue.on("resumed", () => {
            this.logger.info("Queue resumed", { queue: queueName });
        });
    }
}
