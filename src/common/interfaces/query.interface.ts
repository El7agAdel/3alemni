/**
 * Sort order direction.
 */
export type SortOrder = "asc" | "desc";

/**
 * Sortable field configuration.
 * Defines allowed sort fields and their DB column mapping.
 */
export interface SortableFields {
    allowed: Record<string, string>;
    defaultField: string;
    defaultOrder: SortOrder;
}

/**
 * Defines which relations a client can request via the include query param.
 */
export interface IncludableRelations {
    [clientKey: string]: Record<string, unknown>;
}

/**
 * Generic query options for internal repository methods.
 * Not used for client-facing query params.
 */
export interface QueryOptions {
    where?: Record<string, unknown>;
    orderBy?: Record<string, SortOrder> | Array<Record<string, SortOrder>>;
    include?: Record<string, boolean | object>;
}

/**
 * Query options for list endpoints.
 * The query builder sets the defaults for required fields.
 */
export interface ListQueryOptions {
    page: number;
    limit: number;
    where?: Record<string, unknown>;
    orderBy?: Record<string, SortOrder> | Array<Record<string, SortOrder>>;
    include?: Record<string, unknown>;
}
