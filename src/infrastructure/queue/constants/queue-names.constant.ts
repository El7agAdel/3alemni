/**
 * Registered queue names.
 * Group jobs that share infrastructure characteristics.
 */
export const QUEUE_NAMES = {
    EMAIL: "Email",
    WHATSAPP: "WhatsApp",
    PUSH: "Push",
    BROADCAST: "Broadcast",
    TASKS: "Tasks",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
