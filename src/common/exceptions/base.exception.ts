import { HttpException, HttpStatus } from "@nestjs/common";

import { ErrorCodeType } from "../constants";

export interface ExceptionOptions {
    code: ErrorCodeType;
    message: string;
    statusCode?: HttpStatus;
    details?: Record<string, unknown>;
    cause?: Error;
}

/**
 * Base class for all custom exceptions.
 */
export abstract class BaseException extends HttpException {
    public readonly code: ErrorCodeType;
    public readonly details: Record<string, unknown>;

    protected constructor(options: ExceptionOptions) {
        const statusCode = options.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;

        super(
            {
                code: options.code,
                message: options.message,
                details: options.details ?? {},
            },
            statusCode,
            { cause: options.cause },
        );

        this.code = options.code;
        this.details = options.details ?? {};

        Error.captureStackTrace(this, this.constructor);
    }
}
