export interface StorageConfig {
    provider: "local";

    baseUrl: string;

    maxFileSizeBytes: number;

    local: {
        basePath: string;
    };
}
