import { applyDecorators, HttpStatus, Type } from "@nestjs/common";
import { ApiExtraModels, ApiResponse, getSchemaPath } from "@nestjs/swagger";

import { SuccessResponseDto } from "@common/dto";

import { RESPONSE_HEADERS } from "../constants/headers.constant";

interface ApiSuccessResponseOptions {
    status?: HttpStatus;
    description?: string;
    type?: Type<unknown> | [Type<unknown>];
    isCreated?: boolean;
    headers?: Record<string, unknown>;
}

/**
 * Documentation for a successful response based on data type.
 */
export function ApiSuccessResponse(options: ApiSuccessResponseOptions = {}) {
    const { status = HttpStatus.OK, description = "Successful operation", type, isCreated = false, headers } = options;

    const finalStatus = isCreated ? HttpStatus.CREATED : status;

    if (!type) {
        return applyDecorators(
            ApiExtraModels(SuccessResponseDto),
            ApiResponse({
                status: finalStatus,
                description,
                schema: { $ref: getSchemaPath(SuccessResponseDto) },
                headers: { ...RESPONSE_HEADERS, ...headers },
            }),
        );
    }

    const isArray = Array.isArray(type);
    const actualType = isArray ? type[0] : type;

    const dataSchema = isArray
        ? { type: "array", items: { $ref: getSchemaPath(actualType) } }
        : { $ref: getSchemaPath(actualType) };

    return applyDecorators(
        ApiExtraModels(SuccessResponseDto, actualType),
        ApiResponse({
            status: finalStatus,
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(SuccessResponseDto) },
                    {
                        type: "object",
                        properties: { data: dataSchema },
                        required: ["data"],
                    },
                ],
            },
            headers: { ...RESPONSE_HEADERS, ...headers },
        }),
    );
}
