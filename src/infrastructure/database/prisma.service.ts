import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";

import { ConfigService } from "@config";
import { Prisma, PrismaClient } from "@generated/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(config: ConfigService) {
        const adapter = new PrismaPg({
            connectionString: config.database.url,
        });

        super({ adapter });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    runInTransaction<T>(
        fn: (tx: Prisma.TransactionClient) => Promise<T>,
        options?: {
            isolationLevel?: Prisma.TransactionIsolationLevel;
            maxWait?: number;
            timeout?: number;
        },
    ): Promise<T> {
        return this.$transaction(fn, options);
    }
}
