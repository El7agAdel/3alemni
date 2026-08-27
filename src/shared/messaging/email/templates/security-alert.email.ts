import { BaseEmail } from "./base-email";

export interface SecurityAlertEmailContext {
    recipientName?: string;
    event: string;
    occurredAt: string;
    ipAddress?: string;
}

export class SecurityAlertEmail extends BaseEmail<SecurityAlertEmailContext & { preheader: string }> {
    readonly templateName = "security-alert";
    readonly subject = "Security alert on your account";

    constructor(private readonly context: SecurityAlertEmailContext) {
        super();
    }

    getContext(): SecurityAlertEmailContext & { preheader: string } {
        return {
            ...this.context,
            preheader: this.context.event,
        };
    }
}
