/**
 * Base interface for all job payloads.
 * Extended by all job data classes.
 */
export interface BaseJobData {
    jobId?: string;
    userId?: string;
}

/**
 * Result returned after every job completion.
 */
export interface JobResult {
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
    error?: string;
}
