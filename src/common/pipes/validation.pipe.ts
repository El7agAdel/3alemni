import { ValidationPipe as NestValidationPipe, ValidationPipeOptions } from "@nestjs/common";
import { ValidationError } from "class-validator";

import { ValidationException } from "../exceptions";

/**
 * Custom validation pipe that formats and flattens errors and throws our custom exception.
 */
export class ValidationPipe extends NestValidationPipe {
    constructor(options?: ValidationPipeOptions) {
        super({
            transform: true,

            transformOptions: {
                enableImplicitConversion: true,
            },

            whitelist: true,

            forbidNonWhitelisted: true,

            stopAtFirstError: false,

            exceptionFactory: (errors: ValidationError[]) => {
                const details = this.formatErrors(errors);
                return new ValidationException(details);
            },

            ...options,
        });
    }

    /**
     * Recursively formats validation errors into a grouped structure and handles nested objects.
     */
    private formatErrors(errors: ValidationError[], parentPath = "") {
        const result: Record<string, string[]> = {};

        for (const error of errors) {
            const fieldPath = parentPath ? `${parentPath}.${error.property}` : error.property;

            if (error.children && error.children.length > 0) {
                const nestedErrors = this.formatErrors(error.children, fieldPath);

                for (const [field, messages] of Object.entries(nestedErrors)) {
                    result[field] = [...(result[field] ?? []), ...messages];
                }

                continue;
            }

            if (error.constraints) {
                const messages = Object.values(error.constraints);
                result[fieldPath] = [...(result[fieldPath] ?? []), ...messages];
            }
        }

        return result;
    }
}
