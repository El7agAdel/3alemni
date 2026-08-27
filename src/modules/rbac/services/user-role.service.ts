import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { UserRoleAssignedEvent, UserRoleRemovedEvent } from "@common/events";
import { AppExceptions } from "@common/exceptions";
import { AuthenticatedUser } from "@common/interfaces";
import { Role } from "@generated/client";
import { LoggingService } from "@infra/logging";

import { RoleRepository, UserRoleRepository } from "../repositories";
import { RbacPolicyService } from "../services";

@Injectable()
export class UserRoleService {
    constructor(
        private readonly logger: LoggingService,
        private readonly eventEmitter: EventEmitter2,
        private readonly roleRepo: RoleRepository,
        private readonly userRoleRepo: UserRoleRepository,
        private readonly policyService: RbacPolicyService,
    ) {
        this.logger.setContext(UserRoleService.name);
    }

    /**
     * Find all roles assigned to a user.
     */
    async getUserRoles(userId: string): Promise<Role[]> {
        const userRoles = await this.userRoleRepo.findByUserId(userId);

        return userRoles.map((userRole) => userRole.role);
    }

    /**
     * Add new roles using an array of role ids without removing existing ones.
     */
    async addUserRoles(actor: AuthenticatedUser, targetUserId: string, roleIds: string[]): Promise<Role[]> {
        const roles = await this.validateRolesExist(roleIds);

        await this.policyService.assertCanAssignRoles(actor, targetUserId, roleIds);

        const currentRoles = await this.userRoleRepo.findByUserId(targetUserId);
        const currentIds = currentRoles.map((userRole) => userRole.roleId);
        const mergedIds = [...new Set([...currentIds, ...roleIds])];

        const { added } = await this.userRoleRepo.setRoles(targetUserId, mergedIds, actor.id);

        this.emitRoleAssignedEvents(targetUserId, added, roles, actor.id);

        this.logger.info("Roles added to user", { targetUserId, added });

        return this.getUserRoles(targetUserId);
    }

    /**
     * Replace all roles on a user.
     */
    async setUserRoles(actor: AuthenticatedUser, targetUserId: string, roleIds: string[]): Promise<Role[]> {
        const roles = await this.validateRolesExist(roleIds);

        await this.policyService.assertCanAssignRoles(actor, targetUserId, roleIds);

        const { added, removed } = await this.userRoleRepo.setRoles(targetUserId, roleIds, actor.id);

        const removedRoles = removed.length > 0 ? await this.roleRepo.findManyByIds(removed) : [];

        this.emitRoleRemovedEvents(targetUserId, removed, removedRoles, actor.id);
        this.emitRoleAssignedEvents(targetUserId, added, roles, actor.id);

        this.logger.info("User roles replaced", { targetUserId, added, removed });

        return this.getUserRoles(targetUserId);
    }

    /**
     * Remove a single role from a user.
     */
    async removeUserRole(actor: AuthenticatedUser, targetUserId: string, roleId: string): Promise<void> {
        await this.policyService.assertCanModifyUser(actor, targetUserId);

        const existing = await this.userRoleRepo.findByUserIdAndRoleId(targetUserId, roleId);

        if (!existing) throw AppExceptions.notFound("UserRole", roleId);

        await this.userRoleRepo.remove(targetUserId, roleId);

        this.eventEmitter.emit(
            UserRoleRemovedEvent.eventName,
            new UserRoleRemovedEvent(targetUserId, roleId, existing.role.name, actor.id),
        );

        this.logger.info("Role removed from user", { targetUserId, roleId });
    }

    /**
     * Validate that all role IDs exist in the database.
     */
    private async validateRolesExist(roleIds: string[]): Promise<Role[]> {
        if (roleIds.length === 0) return [];

        const roles = await this.roleRepo.findManyByIds(roleIds);
        const foundIds = roles.map((role) => role.id);
        const missing = roleIds.filter((id) => !foundIds.includes(id));

        if (missing.length > 0) {
            throw AppExceptions.badRequest("Invalid role IDs", { roleIds: missing });
        }

        return roles;
    }

    /**
     * Emit a user-role-assigned event for each added role.
     */
    private emitRoleAssignedEvents(userId: string, addedIds: string[], roles: Role[], assignedBy: string): void {
        const roleMap = new Map(roles.map((role) => [role.id, role.name]));

        for (const roleId of addedIds) {
            const roleName = roleMap.get(roleId);

            if (roleName) {
                this.eventEmitter.emit(
                    UserRoleAssignedEvent.eventName,
                    new UserRoleAssignedEvent(userId, roleId, roleName, assignedBy),
                );
            }
        }
    }

    /**
     * Emit a user-role-removed event for each removed role.
     */
    private emitRoleRemovedEvents(userId: string, removedIds: string[], roles: Role[], removedBy: string): void {
        const roleMap = new Map(roles.map((role) => [role.id, role.name]));

        for (const roleId of removedIds) {
            const roleName = roleMap.get(roleId);

            if (roleName) {
                this.eventEmitter.emit(
                    UserRoleRemovedEvent.eventName,
                    new UserRoleRemovedEvent(userId, roleId, roleName, removedBy),
                );
            }
        }
    }
}
