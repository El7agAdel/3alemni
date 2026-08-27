import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ApiErrorDetail, ApiResponseBase, PaginationMeta } from "@common/interfaces";

/**
 * Success response with data.
 */
export class SuccessResponseDto<T = unknown> implements ApiResponseBase {
    @ApiProperty({ example: true })
    success: boolean = true;

    @ApiProperty({ example: "Operation completed successfully" })
    message: string;

    @ApiProperty({ description: "Response data" })
    data: T;

    @ApiProperty({ example: "/api/v1/users" })
    path: string;

    @ApiProperty({ example: "2025-02-05T12:00:00.000Z" })
    timestamp: string;

    @ApiProperty({ example: "req-m1abc123-x7k2" })
    requestId: string;
}

/**
 * Pagination metadata.
 */
export class PaginationMetaDto implements PaginationMeta {
    @ApiProperty({ example: 1, description: "Current page number" })
    page: number;

    @ApiProperty({ example: 20, description: "Items per page" })
    limit: number;

    @ApiProperty({ example: 100, description: "Total number of items" })
    total: number;

    @ApiProperty({ example: 5, description: "Total number of pages" })
    totalPages: number;

    @ApiProperty({ example: true, description: "Whether there is a next page" })
    hasNextPage: boolean;

    @ApiProperty({
        example: false,
        description: "Whether there is a previous page",
    })
    hasPrevPage: boolean;

    @ApiPropertyOptional({ description: "Cursor for next page" })
    nextCursor?: string;

    @ApiPropertyOptional({ description: "Cursor for previous page" })
    prevCursor?: string;
}

/**
 * Paginated response with data array and meta.
 */
export class PaginatedResponseDto<T = unknown> implements ApiResponseBase {
    @ApiProperty({ example: true })
    success: boolean = true;

    @ApiProperty({ example: "Data retrieved successfully" })
    message: string;

    @ApiProperty({ description: "Response data" })
    data: T[];

    @ApiProperty({ type: PaginationMetaDto })
    meta: PaginationMetaDto;

    @ApiProperty({ example: "/api/v1/users" })
    path: string;

    @ApiProperty({ example: "2025-02-05T12:00:00.000Z" })
    timestamp: string;

    @ApiProperty({ example: "req-m1abc123-x7k2" })
    requestId: string;
}

/**
 * Error details structure.
 */
class ErrorDetailDto implements ApiErrorDetail {
    @ApiProperty({ example: "RESOURCE_NOT_FOUND" })
    code: string;

    @ApiProperty({ description: "Contains specific information about the error" })
    details: Record<string, unknown>;

    @ApiPropertyOptional({
        description: "Stack trace available in non-production environment only",
    })
    stack?: string;
}

/**
 * Standard error response.
 */
export class ErrorResponseDto implements ApiResponseBase {
    @ApiProperty({ example: false })
    success: boolean = false;

    @ApiProperty({ example: "Resource not found" })
    message: string;

    @ApiProperty({ type: ErrorDetailDto })
    error: ErrorDetailDto;

    @ApiProperty({ example: "/api/v1/users/1" })
    path: string;

    @ApiProperty({ example: "2025-02-05T12:00:00.000Z" })
    timestamp: string;

    @ApiProperty({ example: "req-m1abc123-x7k2" })
    requestId: string;
}
