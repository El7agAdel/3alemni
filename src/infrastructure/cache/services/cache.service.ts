import { Injectable } from "@nestjs/common";

import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";

import { RedisService } from "./redis.service";

@Injectable()
export class CacheService {
    private readonly defaultTtl: number;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
        private readonly redis: RedisService,
    ) {
        this.logger.setContext(CacheService.name);

        this.defaultTtl = this.config.cache.ttl;
    }

    /**
     * Check if the cache service is available.
     */
    isAvailable(): boolean {
        return this.redis.isAvailable();
    }

    /**
     * Get a cached value.
     */
    async get<T>(key: string): Promise<T | null> {
        return this.redis.get<T>(key);
    }

    /**
     * Set a value in the cache with a TTL or default TTL from config.
     */
    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        ttlSeconds = ttlSeconds ?? this.defaultTtl;

        await this.redis.set(key, value, ttlSeconds);
    }

    /**
     * Attempts to get a cached value, and if not found, executes the fetch function and caches the result.
     */
    async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlSeconds?: number): Promise<T> {
        const cachedData = await this.get<T>(key);

        if (cachedData !== null) return cachedData;

        const data = await fetchFn();

        void this.set(key, data, ttlSeconds);

        return data;
    }

    /**
     * Delete a specific cache key.
     */
    async delete(key: string): Promise<void> {
        await this.redis.delete(key);
    }

    /**
     * Delete multiple cache keys at once.
     */
    async deleteMany(...keys: string[]): Promise<void> {
        if (keys.length === 0) return;

        await this.redis.deleteMany(keys);
    }

    /**
     * Delete all keys matching a pattern using Redis scan.
     */
    async deleteByPattern(pattern: string): Promise<number> {
        return this.redis.deleteByPattern(pattern);
    }

    /**
     * Creates and increments a counter.
     * Sets TTL only on the first increment and returns the new count.
     */
    async increment(key: string, ttlSeconds?: number): Promise<number> {
        return this.redis.increment(key, ttlSeconds);
    }

    /**
     * Set key only if it doesn't exist, with TTL.
     * Returns true if the lock was acquired, false otherwise. Used as a distributed lock.
     */
    async setNx(key: string, ttlSeconds: number): Promise<boolean> {
        return this.redis.setNx(key, ttlSeconds);
    }

    /**
     * Get the remaining TTL for a key in seconds.
     */
    async getTTL(key: string): Promise<number> {
        return this.redis.getTTL(key);
    }

    /**
     * Set TTL for an existing key.
     */
    async expire(key: string, ttlSeconds: number): Promise<void> {
        await this.redis.expire(key, ttlSeconds);
    }

    /**
     * Check if a key exists in the cache store.
     */
    async exists(key: string): Promise<boolean> {
        return this.redis.exists(key);
    }

    /**
     * Clear the entire cache store.
     */
    async clear(): Promise<void> {
        await this.redis.clear();
    }
}
