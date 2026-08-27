import { appSnake } from "@common/constants";

import { BaseTemplate } from "./base-template";

export type BroadcastTemplateContext = {
    title: string;
    body: string;
};

/**
 * Name of the message template registered with Meta, which is per-business and
 * therefore carries the app name: "my_app_broadcast".
 */
export const broadcastTemplateName = (): string => `${appSnake()}_broadcast`;

export class BroadcastTemplate extends BaseTemplate<BroadcastTemplateContext> {
    readonly templateName = broadcastTemplateName();
    readonly hasButton = false;

    constructor(private readonly context: BroadcastTemplateContext) {
        super();
    }

    getContext(): BroadcastTemplateContext {
        return this.context;
    }
}
