import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { getQueueToken } from "@nestjs/bullmq";
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { Queue } from "bullmq";
import { Router } from "express";
import basicAuth from "express-basic-auth";

import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";

import { QUEUE_NAMES } from "../constants";

@Injectable()
export class BullBoardService implements OnApplicationBootstrap {
    private readonly serverAdapter: ExpressAdapter;

    constructor(
        private readonly moduleRef: ModuleRef,
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
    ) {
        this.logger.setContext(BullBoardService.name);

        this.serverAdapter = new ExpressAdapter();
    }

    onApplicationBootstrap() {
        const boardConfig = this.config.queue.bullBoard;

        if (!boardConfig.enabled) return;

        this.serverAdapter.setBasePath(`/${boardConfig.path}`);

        const queues = this.discoverQueues();

        if (queues.length === 0) return;

        if (boardConfig.authEnabled) this.configureAuthentication(boardConfig.username, boardConfig.password);

        createBullBoard({
            queues: queues.map((queue) => new BullMQAdapter(queue)),
            serverAdapter: this.serverAdapter,
        });
    }

    /**
     * Check if Bull Board is enabled.
     */
    isEnabled(): boolean {
        return this.config.queue.bullBoard.enabled;
    }

    /**
     * Get Bull Board routing path.
     */
    getPath(): string {
        return this.config.queue.bullBoard.path;
    }

    /**
     * Get the Express router for mounting.
     */
    getRouter(): Router | null {
        if (!this.isEnabled()) return null;

        return this.serverAdapter.getRouter() as Router;
    }

    /**
     * Discover all available queues to register with Bull Board.
     * Must be registered on initialization.
     */
    private discoverQueues(): Queue[] {
        const queues: Queue[] = [];

        for (const queueName of Object.values(QUEUE_NAMES)) {
            try {
                const queue = this.moduleRef.get<Queue>(getQueueToken(queueName), {
                    strict: false,
                });

                if (queue) queues.push(queue);
            } catch {
                this.logger.warn(`Could not find queue: ${queueName}`);
            }
        }

        return queues;
    }

    /**
     * Configure basic authentication for Bull Board.
     */
    private configureAuthentication(username: string, password: string): void {
        const router = this.serverAdapter.getRouter() as Router;

        router.use(
            basicAuth({
                users: { [username]: password },
                challenge: true,
                realm: `${this.config.app.name} Queue Dashboard`,
                unauthorizedResponse: (req: basicAuth.IBasicAuthedRequest) => {
                    return req.auth ? "Invalid credentials" : "Authentication required";
                },
            }),
        );
    }
}
