import { BaseEmail, BaseTemplate } from "@shared/messaging";

/**
 * Describes the payload passed to the dispatch method.
 * Channel templates are provided by the caller because they carry rich source-specific data.
 */
export interface DispatchPayload {
    userId: string;
    title: string;
    body: string;
    targetId?: string;
    broadcastId?: string;
    dedupKey?: string;
    emailTemplate?: BaseEmail;
    whatsappTemplate?: BaseTemplate;
}
