import { BaseJobData } from "@infra/queue";

export interface PushJobData extends BaseJobData {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
    dryRun?: boolean;
}
