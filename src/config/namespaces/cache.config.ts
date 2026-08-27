export interface CacheConfig {
    redis: {
        host: string;
        port: number;
        password?: string;
        db: number;
    };
    keyPrefix: string;
    ttl: number;
}
