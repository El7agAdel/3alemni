import { CanActivate, ExecutionContext, Injectable, Type } from "@nestjs/common";
import { ModuleRef, Reflector } from "@nestjs/core";

import { POLICIES_KEY, POLICY_BYPASS_KEY } from "@common/decorators";
import { ExtendedRequest, IPolicyHandler, PolicyHandler } from "@common/interfaces";

@Injectable()
export class PoliciesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly moduleRef: ModuleRef,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policyHandlers =
            this.reflector.getAllAndOverride<PolicyHandler[]>(POLICIES_KEY, [
                context.getHandler(),
                context.getClass(),
            ]) || [];

        // Skip if no policy handlers
        if (policyHandlers.length === 0) return true;

        const request = context.switchToHttp().getRequest<ExtendedRequest>();

        if (!request.user) return false;

        const user = request.user;

        // System role bypasses every policy
        if (user.hasSystemRole) return true;

        // Check for route-level policy bypass
        const bypassPermissions =
            this.reflector.getAllAndOverride<string[]>(POLICY_BYPASS_KEY, [context.getHandler(), context.getClass()]) ||
            [];

        if (bypassPermissions.length > 0 && this.hasAnyPermission(user.permissions, bypassPermissions)) return true;

        // Check if all policies are satisfied
        const results = await Promise.all(
            policyHandlers.map((policyHandler) => this.evaluatePolicy(policyHandler, context)),
        );

        return results.every(Boolean);
    }

    /**
     * Evaluates a policy handler.
     */
    private async evaluatePolicy(policyHandler: PolicyHandler, context: ExecutionContext): Promise<boolean> {
        if (typeof policyHandler === "function" && !this.isPolicyClass(policyHandler)) {
            return policyHandler(context);
        }

        if (this.isPolicyClass(policyHandler)) {
            const policyInstance = this.moduleRef.get(policyHandler, {
                strict: false,
            });

            return policyInstance.handle(context);
        }

        return policyHandler.handle(context);
    }

    /**
     * Checks if the handler is a class.
     */
    private isPolicyClass(policyHandler: PolicyHandler): policyHandler is Type<IPolicyHandler> {
        return (
            typeof policyHandler === "function" &&
            "prototype" in policyHandler &&
            typeof (policyHandler as { prototype: unknown }).prototype === "object" &&
            typeof (policyHandler as { prototype: IPolicyHandler }).prototype.handle === "function"
        );
    }

    /**
     * Check if the user has any of the provided permissions.
     */
    private hasAnyPermission(userPermissions: string[], bypassPermissions: string[]): boolean {
        const set = new Set(userPermissions.map((permissions) => permissions.toLowerCase()));

        return bypassPermissions.some((permissions) => set.has(permissions.toLowerCase()));
    }
}
