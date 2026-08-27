export interface ApiConfig {
    prefix: string;
    version: string;
    swagger: {
        enabled: boolean;
        title: string;
        description: string;
        version: string;
        path: string;
        auth: {
            enabled: boolean;
            username: string;
            password: string;
        };
        servers: Array<{
            url: string;
            description: string;
        }>;
    };
}
