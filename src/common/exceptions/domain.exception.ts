import { HttpStatus } from "@nestjs/common";

import { ErrorCodeType } from "../constants";

import { BaseException, ExceptionOptions } from "./base.exception";

/**
 * Base class for domain-specific exceptions.
 * Business rules exceptions specific to our application.
 */
export abstract class DomainException extends BaseException {
    protected constructor(options: ExceptionOptions) {
        super({
            ...options,
            statusCode: options.statusCode ?? HttpStatus.UNPROCESSABLE_ENTITY,
        });
    }
}

/**
 * Generic exception for business rule violations.
 * Used with specific error codes based on the error type.
 */
export class BusinessException extends DomainException {
    constructor(
        code: ErrorCodeType,
        message: string,
        details?: Record<string, unknown>,
        statusCode: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
    ) {
        super({
            code,
            message,
            statusCode,
            details,
        });
    }
}
