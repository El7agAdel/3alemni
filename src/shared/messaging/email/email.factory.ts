import { Injectable } from "@nestjs/common";

import {
    AccountDeletionEmail,
    AccountDeletionEmailContext,
    BaseEmail,
    BroadcastEmail,
    BroadcastEmailInput,
    OtpEmail,
    OtpEmailInput,
    SecurityAlertEmail,
    SecurityAlertEmailContext,
    WelcomeEmail,
    WelcomeEmailContext,
} from "./templates";

/**
 * Factory for constructing email instances from serialized job data.
 * Maps a template name and its serialized context back to the proper class.
 */
@Injectable()
export class EmailFactory {
    private readonly templates: Record<string, (context: Record<string, unknown>) => BaseEmail<object>> = {
        "otp": (ctx) => new OtpEmail(ctx as unknown as OtpEmailInput),
        "account-deletion": (ctx) => new AccountDeletionEmail(ctx as unknown as AccountDeletionEmailContext),
        "broadcast": (ctx) => new BroadcastEmail(ctx as unknown as BroadcastEmailInput),
        "welcome": (ctx: WelcomeEmailContext) => new WelcomeEmail(ctx),
        "security-alert": (ctx) => new SecurityAlertEmail(ctx as unknown as SecurityAlertEmailContext),
    };

    /**
     * Create an email instance from serialized data.
     */
    create(templateName: string, context: Record<string, unknown>): BaseEmail<object> {
        const EmailClass = this.templates[templateName];

        if (!EmailClass) throw new Error(`Unknown email template: ${templateName}`);

        return EmailClass(context);
    }

    /**
     * Check if a certain template exists in the registry.
     */
    hasTemplate(templateName: string): boolean {
        return templateName in this.templates;
    }

    /**
     * Get a list of all registered templates.
     */
    getTemplateNames(): string[] {
        return Object.keys(this.templates);
    }
}
