import { BaseJobData } from "@infra/queue";

export interface EmailJobData extends BaseJobData {
    to: string | string[];
    templateName: string;
    context: Record<string, unknown>;
    subject?: string;
    from?: string;
    attachments?: Array<{
        filename: string;
        content: string;
        contentType?: string;
    }>;
}
