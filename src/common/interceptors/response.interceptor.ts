import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { map, Observable } from "rxjs";

import { RESPONSE_MESSAGE_KEY, SKIP_TRANSFORM_KEY } from "../decorators";
import { ExtendedRequest } from "../interfaces";

/**
 * Transforms all successful responses into a consistent format.
 * Auto-detects paginated responses and restructures them.
 * Can be customized via @ResponseMessage or skipped entirely via @SkipTransform.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
        const skipTransform = this.reflector.get<boolean>(SKIP_TRANSFORM_KEY, context.getHandler());

        if (skipTransform) return next.handle();

        const request = context.switchToHttp().getRequest<ExtendedRequest>();
        const customMessage = this.reflector.get<string>(RESPONSE_MESSAGE_KEY, context.getHandler());

        return next.handle().pipe(
            map((data) => {
                const requestId = request.requestId ?? request.headers["x-request-id"] ?? "unknown";
                const message = customMessage ?? this.getDefaultMessage(request.method);

                if (this.isPaginatedResult(data)) {
                    return {
                        success: true,
                        message,
                        data: data.items,
                        meta: data.meta,
                        path: request.url,
                        timestamp: new Date().toISOString(),
                        requestId,
                    };
                }

                return {
                    success: true,
                    message,
                    data: data,
                    path: request.url,
                    timestamp: new Date().toISOString(),
                    requestId,
                };
            }),
        );
    }

    /**
     * Get the default message based on the HTTP method.
     */
    private getDefaultMessage(method: string): string {
        switch (method.toUpperCase()) {
            case "GET":
                return "Data retrieved successfully";
            case "POST":
                return "Resource created successfully";
            case "PUT":
            case "PATCH":
                return "Resource updated successfully";
            case "DELETE":
                return "Resource deleted successfully";
            default:
                return "Operation completed successfully";
        }
    }

    /**
     * Check if data is a paginated result.
     */
    private isPaginatedResult(data: unknown): data is { items: unknown[]; meta: unknown } {
        return (
            typeof data === "object" &&
            data !== null &&
            "items" in data &&
            "meta" in data &&
            Array.isArray((data as { items: unknown[] }).items)
        );
    }
}
