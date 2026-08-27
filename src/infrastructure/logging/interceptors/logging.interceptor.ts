import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { ExtendedRequest } from "@common/interfaces";
import { RequestContextService } from "@common/services";

import { LoggingService } from "../logging.service";

/**
 * Intercepts all HTTP requests to log successful responses.
 * Errors are handled separately by the global exception filter.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    constructor(
        private readonly logger: LoggingService,
        private readonly contextService: RequestContextService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest<ExtendedRequest>();
        const response = context.switchToHttp().getResponse<Response>();

        return next.handle().pipe(
            tap(() => {
                const { method, url } = request;
                const { statusCode } = response;

                const startTime = this.contextService.get("startTime") ?? request.startTime;
                const duration = Math.round(performance.now() - startTime);

                this.logger.logHttpRequest({ method, path: url, statusCode, duration });
            }),
        );
    }
}
