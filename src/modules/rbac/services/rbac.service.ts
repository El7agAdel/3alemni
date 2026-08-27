import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { RoleCreatedEvent, RoleDeletedEvent, RolePermissionsChangedEvent, RoleUpdatedEvent } from "@common/events";
import { AppExceptions } from "@common/exceptions";
import { AuthenticatedUser, ListQueryOptions, PaginatedResult } from "@common/interfaces";
import { ObjectUtil, QueryBuilderUtil } from "@common/utils";
import { Permission, Role } from "@generated/client";
import { CacheService, CacheTTL } from "@infra/cache";
import { LoggingService } from "@infra/logging";

import { RbacCacheKeys, RoleQuery } from "../constants";
import { CreateRoleDto, RoleQueryDto, UpdateRoleDto } from "../dto/requests";
import { PermissionRepository, RoleRepository } from "../repositories";
import { RbacPolicyService } from "../services/rbac-policy.service";

@Injectable()
export class RbacService {
    constructor(
        private readonly logger: LoggingService,
        private readonly cache: CacheService,
        private readonly emitter: EventEmitter2,
        private readonly permissionRepo: PermissionRepository,
        private readonly roleRepo: RoleRepository,
        private readonly policyService: RbacPolicyService,
    ) {
        this.logger.setContext(RbacService.name);
    }

    /**
     * Find all permissions.
     */
    async listPermissions(): Promise<Permission[]> {
        return this.cache.getOrSet(
            RbacCacheKeys.PERMISSIONS_LIST,
            () => this.permissionRepo.findAll(),
            CacheTTL.MEDIUM,
        );
    }

    /**
     * List all roles with optional filtering.
     */
    async listRoles(query?: RoleQueryDto): Promise<PaginatedResult<Role>> {
        const options = this.buildRoleQuery(query);

        return this.cache.getOrSet(
            RbacCacheKeys.ROLES_LIST_QUERY({ ...query }),
            () => this.roleRepo.list(options),
            CacheTTL.MEDIUM,
        );
    }

    /**
     * Find a role by ID.
     */
    async findRoleById(id: string): Promise<Role> {
        const role = await this.roleRepo.findById(id);

        if (!role) throw AppExceptions.notFound("Role", id);

        return role;
    }

    /**
     * Find a role by ID and include its details.
     */
    async findByIdWithDetails(id: string): Promise<Role> {
        const roleWithDetails = await this.roleRepo.findByIdWithDetails(id);

        if (!roleWithDetails) throw AppExceptions.notFound("Role", id);

        return roleWithDetails;
    }

    /**
     * Create a new role with permissions if provided.
     * If permissions are provided, a policy checks if the actor has the permissions to grant them.
     */
    async createRole(actor: AuthenticatedUser, dto: CreateRoleDto): Promise<Role> {
        const existing = await this.roleRepo.findByName(dto.name);

        if (existing) throw AppExceptions.alreadyExists("Role", "name", dto.name);

        if (dto.permissionKeys && dto.permissionKeys.length > 0) {
            this.policyService.assertCanGrantPermissions(actor, dto.permissionKeys);
        }

        const role = await this.roleRepo.create({
            name: dto.name,
            description: dto.description,
        });

        if (dto.permissionKeys && dto.permissionKeys.length > 0) {
            const permissions = await this.permissionRepo.findByKeys(dto.permissionKeys);

            await this.roleRepo.setRolePermissions(
                role.id,
                permissions.map((p) => p.id),
            );
        }

        this.emitter.emit(RoleCreatedEvent.eventName, new RoleCreatedEvent(role.id, role.name, actor.id));

        this.logger.info("Role created", { roleId: role.id, roleName: role.name });

        return role;
    }

    /**
     * Update a role. Blocks any updates on system roles.
     */
    async updateRole(actor: AuthenticatedUser, roleId: string, dto: UpdateRoleDto): Promise<Role> {
        const role = await this.findRoleById(roleId);

        await this.policyService.assertRoleIsMutable(roleId);

        if (dto.name && dto.name !== role.name) {
            const existing = await this.roleRepo.findByName(dto.name);

            if (existing) throw AppExceptions.alreadyExists("Role", "name", dto.name);
        }

        const updated = await this.roleRepo.update(roleId, dto);

        this.emitter.emit(
            RoleUpdatedEvent.eventName,
            new RoleUpdatedEvent(roleId, ObjectUtil.stripUndefined(dto), actor.id),
        );

        this.logger.info("Role updated", { roleId, changes: dto });

        return updated;
    }

    /**
     * Delete a role. Prevents deletion if the role is assigned to users.
     */
    async deleteRole(actor: AuthenticatedUser, roleId: string): Promise<void> {
        const role = await this.findRoleById(roleId);

        await this.policyService.assertRoleCanBeDeleted(roleId);

        await this.roleRepo.delete(roleId);

        this.emitter.emit(RoleDeletedEvent.eventName, new RoleDeletedEvent(roleId, role.name, actor.id));

        this.logger.info("Role deleted", { roleId, roleName: role.name });
    }

    /**
     * Build query options for role listing.
     */
    private buildRoleQuery(query?: RoleQueryDto): ListQueryOptions {
        return QueryBuilderUtil.create()
            .paginate(query)
            .sort(query, RoleQuery.sort)
            .search(query?.search, RoleQuery.search)
            .filter("isSystem", query?.isSystem)
            .includeRelations(query?.include, RoleQuery.include)
            .build();
    }

    /**
     * Get a list of permissions associated with a role.
     */
    async getRolePermissions(roleId: string): Promise<Permission[]> {
        await this.findRoleById(roleId);

        return this.roleRepo.getRolePermissions(roleId);
    }

    /**
     * Add new permissions using an array of permission ids without removing existing ones.
     */
    async addRolePermissions(
        actor: AuthenticatedUser,
        roleId: string,
        permissionKeys: string[],
    ): Promise<Permission[]> {
        await this.findRoleById(roleId);

        await this.policyService.assertRoleIsMutable(roleId);
        this.policyService.assertCanGrantPermissions(actor, permissionKeys);

        const current = await this.roleRepo.getRolePermissions(roleId);
        const currentKeys = current.map((permission) => permission.key);
        const mergedKeys = [...new Set([...currentKeys, ...permissionKeys])];

        const permissions = await this.permissionRepo.findByKeys(mergedKeys);

        await this.roleRepo.setRolePermissions(
            roleId,
            permissions.map((p) => p.id),
        );

        const added = permissionKeys.filter((key) => !currentKeys.includes(key));

        this.emitter.emit(
            RolePermissionsChangedEvent.eventName,
            new RolePermissionsChangedEvent(roleId, added, [], actor.id),
        );

        this.logger.info("Role permissions added", { roleId, added });

        return permissions;
    }

    /**
     * Completely overwrite role permissions with new ones.
     */
    async setRolePermissions(
        actor: AuthenticatedUser,
        roleId: string,
        permissionKeys: string[],
    ): Promise<Permission[]> {
        await this.findRoleById(roleId);

        await this.policyService.assertRoleIsMutable(roleId);
        this.policyService.assertCanGrantPermissions(actor, permissionKeys);

        const currentPermissions = await this.roleRepo.getRolePermissions(roleId);
        const currentKeys = currentPermissions.map((permission) => permission.key);

        const newPermissions = await this.permissionRepo.findByKeys(permissionKeys);
        const newKeys = newPermissions.map((p) => p.key);

        await this.roleRepo.setRolePermissions(
            roleId,
            newPermissions.map((p) => p.id),
        );

        const added = newKeys.filter((key) => !currentKeys.includes(key));
        const removed = currentKeys.filter((key) => !newKeys.includes(key));

        this.emitter.emit(
            RolePermissionsChangedEvent.eventName,
            new RolePermissionsChangedEvent(roleId, added, removed, actor.id),
        );

        this.logger.info("Role permissions updated", { roleId, added, removed });

        return newPermissions;
    }

    /**
     * Remove a single permission from a role.
     * Doesn't check if the actor has the permission on purpose - removing never escalates privileges.
     */
    async removeRolePermission(actor: AuthenticatedUser, roleId: string, permissionKey: string): Promise<void> {
        await this.findRoleById(roleId);

        await this.policyService.assertRoleIsMutable(roleId);

        const currentPermissions = await this.roleRepo.getRolePermissions(roleId);
        const currentKeys = currentPermissions.map((permission) => permission.key);

        const newKeys = currentKeys.filter((key) => key !== permissionKey);

        if (newKeys.length === currentKeys.length) {
            throw AppExceptions.notFound("RolePermission", permissionKey);
        }

        const permissions = await this.permissionRepo.findByKeys(newKeys);

        await this.roleRepo.setRolePermissions(
            roleId,
            permissions.map((p) => p.id),
        );

        this.emitter.emit(
            RolePermissionsChangedEvent.eventName,
            new RolePermissionsChangedEvent(roleId, [], [permissionKey], actor.id),
        );

        this.logger.info("Role permission removed", { roleId, permissionKey });
    }
}
