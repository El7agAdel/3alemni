export interface LoggerConfig {
    level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
    httpLogging: boolean;
    slowRequestThreshold: number;
}
