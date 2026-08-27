import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule as NestThrottlerModule } from "@nestjs/throttler";

import { ConfigService } from "@config";

import { ThrottlerProxyGuard } from "./guards/throttler-proxy.guard";

@Module({
    imports: [
        NestThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                throttlers: [
                    {
                        ttl: config.security.throttler.ttl * 1000,
                        limit: config.security.throttler.limit,
                    },
                ],
            }),
        }),
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerProxyGuard,
        },
    ],
})
export class ThrottlerModule {}
