/**
 * Abstract class for every WhatsApp template.
 */
export abstract class BaseTemplate<T extends object = Record<string, unknown>> {
    abstract readonly templateName: string;

    abstract readonly hasButton: boolean;

    abstract getContext(): T;
}
