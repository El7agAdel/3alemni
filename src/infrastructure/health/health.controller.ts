import { Controller, Get, HttpException, HttpStatus, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { Public, ResponseMessage } from "@common/decorators";
import { CacheService } from "@infra/cache";
import { PrismaService } from "@infra/database";
import { QueueService } from "@infra/queue";

interface DependencyCheck {
    status: "up" | "down";
}

@Public()
@ApiTags("Health")
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: CacheService,
        private readonly queue: QueueService,
    ) {}

    @Get()
    @ApiOperation({ summary: "Application health check" })
    @ResponseMessage("Health check completed successfully")
    async check() {
        const [database, cache, queue] = await Promise.all([
            this.checkDatabase(),
            Promise.resolve(this.checkCache()),
            this.checkQueue(),
        ]);

        const checks = { database, cache, queue };
        const isHealthy = Object.values(checks).every((check) => check.status === "up");

        const body = {
            status: isHealthy ? "ok" : "degraded",
            timestamp: new Date().toISOString(),
            uptime: Math.round(process.uptime()),
            checks,
        };

        if (!isHealthy) {
            throw new HttpException(
                { message: "One or more dependencies are unavailable", ...body },
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        return body;
    }

    private async checkDatabase(): Promise<DependencyCheck> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;

            return { status: "up" };
        } catch {
            return { status: "down" };
        }
    }

    private checkCache(): DependencyCheck {
        return { status: this.cache.isAvailable() ? "up" : "down" };
    }

    private async checkQueue(): Promise<DependencyCheck> {
        const available = await this.queue.isAvailable();

        return { status: available ? "up" : "down" };
    }
}
