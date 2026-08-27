import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";

import { GlobalExceptionFilter } from "./filters";
import { ResponseInterceptor } from "./interceptors";
import { RequestContextMiddleware } from "./middlewares";
import { ValidationPipe } from "./pipes";
import { RequestContextService } from "./services";

@Global()
@Module({
    imports: [],
    providers: [
        // Services
        RequestContextService,

        // Global filters
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },

        // Global interceptor
        { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },

        // Global pipes
        { provide: APP_PIPE, useClass: ValidationPipe },
    ],
    exports: [RequestContextService],
})
export class CommonModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestContextMiddleware).forRoutes("*path");
    }
}
