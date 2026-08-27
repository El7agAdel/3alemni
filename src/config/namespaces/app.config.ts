export interface AppConfig {
    environment: "development" | "test" | "staging" | "production";
    port: number;
    url: string;
    webUrl: string;
    name: string;
    description: string;
    version: string;
}
