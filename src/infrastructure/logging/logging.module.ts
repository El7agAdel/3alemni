import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";

import { ConfigService } from "@config";

import { LoggingInterceptor } from "./interceptors/logging.interceptor";
import { LoggingService } from "./logging.service";
import { setupPino } from "./pino.config";

@Global()
@Module({
    imports: [
        PinoLoggerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => setupPino(config),
        }),
    ],
    providers: [
        LoggingService,
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
    ],
    exports: [LoggingService],
})
export class LoggingModule {}
