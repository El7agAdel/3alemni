import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Response } from "express";

import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";

import { ErrorCode } from "../constants";
import { BaseException } from "../exceptions";
import { ApiErrorResponse, ExtendedRequest } from "../interfaces";

interface ErrorInfo {
    statusCode: HttpStatus;
    code: string;
    message: string;
    details: Record<string, unknown>;
    stack?: string;
}

/**
 * Global exception filter that catches all exceptions and formats them into a consistent API response structure.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
    ) {
        this.logger.setContext(GlobalExceptionFilter.name);
    }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<ExtendedRequest>();
        const response = ctx.getResponse<Response>();

        const { statusCode, code, message, details, stack } = this.extractErrorInfo(exception);

        const requestId = request.requestId ?? request.headers["x-request-id"] ?? "unknown";
        const startTime = request.startTime ?? performance.now();
        const duration = Math.round(performance.now() - startTime);

        this.logger.logHttpError(
            { method: request.method, path: request.url, statusCode, duration },
            exception instanceof Error ? exception : new Error(String(exception)),
        );

        const errorResponse: ApiErrorResponse = {
            success: false,
            message,
            error: {
                code,
                details,
            },
            path: request.url,
            timestamp: new Date().toISOString(),
            requestId,
        };

        // Don't include stack trace in production
        if (this.isSafeEnvironment() && stack) {
            errorResponse.error.stack = stack;
        }

        response.status(statusCode).json(errorResponse);
    }

    /**
     * Extract error information based on the exception type.
     */
    private extractErrorInfo(exception: unknown): ErrorInfo {
        if (exception instanceof BaseException) {
            return {
                statusCode: exception.getStatus(),
                code: exception.code,
                message: exception.message,
                details: exception.details,
                stack: exception.stack,
            };
        }

        if (exception instanceof HttpException) {
            return this.handleHttpException(exception);
        }

        if (exception instanceof PrismaClientKnownRequestError) {
            return this.handlePrismaError(exception);
        }

        return this.handleUnknownError(exception);
    }

    /**
     * Handle NestJS http exception.
     */
    private handleHttpException(exception: HttpException): ErrorInfo {
        const response = exception.getResponse();
        const statusCode = exception.getStatus();
        const stack = exception.stack;

        if (typeof response === "string") {
            return {
                statusCode,
                code: this.httpStatusToErrorCode(statusCode),
                message: response,
                details: {},
                stack,
            };
        }

        const { message, error, statusCode: _, ...extraFields } = response as Record<string, unknown>;

        // NestJS validation
        if (Array.isArray(message)) {
            return {
                statusCode,
                code: ErrorCode.VALIDATION_FAILED,
                message: "Validation failed",
                details: { validation: message },
                stack,
            };
        }

        return {
            statusCode,
            code: this.httpStatusToErrorCode(statusCode),
            message: (message as string) || (error as string) || exception.message,
            details: Object.keys(extraFields).length > 0 ? extraFields : {},
            stack,
        };
    }

    /**
     * Handle Prisma database errors.
     */
    private handlePrismaError(exception: PrismaClientKnownRequestError): ErrorInfo {
        switch (exception.code) {
            // Unique constraint
            case "P2002":
                return {
                    statusCode: HttpStatus.CONFLICT,
                    code: ErrorCode.RESOURCE_ALREADY_EXISTS,
                    message: "This record already exists",
                    details: {},
                    stack: exception.stack,
                };

            // Record not found
            case "P2025":
                return {
                    statusCode: HttpStatus.NOT_FOUND,
                    code: ErrorCode.RESOURCE_NOT_FOUND,
                    message: "Resource not found",
                    details: {},
                    stack: exception.stack,
                };

            // Foreign key constraint
            case "P2003":
                return {
                    statusCode: HttpStatus.BAD_REQUEST,
                    code: ErrorCode.RESOURCE_CONFLICT,
                    message: "Referenced resource does not exist",
                    details: exception.meta?.field_name ? { field: exception.meta.field_name } : {},
                    stack: exception.stack,
                };

            default:
                return {
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    code: ErrorCode.SYSTEM_DATABASE_ERROR,
                    message: this.isSafeEnvironment()
                        ? `Database error: ${exception.message}`
                        : "A database error occurred",
                    details: this.isSafeEnvironment() ? { prismaCode: exception.code } : {},
                    stack: exception.stack,
                };
        }
    }

    /**
     * Handle unknown errors.
     */
    private handleUnknownError(exception: unknown): ErrorInfo {
        const error = exception instanceof Error ? exception : new Error(String(exception));

        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            code: ErrorCode.SYSTEM_INTERNAL_ERROR,
            message: this.isSafeEnvironment() ? error.message : "An unexpected error occurred",
            details: {},
            stack: error.stack,
        };
    }

    /**
     * Map HTTP status code to error code.
     */
    private httpStatusToErrorCode(status: HttpStatus): string {
        const statusCodeMap: Partial<Record<HttpStatus, string>> = {
            [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
            [HttpStatus.UNAUTHORIZED]: ErrorCode.AUTH_REQUIRED,
            [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN_INSUFFICIENT_PERMISSION,
            [HttpStatus.NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
            [HttpStatus.CONFLICT]: ErrorCode.RESOURCE_CONFLICT,
            [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.UPLOAD_SIZE_EXCEEDED,
            [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.UNPROCESSABLE_CONTENT,
            [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMIT_EXCEEDED,
            [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.SYSTEM_INTERNAL_ERROR,
            [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SYSTEM_EXTERNAL_SERVICE_ERROR,
        };

        return statusCodeMap[status] || ErrorCode.SYSTEM_INTERNAL_ERROR;
    }

    /**
     * Determine if it's safe to include sensitive information like stack or detailed errors.
     */
    isSafeEnvironment(): boolean {
        return !this.config.isProduction;
    }
}
