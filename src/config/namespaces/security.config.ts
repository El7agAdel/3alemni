export interface SecurityConfig {
    throttler: {
        ttl: number;
        limit: number;
    };

    cors: {
        enabled: boolean;
        origins: string[];
    };

    request: {
        bodyLimit: string;
    };
}
