import { BaseQueryDto } from "../dto";
import { AppExceptions } from "../exceptions";
import { IncludableRelations, ListQueryOptions, SortableFields, SortOrder } from "../interfaces";

export class QueryBuilderUtil {
    private page: number = 1;
    private limit: number = 100;
    private orderByClause?: Record<string, SortOrder> | Array<Record<string, SortOrder>>;
    private orConditions: Array<Record<string, unknown>> = [];
    private whereConditions: Record<string, unknown> = {};
    private includeClause?: Record<string, unknown>;

    /**
     * Create a new query builder instance.
     */
    static create(): QueryBuilderUtil {
        return new QueryBuilderUtil();
    }

    /**
     * Add pagination from query DTO.
     * Uses defaults if no value provided.
     */
    paginate(query?: BaseQueryDto): this {
        this.page = query?.page ?? 1;
        this.limit = Math.min(query?.limit ?? 100, 500);

        return this;
    }

    /**
     * Add sorting with validation against allowed fields.
     * When the client sends sortBy and sortOrder params they get checked against allowed fields
     * and mapped to a database column.
     * Falls back to the defaults if the client sends an invalid field.
     */
    sort(query: BaseQueryDto | undefined, config: SortableFields): this {
        const requestedField = query?.sortBy ?? config.defaultField;
        const order = query?.sortOrder ?? config.defaultOrder;

        const dbColumn = config.allowed[requestedField];

        if (dbColumn) {
            this.orderByClause = { [dbColumn]: order };
        } else {
            const defaultColumn = config.allowed[config.defaultField];

            this.orderByClause = { [defaultColumn]: config.defaultOrder };
        }

        return this;
    }

    /**
     * Add text search across multiple fields ignoring case.
     * Optionally extends the OR condition with extra database-compatible conditions.
     */
    search(term: string | undefined, fields: string[], extraConditions: Array<Record<string, unknown>> = []): this {
        if (!term || fields.length === 0) return this;

        const searchConditions = fields.map((field) => ({
            [field]: { contains: term, mode: "insensitive" },
        }));

        this.orConditions.push(...searchConditions, ...extraConditions);

        return this;
    }

    /**
     * Add exact match filter.
     * Works for strings, numbers, booleans, and enums.
     * Only adds condition if the value is not undefined.
     */
    filter<T>(field: string, value: T | undefined): this {
        if (value !== undefined) this.whereConditions[field] = value;

        return this;
    }

    /**
     * Add an "in" filter for an array of values.
     * Skips if the array is empty or undefined.
     */
    filterIn<T>(field: string, values: T[] | undefined): this {
        if (values && values.length > 0) this.whereConditions[field] = { in: values };

        return this;
    }

    /**
     * Add date range filter.
     * Date-only strings are treated as inclusive boundaries: gte is the start of the day
     * and lte is the end of the day.
     */
    dateRange(field: string, from?: Date | string, to?: Date | string): this {
        if (!from && !to) return this;

        const condition: Record<string, Date | string> = {};

        if (from) {
            const isDateOnly = typeof from === "string" && !from.includes("T");
            condition.gte = isDateOnly ? `${from}T00:00:00.000Z` : from;
        }

        if (to) {
            const isDateOnly = typeof to === "string" && !to.includes("T");
            condition.lte = isDateOnly ? `${to}T23:59:59.999Z` : to;
        }

        this.whereConditions[field] = condition;

        return this;
    }

    /**
     * Add number range filter.
     */
    numberRange(field: string, min?: number, max?: number): this {
        if (min === undefined && max === undefined) return this;

        const condition: Record<string, number> = {};
        if (min !== undefined) condition.gte = min;
        if (max !== undefined) condition.lte = max;

        this.whereConditions[field] = condition;

        return this;
    }

    /**
     * Validate the incoming include query param against the allowed list.
     * Merges validated Prisma includes into the query options.
     * Skips entirely if no value is provided. Invalid relation values throw a 400 error.
     */
    includeRelations(includes: string | undefined, allowed: IncludableRelations): this {
        if (!includes) return this;

        const requested = includes
            .split(",")
            .map((include) => include.trim())
            .filter(Boolean);

        if (requested.length === 0) return this;

        const allowedKeys = Object.keys(allowed);
        const invalid = requested.filter((relation) => !allowedKeys.includes(relation));

        if (invalid.length > 0) {
            throw AppExceptions.badRequest(`Invalid include values: ${invalid.join(", ")}`, {
                Allowed: allowedKeys.join(", "),
            });
        }

        const include: Record<string, unknown> = { ...this.includeClause };

        for (const key of requested) {
            Object.assign(include, allowed[key]);
        }

        this.includeClause = include;

        return this;
    }

    /**
     * Add a custom where condition.
     * Used for complex queries that need a manual approach, like nested relation filters.
     */
    where(conditions: Record<string, unknown>): this {
        Object.assign(this.whereConditions, conditions);

        return this;
    }

    /**
     * Build the final query options object, passed directly to the repository method.
     */
    build(): ListQueryOptions {
        const where: Record<string, unknown> = { ...this.whereConditions };

        if (this.orConditions.length > 0) where.OR = this.orConditions;

        const options: ListQueryOptions = {
            page: this.page,
            limit: this.limit,
        };

        if (Object.keys(where).length > 0) options.where = where;

        if (this.orderByClause) options.orderBy = this.orderByClause;

        if (this.includeClause) options.include = this.includeClause;

        return options;
    }
}
