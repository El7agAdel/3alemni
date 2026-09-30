import { Injectable } from "@nestjs/common";

import { CacheService, CacheTTL } from "@infra/cache";
import { LoggingService } from "@infra/logging";

import { DEFAULT_SIGNUP_ROLE, RbacCacheKeys } from "../constants";
import { PermissionRepository, RoleRepository, UserRoleRepository } from "../repositories";

@Injectable()
export class RbacPublicService {
    constructor(
        private readonly logger: LoggingService,
        private readonly cache: CacheService,
        private readonly permissionRepo: PermissionRepository,
        private readonly roleRepo: RoleRepository,
        private readonly userRoleRepo: UserRoleRepository,
    ) {
        this.logger.setContext(RbacPublicService.name);
    }

    /**
     * Give a newly registered user the default signup role.
     * A missing role is logged rather than thrown, so signup never fails because of seed data.
     */
    async assignDefaultRole(userId: string): Promise<void> {
        const role = await this.roleRepo.findByName(DEFAULT_SIGNUP_ROLE);

        if (!role) {
            this.logger.warn("Default signup role not found, user left without a role", {
                userId,
                roleName: DEFAULT_SIGNUP_ROLE,
            });

            return;
        }

        await this.userRoleRepo.assign(userId, role.id, userId);
        await this.invalidateUserCache(userId);

        this.logger.info("Default signup role assigned", { userId, roleName: role.name });
    }

    /**
     * Get a user's permission keys flattened into a single array.
     */
    async getUserPermissions(userId: string): Promise<string[]> {
        return this.cache.getOrSet(
            RbacCacheKeys.USER_PERMISSIONS(userId),
            async () => {
                const permissions = await this.permissionRepo.findByUserId(userId);

                return permissions.map((permission) => permission.key);
            },
            CacheTTL.MEDIUM,
        );
    }

    /**
     * Get a user's roles. Returns a slimmed-down version of the role object.
     */
    async getUserRoles(userId: string): Promise<{ id: string; name: string; isSystem: boolean }[]> {
        return this.cache.getOrSet(
            RbacCacheKeys.USER_ROLES(userId),
            async () => {
                const userRoles = await this.userRoleRepo.findByUserId(userId);

                return userRoles.map((userRole) => ({
                    id: userRole.role.id,
                    name: userRole.role.name,
                    isSystem: userRole.role.isSystem,
                }));
            },
            CacheTTL.MEDIUM,
        );
    }

    /**
     * Check if the user has any system role.
     */
    async hasSystemRole(userId: string): Promise<boolean> {
        const roles = await this.getUserRoles(userId);

        return roles.some((r) => r.isSystem);
    }

    /**
     * Invalidate a single user's permissions and roles cache.
     * Used when user roles are assigned or removed.
     */
    async invalidateUserCache(userId: string): Promise<void> {
        await this.cache.deleteMany(RbacCacheKeys.USER_PERMISSIONS(userId), RbacCacheKeys.USER_ROLES(userId));

        this.logger.debug("User RBAC cache invalidated", { userId });
    }

    /**
     * Invalidate the permissions list cache.
     * Used when permissions are modified.
     */
    async invalidatePermissionsListCache(): Promise<void> {
        await this.cache.delete(RbacCacheKeys.PERMISSIONS_LIST);

        this.logger.debug("Permissions list cache invalidated");
    }

    /**
     * Invalidate the roles list cache and query cache.
     * Used when a role is created, updated, or deleted.
     */
    async invalidateRolesListCache(): Promise<void> {
        await this.cache.deleteByPattern(RbacCacheKeys.ROLES_LIST_PATTERN);

        this.logger.debug("Roles list cache invalidated");
    }

    /**
     * Invalidate cache for all users who have a specific role.
     * Used when a role's permissions change.
     */
    async invalidateUsersWithRoleCache(roleId: string): Promise<void> {
        const userIds = await this.userRoleRepo.getUserIdsWithRole(roleId);

        await Promise.all(userIds.map((userId) => this.invalidateUserCache(userId)));

        this.logger.debug("Users with role cache invalidated", {
            roleId,
            userCount: userIds.length,
        });
    }
}
