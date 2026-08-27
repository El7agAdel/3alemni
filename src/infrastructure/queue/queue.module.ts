import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";

import { ConfigService } from "@config";

import { BullBoardModule } from "./bull-board";
import { QUEUE_NAMES } from "./constants";
import { QueueService } from "./queue.service";

@Global()
@Module({
    imports: [
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const queueConfig = config.queue;

                return {
                    connection: {
                        host: queueConfig.redis.host,
                        port: queueConfig.redis.port,
                        password: queueConfig.redis.password,
                        db: queueConfig.redis.db,
                        enableReadyCheck: true,
                    },
                    defaultJobOptions: {
                        attempts: queueConfig.job.attempts,
                        backoff: queueConfig.job.backoff,
                        removeOnComplete: queueConfig.job.removeOnComplete,
                        removeOnFail: queueConfig.job.removeOnFail,
                    },
                };
            },
        }),
        BullModule.registerQueue(...Object.values(QUEUE_NAMES).map((name) => ({ name }))),
        BullBoardModule,
    ],
    providers: [QueueService],
    exports: [QueueService],
})
export class QueueModule {}
