export interface QueueConfig {
    redis: {
        host: string;
        port: number;
        password: string;
        db: number;
    };

    job: {
        attempts: number;
        backoff: {
            type: "exponential" | "fixed";
            delay: number;
        };
        removeOnComplete: number;
        removeOnFail: number;
    };

    bullBoard: {
        enabled: boolean;
        path: string;
        authEnabled: boolean;
        username: string;
        password: string;
    };
}
