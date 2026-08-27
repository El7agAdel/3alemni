/**
 * Abstract base class for every email template.
 */
export abstract class BaseEmail<T extends object = object> {
    abstract readonly templateName: string;

    abstract readonly subject: string;

    public from?: string;

    public attachments?: Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string;
    }>;

    abstract getContext(): T;
}
