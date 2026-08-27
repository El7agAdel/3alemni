import { ExecutionContext } from "@nestjs/common";

import { ExtendedRequest, IPolicyHandler } from "@common/interfaces";

/**
 * Prevents a user from performing an action on themselves.
 * Used for operations where self-targeting is not allowed (e.g. an admin suspending themselves).
 * Returns false if the caller's id equals the target id.
 */
export class NotSelfPolicy implements IPolicyHandler {
    constructor(private readonly paramKey: string = "id") {}

    handle(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<ExtendedRequest>();
        const user = request.user;
        const targetId = request.params[this.paramKey];

        if (!user || !targetId || Array.isArray(targetId)) return false;

        return user.id !== targetId;
    }
}
