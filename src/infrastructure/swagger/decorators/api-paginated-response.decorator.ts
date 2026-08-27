import { applyDecorators, HttpStatus, Type } from "@nestjs/common";
import { ApiExtraModels, ApiResponse, getSchemaPath } from "@nestjs/swagger";

import { PaginatedResponseDto, PaginationMetaDto } from "@common/dto";

import { RESPONSE_HEADERS } from "../constants/headers.constant";

interface ApiPaginatedResponseOptions {
    type: [Type<unknown>];
    description?: string;
    headers?: Record<string, unknown>;
}

/**
 * Documents a paginated response with data and meta.
 */
export function ApiPaginatedResponse(options: ApiPaginatedResponseOptions) {
    const { type, description = "Successful operation", headers } = options;
    const itemType = type[0];

    return applyDecorators(
        ApiExtraModels(PaginatedResponseDto, PaginationMetaDto, itemType),
        ApiResponse({
            status: HttpStatus.OK,
            description,
            schema: {
                allOf: [
                    { $ref: getSchemaPath(PaginatedResponseDto) },
                    {
                        type: "object",
                        properties: {
                            data: {
                                type: "array",
                                items: { $ref: getSchemaPath(itemType) },
                            },
                        },
                        required: ["data", "meta"],
                    },
                ],
            },
            headers: { ...RESPONSE_HEADERS, ...headers },
        }),
    );
}
