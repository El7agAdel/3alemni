import { JobsOptions } from "bullmq";

import { BaseJobData } from "../interfaces";

/**
 * Abstract base class for all jobs.
 * Provides validation and consistent structure.
 * Any class extending this should provide a generic type that extends BaseJobData.
 */
export abstract class BaseJob<T extends BaseJobData = BaseJobData> {
    abstract readonly queueName: string;
    abstract readonly jobName: string;
    public readonly data: T;
    public readonly options: JobsOptions;

    protected constructor(data: T, options: JobsOptions = {}) {
        this.data = data;
        this.options = options;
    }

    /**
     * Validate job data before enqueueing.
     * Combines base validation with the specific job validation.
     */
    validate(): boolean {
        return this.validateBase() && this.validateSpecific();
    }

    /**
     * Get all validation errors.
     */
    getValidationErrors(): string[] {
        const errors: string[] = [];

        if (this.data === null || this.data === undefined) errors.push("Job data is required");

        errors.push(...this.getSpecificValidationErrors());

        return errors;
    }

    /**
     * Base validation that always runs.
     */
    private validateBase(): boolean {
        return this.data !== null && this.data !== undefined;
    }

    /**
     * Specific validation logic. Overridden in child classes to add custom validation.
     */
    protected abstract validateSpecific(): boolean;

    /**
     * Get specific validation errors. Overridden in child classes.
     */
    protected abstract getSpecificValidationErrors(): string[];
}
