import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

import { ExtendedRequest } from "../interfaces";
import { RequestContextService } from "../services";

/**
 * Injects request context data so it's available throughout the request lifecycle.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
    constructor(private readonly contextService: RequestContextService) {}

    use(request: ExtendedRequest, response: Response, next: NextFunction): void {
        const requestId = this.getRequestId(request);
        const startTime = performance.now();
        const ip = this.getClientIp(request);
        const userAgent = (request.headers["user-agent"] || "unknown").substring(0, 500);

        request.requestId = requestId;
        request.startTime = startTime;
        request.clientIp = ip;
        request.userAgent = userAgent;

        response.setHeader("x-request-id", requestId);

        this.contextService.run({ requestId, startTime, ip, userAgent }, next);
    }

    /**
     * Extract requestId from headers or generate a new one.
     */
    private getRequestId(request: Request): string {
        const existingRequestId = request.headers["x-request-id"] || request.headers["x-correlation-id"];

        if (typeof existingRequestId === "string" && existingRequestId.length > 0) return existingRequestId;

        return this.generateRequestId();
    }

    /**
     * Generate a unique request ID.
     */
    private generateRequestId(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);

        return `req-${timestamp}-${random}`;
    }

    /**
     * Extract client IP and respect proxy headers.
     */
    private getClientIp(request: Request): string {
        const forwarded = request.headers["x-forwarded-for"];

        if (typeof forwarded === "string") {
            return forwarded.split(",")[0].trim();
        }

        return request.ip || request.socket?.remoteAddress || "unknown";
    }
}
