import { BaseTemplate } from "./base-template";

export type OtpTemplateContext = {
    otp: string;
};

export class OtpTemplate extends BaseTemplate<OtpTemplateContext> {
    readonly templateName = "otp_verification";
    readonly hasButton = true;

    constructor(private readonly context: OtpTemplateContext) {
        super();
    }

    getContext(): OtpTemplateContext {
        return this.context;
    }
}
