import { AsyncLocalStorage } from "node:async_hooks";

import { Injectable } from "@nestjs/common";

interface RequestContextStore {
    requestId: string;
    startTime: number;
    ip: string;
    userAgent: string;
    userId?: string;
}

/**
 * Stores and provides request context anywhere throughout the request lifecycle.
 */
@Injectable()
export class RequestContextService {
    private static storage = new AsyncLocalStorage<RequestContextStore>();

    /**
     * Create a scoped context for the request lifecycle.
     */
    run(context: RequestContextStore, callback: () => void): void {
        RequestContextService.storage.run(context, callback);
    }

    /**
     * Get a specific context value.
     */
    get<T extends keyof RequestContextStore>(key: T): RequestContextStore[T] | undefined {
        return RequestContextService.storage.getStore()?.[key];
    }

    /**
     * Set a context value.
     */
    set<T extends keyof RequestContextStore>(key: T, value: RequestContextStore[T]): void {
        const store = RequestContextService.storage.getStore();

        if (store) store[key] = value;
    }

    /**
     * Get all context values.
     */
    getAll(): RequestContextStore | undefined {
        return RequestContextService.storage.getStore();
    }
}
