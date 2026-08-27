import { BaseEmail } from "./base-email";

export interface BroadcastEmailInput {
    title: string;
    body: string;
}

export interface BroadcastEmailContext extends BroadcastEmailInput {
    preheader: string;
}

export class BroadcastEmail extends BaseEmail<BroadcastEmailContext> {
    readonly templateName = "broadcast";
    readonly subject: string;

    constructor(private readonly input: BroadcastEmailInput) {
        super();

        this.subject = input.title;
    }

    getContext(): BroadcastEmailContext {
        return {
            ...this.input,
            preheader: this.input.body.slice(0, 90),
        };
    }
}
