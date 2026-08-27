import { ExecutionContext } from "@nestjs/common";

import { ExtendedRequest } from "@common/interfaces";

import { IPolicyHandler } from "../interfaces";

/**
 * Abstract policy for checking resource ownership.
 * Extended by concrete policies that resolve the owner id of a resource.
 * Returns false if the caller's id is not equal to the owner id.
 */
export abstract class OwnerPolicy implements IPolicyHandler {
    protected constructor(private readonly paramKey: string = "id") {}

    abstract resolveOwnerId(resourceId: string): Promise<string | null>;

    async handle(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<ExtendedRequest>();
        const user = request.user;
        const resourceId = request.params[this.paramKey];

        if (!user || !resourceId || Array.isArray(resourceId)) return false;

        const ownerId = await this.resolveOwnerId(resourceId);

        return ownerId === user.id;
    }
}
