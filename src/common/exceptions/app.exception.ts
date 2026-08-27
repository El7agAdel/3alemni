import { HttpStatus } from "@nestjs/common";

import { ErrorCode, ErrorCodeType } from "../constants";
import type { RateLimitErrorDetail } from "../interfaces";

import { BaseException, ExceptionOptions } from "./base.exception";

/**
 * Base class for application exceptions.
 * Used by standard HTTP errors.
 */
export abstract class AppException extends BaseException {
    protected constructor(options: ExceptionOptions) {
        super({
            ...options,
            statusCode: options.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR,
        });
    }
}

/**
 * Thrown when any validation error occurs.
 */
export class ValidationException extends AppException {
    constructor(errors: Record<string, string[]>, message = "Validation failed") {
        super({
            code: ErrorCode.VALIDATION_FAILED,
            message,
            statusCode: HttpStatus.BAD_REQUEST,
            details: errors,
        });
    }

    /**
     * Get the validation errors array.
     */
    get errors(): Record<string, string[]> {
        return (this.details as Record<string, string[]>) ?? [];
    }
}

/**
 * Thrown for generic bad request errors that aren't validation errors.
 */
export class BadRequestException extends AppException {
    constructor(code: ErrorCodeType, message: string, details?: Record<string, unknown>) {
        super({
            code,
            message,
            details,
            statusCode: HttpStatus.BAD_REQUEST,
        });
    }
}

/**
 * Thrown for any authentication failures.
 */
export class AuthenticationException extends AppException {
    constructor(code: ErrorCodeType, message = "Authentication failed", details?: Record<string, unknown>) {
        super({
            code,
            message,
            details,
            statusCode: HttpStatus.UNAUTHORIZED,
        });
    }
}

/**
 * Thrown when the user doesn't have enough permissions.
 */
export class AuthorizationException extends AppException {
    constructor(code: ErrorCodeType, message = "Access denied", details?: Record<string, unknown>) {
        super({
            code,
            message,
            details,
            statusCode: HttpStatus.FORBIDDEN,
        });
    }
}

/**
 * Thrown when a resource doesn't exist.
 */
export class NotFoundException extends AppException {
    constructor(resource: string, identifier?: string | number, code: ErrorCodeType = ErrorCode.RESOURCE_NOT_FOUND) {
        super({
            code,
            message: `${resource} not found`,
            statusCode: HttpStatus.NOT_FOUND,
            details: { resource, identifier },
        });
    }
}

/**
 * Thrown when a resource already exists or on any conflict.
 */
export class ConflictException extends AppException {
    constructor(message: string, code: ErrorCodeType = ErrorCode.RESOURCE_CONFLICT, details?: Record<string, unknown>) {
        super({
            code,
            message,
            statusCode: HttpStatus.CONFLICT,
            details,
        });
    }
}

/**
 * Thrown when the rate limit is exceeded.
 */
export class RateLimitException extends AppException {
    constructor(
        code: ErrorCodeType = ErrorCode.RATE_LIMIT_EXCEEDED,
        message = "Too many requests",
        rateLimitInfo?: RateLimitErrorDetail,
    ) {
        super({
            code,
            message,
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            details: rateLimitInfo ? { ...rateLimitInfo } : {},
        });
    }
}

/**
 * Thrown on internal server errors or unexpected exceptions.
 */
export class SystemException extends AppException {
    constructor(
        code: ErrorCodeType = ErrorCode.SYSTEM_INTERNAL_ERROR,
        message = "An unexpected error occurred",
        cause?: Error,
    ) {
        super({
            code,
            message,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            cause,
        });
    }
}
