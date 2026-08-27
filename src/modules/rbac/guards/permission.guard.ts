import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { AppExceptions } from "@common/exceptions";
import { ExtendedRequest } from "@common/interfaces";
import { LoggingService } from "@infra/logging";

import { PERMISSIONS_ALL_KEY, PERMISSIONS_ANY_KEY } from "../decorators";

/**
 * Guard that checks if the user has the required permissions to access a route.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly logger: LoggingService,
    ) {
        this.logger.setContext(PermissionGuard.name);
    }

    canActivate(context: ExecutionContext): boolean {
        const allPermissions =
            this.reflector.getAllAndOverride<string[]>(PERMISSIONS_ALL_KEY, [
                context.getHandler(),
                context.getClass(),
            ]) ?? [];

        const anyPermissions =
            this.reflector.getAllAndOverride<string[]>(PERMISSIONS_ANY_KEY, [
                context.getHandler(),
                context.getClass(),
            ]) ?? [];

        if (!allPermissions.length && !anyPermissions.length) return true;

        const request = context.switchToHttp().getRequest<ExtendedRequest>();

        const user = request.user;

        if (!user) throw AppExceptions.notAuthenticated();

        // System role bypasses all permission checks
        if (user.hasSystemRole) return true;

        const userPermissions = new Set(user.permissions);

        const hasAll = this.hasAllPermissions(allPermissions, userPermissions);
        const hasAny = this.hasAnyPermission(anyPermissions, userPermissions);

        if (!hasAll || !hasAny) {
            this.logger.warn("Permission denied", {
                userId: user.id,
                required: { all: allPermissions, any: anyPermissions },
                userPermissions: user.permissions,
            });

            throw AppExceptions.forbidden("Missing required permission(s)");
        }

        return true;
    }

    /**
     * Check if a user has all the specified permissions.
     */
    private hasAllPermissions(requiredPerms: string[], userPerms: Set<string>): boolean {
        if (!requiredPerms.length) return true;

        return requiredPerms.every((requiredPerm) => this.hasPermission(requiredPerm, userPerms));
    }

    /**
     * Check if a user has any of the specified permissions.
     */
    private hasAnyPermission(requiredPerms: string[], userPerms: Set<string>): boolean {
        if (!requiredPerms.length) return true;

        return requiredPerms.some((requiredPerm) => this.hasPermission(requiredPerm, userPerms));
    }

    /**
     * Check if a user has a specific permission.
     */
    private hasPermission(requiredPerm: string, userPerms: Set<string>) {
        return userPerms.has(requiredPerm);
    }
}
