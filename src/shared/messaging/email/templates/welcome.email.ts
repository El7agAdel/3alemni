import { appName } from "@common/constants";

import { BaseEmail } from "./base-email";

export interface WelcomeEmailContext {
    recipientName?: string;
}

export class WelcomeEmail extends BaseEmail<WelcomeEmailContext & { preheader: string }> {
    readonly templateName = "welcome";
    readonly subject = `Welcome to ${appName()}`;

    constructor(private readonly context: WelcomeEmailContext) {
        super();
    }

    getContext(): WelcomeEmailContext & { preheader: string } {
        return {
            ...this.context,
            preheader: "Your account is ready",
        };
    }
}
