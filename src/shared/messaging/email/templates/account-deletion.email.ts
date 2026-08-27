import { BaseEmail } from "./base-email";

export interface AccountDeletionEmailContext {
    recipientName?: string;
    scheduledDate: string;
    gracePeriodDays: number;
}

export class AccountDeletionEmail extends BaseEmail<AccountDeletionEmailContext> {
    readonly templateName = "account-deletion";
    readonly subject = "Your account is scheduled for deletion";

    constructor(private readonly context: AccountDeletionEmailContext) {
        super();
    }

    getContext(): AccountDeletionEmailContext & { preheader: string } {
        return {
            ...this.context,
            preheader: `Your account will be deleted on ${this.context.scheduledDate}`,
        };
    }
}
