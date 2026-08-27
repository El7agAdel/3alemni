/**
 * Available message delivery channels.
 */
export enum MessageChannel {
    EMAIL = "EMAIL",
    WHATSAPP = "WHATSAPP",
    PUSH = "PUSH",
}

/**
 * Options for sending an email.
 */
export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    from?: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;
}

/**
 * WhatsApp template component parameter.
 */
export interface WhatsAppTemplateParameter {
    type: "text";
    text: string;
}

/**
 * WhatsApp template component.
 */
export interface WhatsAppTemplateComponent {
    type: "body" | "header" | "button";
    sub_type?: "url" | "quick_reply";
    index?: string;
    parameters: WhatsAppTemplateParameter[];
}

/**
 * WhatsApp send response.
 */
export interface WhatsAppSendResponse {
    messages?: Array<{ id: string }>;
}

/**
 * WhatsApp response result.
 */
export interface WhatsAppSendResult {
    messageId: string;
}

/**
 * WhatsApp error response.
 */
export interface WhatsAppApiErrorResponse {
    error?: {
        message: string;
        type: string;
        code: number;
        error_subcode?: number;
        fbtrace_id?: string;
    };
}

/**
 * FCM message payload.
 */
export interface FcmPayload {
    notification?: {
        title?: string;
        body?: string;
        imageUrl?: string;
    };
    data?: Record<string, string>;
    android?: {
        notification?: { channelId?: string };
        priority?: "normal" | "high";
    };
    apns?: {
        payload?: { aps?: Record<string, unknown> };
    };
    webpush?: {
        headers?: Record<string, string>;
        notification?: Record<string, unknown>;
        fcmOptions?: { link?: string };
    };
}

/**
 * Result from FCM.
 */
export interface FcmSendResult {
    successCount: number;
    failureCount: number;
    responses: Array<{
        success: boolean;
        messageId?: string;
        error?: { code: string; message: string };
    }>;
}
