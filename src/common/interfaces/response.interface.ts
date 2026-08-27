/**
 * Base structure for all API responses.
 */
export interface ApiResponseBase {
    success: boolean;
    message: string;
    path: string;
    timestamp: string;
    requestId: string;
}

/**
 * Success response structure with optional pagination metadata.
 */
export interface ApiSuccessResponse<T> extends ApiResponseBase {
    success: true;
    data: T;
    meta?: PaginationMeta;
}

/**
 * Shape of a result containing data and pagination metadata.
 */
export interface PaginatedResult<T> {
    items: T[];
    meta: PaginationMeta;
}

/**
 * Pagination metadata for paginated list responses.
 */
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextCursor?: string;
    prevCursor?: string;
}

/**
 * Error response structure.
 */
export interface ApiErrorResponse extends ApiResponseBase {
    success: false;
    error: ApiErrorDetail;
}

/**
 * Error detail structure.
 */
export interface ApiErrorDetail {
    code: string;
    details: Record<string, unknown>;
    stack?: string;
}

/**
 * Rate limit details for throttling exceptions.
 */
export interface RateLimitErrorDetail {
    retryAfter: number;
    limit?: number;
    remaining?: number;
    resetTime?: number;
}

/**
 * Union type for all types of API responses.
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Type alias for a paginated API response.
 */
export type ApiPaginatedResponse<T> = ApiSuccessResponse<T[]>;
