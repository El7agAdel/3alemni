import { Injectable } from "@nestjs/common";

import {
    BaseTemplate,
    BroadcastTemplate,
    BroadcastTemplateContext,
    broadcastTemplateName,
    OtpTemplate,
    OtpTemplateContext,
} from "./templates";

/**
 * Factory for constructing WhatsApp template instances from serialized job data.
 * Maps a template name and its serialized context back to the proper class.
 */
@Injectable()
export class WhatsAppFactory {
    // Built in the constructor, not as a field initializer: the broadcast template
    // name is derived from APP_NAME, which is only in process.env once ConfigModule
    // has loaded - after this class is imported, but before it is instantiated.
    private readonly templates: Record<string, (context: Record<string, unknown>) => BaseTemplate>;

    constructor() {
        this.templates = {
            otp_verification: (ctx) => new OtpTemplate(ctx as unknown as OtpTemplateContext),
            [broadcastTemplateName()]: (ctx) => new BroadcastTemplate(ctx as unknown as BroadcastTemplateContext),
        };
    }

    /**
     * Create a template instance from serialized data.
     */
    create(templateName: string, context: Record<string, unknown>): BaseTemplate {
        const TemplateClass = this.templates[templateName];

        if (!TemplateClass) throw new Error(`Unknown WhatsApp template: ${templateName}`);

        return TemplateClass(context);
    }

    /**
     * Check if a certain template exists in the registry.
     */
    hasTemplate(templateName: string): boolean {
        return templateName in this.templates;
    }
}
