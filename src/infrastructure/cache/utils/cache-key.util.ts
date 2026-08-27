/**
 * Utility for cache key operations.
 */
export class CacheKey {
    /**
     * Append sorted query params to a base key or return the base key unchanged if the query is empty.
     */
    static withQuery(key: string, query: Record<string, unknown>): string {
        const queryPart = this.serializeQuery(query);

        return queryPart ? `${key}:${queryPart}` : key;
    }

    /**
     * Convert a query object to a sorted and consistent string.
     */
    private static serializeQuery(query: Record<string, unknown>): string {
        const entries = Object.entries(query)
            .filter(([, value]) => value !== undefined && value !== null && value !== "")
            .sort(([a], [b]) => a.localeCompare(b));

        if (entries.length === 0) return "";

        return entries.map(([key, value]) => `${key}=${String(value)}`).join("|");
    }
}
