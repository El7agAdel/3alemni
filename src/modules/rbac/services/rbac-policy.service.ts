import { Injectable } from "@nestjs/common";

import { DomainExceptions } from "@common/exceptions";
import { AuthenticatedUser } from "@common/interfaces";
import { LoggingService } from "@infra/logging";

import { RoleRepository, UserRoleRepository } from "../repositories";

@Injectable()
export class RbacPolicyService {
    constructor(
        private readonly logger: LoggingService,
        private readonly roleRepo: RoleRepository,
        private readonly userRoleRepository: UserRoleRepository,
    ) {
        this.logger.setContext(RbacPolicyService.name);
    }

    /**
     * System users cannot be edited by anyone unless the actor is also a system user.
     */
    async assertCanModifyUser(actor: AuthenticatedUser, targetUserId: string): Promise<void> {
        if (actor.hasSystemRole) return;

        const targetHasSystemRole = await this.userRoleRepository.hasSystemRole(targetUserId);

        if (targetHasSystemRole) {
            this.logger.warn("Blocked an attempt to modify system user", {
                actorId: actor.id,
                targetUserId,
            });

            throw DomainExceptions.systemUserProtected();
        }
    }

    /**
     * Can't grant permissions you don't have.
     * If any permission in the set is not in the actor's permissions, the operation is blocked.
     * System role users are an exception.
     */
    assertCanGrantPermissions(actor: AuthenticatedUser, permissionKeys: string[]): void {
        if (actor.hasSystemRole) return;

        const actorPermissionSet = new Set(actor.permissions);
        const forbidden = permissionKeys.filter((key) => !actorPermissionSet.has(key));

        if (forbidden.length > 0) {
            this.logger.warn("Blocked a privilege escalation attempt", {
                actorId: actor.id,
                attemptedPermissions: forbidden,
            });

            throw DomainExceptions.privilegeEscalation(forbidden);
        }
    }

    /**
     * Block a user from adding new roles to themselves. Removing roles is still allowed.
     */
    assertCannotSelfElevate(actor: AuthenticatedUser, targetUserId: string): void {
        if (actor.id === targetUserId) {
            this.logger.warn("Self-elevation attempt blocked", { actorId: actor.id });

            throw DomainExceptions.cannotSelfElevate();
        }
    }

    /**
     * Block any action on system roles.
     */
    async assertRoleIsMutable(roleId: string): Promise<void> {
        const role = await this.roleRepo.findById(roleId);

        if (!role) return;

        if (role.isSystem) {
            this.logger.warn("Blocked an attempt to modify system role", { roleId });

            throw DomainExceptions.systemRoleImmutable();
        }
    }

    /**
     * Check if a role can be deleted based on its usage.
     * System roles cannot be deleted anyway.
     */
    async assertRoleCanBeDeleted(roleId: string): Promise<void> {
        await this.assertRoleIsMutable(roleId);

        const usersCount = await this.roleRepo.countUsersWithRole(roleId);

        if (usersCount > 0) {
            throw DomainExceptions.roleInUse(usersCount);
        }
    }

    /**
     * Validate that a role assignment doesn't violate escalation rules.
     */
    async assertCanAssignRole(actor: AuthenticatedUser, targetUserId: string, roleId: string): Promise<void> {
        this.assertCannotSelfElevate(actor, targetUserId);

        await this.assertCanModifyUser(actor, targetUserId);

        const rolePermissions = await this.roleRepo.getRolePermissions(roleId);
        this.assertCanGrantPermissions(
            actor,
            rolePermissions.map((p) => p.key),
        );
    }

    /**
     * Validate role assignment for multiple roles at once against multiple policies.
     */
    async assertCanAssignRoles(actor: AuthenticatedUser, targetUserId: string, roleIds: string[]): Promise<void> {
        this.assertCannotSelfElevate(actor, targetUserId);

        await this.assertCanModifyUser(actor, targetUserId);

        if (actor.hasSystemRole) return;

        if (roleIds.length === 0) return;

        const allPermissionKeys: string[] = [];

        for (const roleId of roleIds) {
            const permissions = await this.roleRepo.getRolePermissions(roleId);
            allPermissionKeys.push(...permissions.map((permission) => permission.key));
        }

        const uniqueKeys = [...new Set(allPermissionKeys)];
        this.assertCanGrantPermissions(actor, uniqueKeys);
    }
}
