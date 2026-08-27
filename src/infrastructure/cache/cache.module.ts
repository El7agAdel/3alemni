import { Global, Module } from "@nestjs/common";

import { CacheService, RedisService } from "./services";

@Global()
@Module({
    providers: [RedisService, CacheService],
    exports: [CacheService],
})
export class CacheModule {}
