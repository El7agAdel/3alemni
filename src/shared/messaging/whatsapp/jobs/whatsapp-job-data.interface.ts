import { BaseJobData } from "@infra/queue";

export interface WhatsAppJobData extends BaseJobData {
    phoneNumber: string;
    templateName: string;
    context: Record<string, unknown>;
    hasButton?: boolean;
    languageCode?: string;
}
