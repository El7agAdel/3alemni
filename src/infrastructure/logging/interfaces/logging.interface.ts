export interface HttpLogData {
    method: string;
    path: string;
    statusCode: number;
    duration: number;
}

export interface SecurityEventLogData {
    event: string;
    severity: "low" | "medium" | "high" | "critical";
    reason?: string;
    identifier?: string;
    [key: string]: unknown;
}

export interface DatabaseQueryLogData {
    query: string;
    duration: number;
    params?: unknown[];
}

export interface ExternalApiLogData {
    service: string;
    endpoint: string;
    method: string;
    statusCode: number;
    duration: number;
}

export interface PerformanceLogData {
    operation: string;
    duration: number;
    threshold?: number;
    [key: string]: unknown;
}

export interface JobLogData {
    jobName: string;
    jobId?: string;
    duration?: number;
    result?: "success" | "failure" | "skipped";
    [key: string]: unknown;
}

export interface LogError {
    type: string;
    message: string;
    code?: string;
    stack?: string;
}
