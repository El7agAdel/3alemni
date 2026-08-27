import { PaginatedResult, PaginationMeta } from "@common/interfaces";

export class PaginationUtil {
    /**
     * Calculates pagination metadata from query parameters and total count.
     */
    static buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
        const totalPages = Math.ceil(total / limit);

        return {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        };
    }

    /**
     * An empty page result, for no scope cases.
     */
    static emptyResult<T>(limit?: number): PaginatedResult<T> {
        return {
            items: [],
            meta: this.buildPaginationMeta(1, limit ?? 100, 0),
        };
    }
}
