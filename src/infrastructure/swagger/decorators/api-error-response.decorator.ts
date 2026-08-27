import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiExtraModels, ApiResponse, getSchemaPath } from "@nestjs/swagger";

import { ErrorResponseDto } from "@common/dto";

import { RESPONSE_HEADERS } from "../constants/headers.constant";

interface ApiErrorResponseOptions {
    status: HttpStatus;
    description?: string;
    headers?: Record<string, unknown>;
}

/**
 * Documents a single error response.
 */
export function ApiErrorResponse(options: ApiErrorResponseOptions) {
    const { status, description = "Error response", headers } = options;

    return applyDecorators(
        ApiExtraModels(ErrorResponseDto),
        ApiResponse({
            status,
            description,
            schema: { $ref: getSchemaPath(ErrorResponseDto) },
            headers: { ...RESPONSE_HEADERS, ...headers },
        }),
    );
}

/**
 * Adds common error responses to an endpoint with an option to exclude certain ones.
 */
export function ApiCommonErrors(options?: { excludeErrors?: HttpStatus[] }) {
    const exclude = options?.excludeErrors ?? [];

    const errorConfigs: Array<{
        status: HttpStatus;
        description: string;
        type: typeof ErrorResponseDto;
    }> = [
        {
            status: HttpStatus.BAD_REQUEST,
            description: "Validation failed",
            type: ErrorResponseDto,
        },
        {
            status: HttpStatus.UNAUTHORIZED,
            description: "Authentication required",
            type: ErrorResponseDto,
        },
        {
            status: HttpStatus.FORBIDDEN,
            description: "Insufficient permissions",
            type: ErrorResponseDto,
        },
        {
            status: HttpStatus.NOT_FOUND,
            description: "Resource not found",
            type: ErrorResponseDto,
        },
        {
            status: HttpStatus.TOO_MANY_REQUESTS,
            description: "Rate limit exceeded",
            type: ErrorResponseDto,
        },
        {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            description: "Internal server error",
            type: ErrorResponseDto,
        },
    ];

    const decorators = errorConfigs
        .filter((config) => !exclude.includes(config.status))
        .map((config) =>
            ApiResponse({
                status: config.status,
                description: config.description,
                type: config.type,
            }),
        );

    const allTypes = [ErrorResponseDto];

    return applyDecorators(ApiExtraModels(...allTypes), ...decorators);
}
