import { Injectable, Scope } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";

import { RequestContextService } from "@common/services";
import { ConfigService } from "@config";

import {
    DatabaseQueryLogData,
    ExternalApiLogData,
    HttpLogData,
    JobLogData,
    LogError,
    PerformanceLogData,
    SecurityEventLogData,
} from "./interfaces/logging.interface";

@Injectable({ scope: Scope.TRANSIENT })
export class LoggingService {
    private context: string = "Application";

    constructor(
        private readonly pino: PinoLogger,
        private readonly requestContext: RequestContextService,
        private readonly config: ConfigService,
    ) {}

    /**
     * Set the context for the current logger instance.
     */
    setContext(context: string): void {
        this.context = context;
        this.pino.setContext(context);
    }

    debug(message: string, data?: Record<string, unknown>): void {
        this.pino.debug(this.buildLogObject(data), message);
    }

    info(message: string, data?: Record<string, unknown>): void {
        this.pino.info(this.buildLogObject(data), message);
    }

    warn(message: string, data?: Record<string, unknown>): void {
        this.pino.warn(this.buildLogObject(data), message);
    }

    error(message: string, error?: unknown, data?: Record<string, unknown>): void {
        this.pino.error(this.buildLogObject(data, error), message);
    }

    fatal(message: string, error?: unknown, data?: Record<string, unknown>): void {
        this.pino.fatal(this.buildLogObject(data, error), message);
    }

    /**
     * Log completed HTTP requests with the response if it went through.
     */
    logHttpRequest(data: HttpLogData): void {
        const { method, statusCode, path, duration } = data;
        const { httpLogging, slowRequestThreshold } = this.config.logger;

        if (!httpLogging) return;

        if (slowRequestThreshold > 0 && duration < slowRequestThreshold) return;

        const level = this.getHttpLogLevel(statusCode);
        const message = `${method} ${path} ${statusCode} - ${duration}ms`;

        this.pino[level](
            {
                ...this.getRequestContext(),
                context: "Http",
                request: { method, path },
                response: { statusCode, duration },
            },
            message,
        );
    }

    /**
     * Log HTTP error.
     * Warns at 4xx status code and errors at 5xx status code.
     */
    logHttpError(data: HttpLogData, error: Error): void {
        const { method, statusCode, path, duration } = data;

        const level = this.getHttpLogLevel(statusCode);
        const message = `${method} ${path} ${statusCode} - ${duration}ms`;

        this.pino[level](
            {
                ...this.getRequestContext(),
                context: "Http",
                request: { method, path },
                response: { statusCode, duration },
                error: this.formatError(error),
            },
            message,
        );
    }

    /**
     * Log security event.
     */
    logSecurityEvent(data: SecurityEventLogData): void {
        const level = data.severity === "critical" || data.severity === "high" ? "error" : "warn";
        const message = `Security event ${data.event}`;

        this.pino[level]({ ...this.getRequestContext(), context: "Security", data }, message);
    }

    /**
     * Log database query execution.
     */
    logDatabaseQuery(data: DatabaseQueryLogData): void {
        const level = data.duration > 1000 ? "warn" : "debug";
        const query = data.query.length > 500 ? `${data.query.substring(0, 500)}...` : data.query;
        const message = `Query executed in ${data.duration}ms`;

        this.pino[level](
            {
                ...this.getRequestContext(),
                context: "Database",
                data: { ...data, query },
            },
            message,
        );
    }

    /**
     * Log external API call.
     */
    logExternalApi(data: ExternalApiLogData): void {
        const level = this.getHttpLogLevel(data.statusCode);
        const message = `${data.service}: ${data.method} ${data.endpoint} ${data.statusCode} ${data.duration}ms`;

        this.pino[level]({ ...this.getRequestContext(), context: "ExternalApi", data }, message);
    }

    /**
     * Log performance metric.
     */
    logPerformance(data: PerformanceLogData): void {
        const threshold = data.threshold ?? 5000;
        const level = data.duration > threshold ? "warn" : "info";
        const message = `Performance of ${data.operation} completed in ${data.duration}ms`;

        this.pino[level]({ ...this.getRequestContext(), context: "Performance", data }, message);
    }

    /**
     * Log a background job with no request context since it's usually outside the request scope.
     */
    logJob(data: JobLogData): void {
        const level = data.result === "failure" ? "error" : "info";
        const status = data.result ?? "started";
        const duration = data.duration ? ` in ${data.duration}ms` : "";
        const message = `Job ${data.jobName} ${status}${duration}`;

        this.pino[level]({ context: "Job", data }, message);
    }

    /**
     * Get request context data from async storage.
     */
    private getRequestContext(): Record<string, unknown> {
        const requestData = this.requestContext.getAll();

        if (!requestData) return {};

        const { requestId, ip, userAgent, userId } = requestData;

        return {
            requestId,
            ip,
            userAgent,
            userId: userId ?? null,
        };
    }

    /**
     * Determine log level based on HTTP status code.
     */
    private getHttpLogLevel(statusCode: number): "info" | "warn" | "error" {
        if (statusCode >= 500) return "error";
        if (statusCode >= 400) return "warn";
        return "info";
    }

    /**
     * Build a standard log object with request context and extra data or errors.
     */
    private buildLogObject(data?: Record<string, unknown>, error?: unknown): Record<string, unknown> {
        const logObject: Record<string, unknown> = {
            ...this.getRequestContext(),
            context: this.context,
        };

        if (data) logObject.data = data;

        if (error) logObject.error = this.formatError(error);

        return logObject;
    }

    /**
     * Structure error object to be logged.
     */
    private formatError(error: unknown): LogError {
        if (error instanceof Error) {
            return {
                type: error.constructor.name,
                message: error.message,
                code: (error as Error & { code?: string }).code,
                stack: error.stack,
            };
        }

        return {
            type: "UnknownError",
            message: typeof error === "string" ? error : JSON.stringify(error),
            stack: undefined,
        };
    }
}
