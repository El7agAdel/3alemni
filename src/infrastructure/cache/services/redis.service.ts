import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";

import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";

/**
 * Low-level Redis service for cache.
 * Handles connection, serialization, and infrastructure for the cache service.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly client: Redis;
    private isConnected = false;
    private readonly keyPrefix: string;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
    ) {
        this.logger.setContext(RedisService.name);

        this.keyPrefix = this.config.cache.keyPrefix;

        const cacheConfig = this.config.cache;

        this.client = new Redis({
            host: cacheConfig.redis.host,
            port: cacheConfig.redis.port,
            password: cacheConfig.redis.password || undefined,
            db: cacheConfig.redis.db,
            keyPrefix: `${this.keyPrefix}:`,
            enableReadyCheck: true,
            lazyConnect: true,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    this.logger.warn(`Redis connection failed after ${times} attempts`);
                    return null;
                }

                return Math.min(times * 200, 2000);
            },
        });

        this.client.on("connect", () => {
            this.isConnected = true;
        });

        this.client.on("error", (error) => {
            this.isConnected = false;
            this.logger.warn(`Redis client connection error: ${error.message}`);
        });

        this.client.on("close", () => {
            this.isConnected = false;
        });
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.client.connect();
            this.logger.info("Redis connection established");
        } catch (error) {
            this.logger.warn(`Redis connection failed: ${(error as Error).message}. Cache will be disabled.`);
        }
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.quit();
    }

    /**
     * Check if Redis is available.
     */
    isAvailable(): boolean {
        return this.isConnected;
    }

    /**
     * Get a value from the Redis store.
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.isConnected) return null;

        try {
            const value = await this.client.get(key);

            if (!value) return null;

            return JSON.parse(value) as T;
        } catch (error) {
            this.logger.warn(`Cache get failed for key "${key}": ${(error as Error).message}`);

            return null;
        }
    }

    /**
     * Set a value in Redis with TTL.
     */
    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        if (!this.isConnected) return;

        try {
            const serialized = JSON.stringify(value);

            await this.client.setex(key, ttlSeconds, serialized);
        } catch (error) {
            this.logger.warn(`Cache set failed for key "${key}": ${(error as Error).message}`);
        }
    }

    /**
     * Delete a specific key.
     */
    async delete(key: string): Promise<void> {
        if (!this.isConnected) return;

        try {
            await this.client.del(key);
        } catch (error) {
            this.logger.warn(`Cache delete failed for key "${key}": ${(error as Error).message}`);
        }
    }

    /**
     * Delete multiple keys at once.
     */
    async deleteMany(keys: string[]): Promise<void> {
        if (!this.isConnected || keys.length === 0) return;

        try {
            await this.client.del(...keys);
        } catch (error) {
            this.logger.warn(`Cache delete many failed for keys (${keys.join(", ")}): ${(error as Error).message}`);
        }
    }

    /**
     * Delete keys matching a specific pattern using Redis scan.
     */
    async deleteByPattern(pattern: string): Promise<number> {
        if (!this.isConnected) return 0;

        try {
            const fullPattern = `${this.keyPrefix}:${pattern}`;
            const keys = await this.scanKeys(fullPattern);

            if (keys.length === 0) return 0;

            const keysWithoutPrefix = this.stripKeysPrefix(keys);

            await this.client.del(...keysWithoutPrefix);

            return keys.length;
        } catch (error) {
            this.logger.warn(`Cache delete by pattern failed for pattern "${pattern}": ${(error as Error).message}`);

            return 0;
        }
    }

    /**
     * Creates and increments a counter.
     * Sets TTL only on the first increment and returns the new count.
     */
    async increment(key: string, ttlSeconds?: number): Promise<number> {
        if (!this.isConnected) return 0;

        try {
            const count = await this.client.incr(key);

            if (count === 1 && ttlSeconds) {
                await this.client.expire(key, ttlSeconds);
            }

            return count;
        } catch (error) {
            this.logger.warn(`Cache increment failed for key "${key}": ${(error as Error).message}`);

            return 0;
        }
    }

    /**
     * Set key only if it doesn't exist, with TTL.
     * Returns true if the key was set, false otherwise.
     * Used as a distributed lock.
     */
    async setNx(key: string, ttlSeconds: number): Promise<boolean> {
        if (!this.isConnected) return false;

        try {
            const result = await this.client.set(key, "1", "EX", ttlSeconds, "NX");

            return result === "OK";
        } catch (error) {
            this.logger.warn(`Cache setNx failed for key "${key}": ${(error as Error).message}`);

            return false;
        }
    }

    /**
     * Get the remaining TTL for a key in seconds.
     */
    async getTTL(key: string): Promise<number> {
        if (!this.isConnected) return -2;

        try {
            return this.client.ttl(key);
        } catch (error) {
            this.logger.warn(`Cache getTTL failed for key "${key}": ${(error as Error).message}`);

            return -2;
        }
    }

    /**
     * Set TTL for an existing key.
     */
    async expire(key: string, ttlSeconds: number): Promise<void> {
        if (!this.isConnected) return;

        try {
            await this.client.expire(key, ttlSeconds);
        } catch (error) {
            this.logger.warn(`Cache expire failed for key "${key}": ${(error as Error).message}`);
        }
    }

    /**
     * Check if a key exists.
     */
    async exists(key: string): Promise<boolean> {
        if (!this.isConnected) return false;

        try {
            const result = await this.client.exists(key);

            return result === 1;
        } catch (error) {
            this.logger.warn(`Cache exists check failed for key "${key}": ${(error as Error).message}`);

            return false;
        }
    }

    /**
     * Clear all keys with our prefix from the Redis database.
     */
    async clear(): Promise<void> {
        if (!this.isConnected) return;

        try {
            await this.deleteByPattern("*");
        } catch (error) {
            this.logger.warn(`Cache clear failed: ${(error as Error).message}`);
        }
    }

    /**
     * Scan for keys matching a pattern.
     */
    private async scanKeys(pattern: string): Promise<string[]> {
        const keys: string[] = [];
        let cursor = "0";

        do {
            const [nextCursor, foundKeys] = await this.client.scan(cursor, "MATCH", pattern, "COUNT", 100);
            cursor = nextCursor;
            keys.push(...foundKeys);
        } while (cursor !== "0");

        return keys;
    }

    /**
     * Remove a prefix from an array of keys.
     */
    private stripKeysPrefix(keys: string[]): string[] {
        if (!keys.length) return keys;

        const prefix = (this.client.options.keyPrefix as string) ?? "";

        if (!prefix) return keys;

        return keys.map((key) => (key.startsWith(prefix) ? key.slice(prefix.length) : key));
    }
}
