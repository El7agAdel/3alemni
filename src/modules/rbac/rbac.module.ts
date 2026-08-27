import { Module } from "@nestjs/common";

import { PermissionsController, RolePermissionsController, RolesController, UserRolesController } from "./controllers";
import { RbacEventHandlers } from "./handlers";
import { PermissionRepository, RoleRepository, UserRoleRepository } from "./repositories";
import { RbacPolicyService, RbacPublicService, RbacService, UserRoleService } from "./services";

@Module({
    controllers: [PermissionsController, RolesController, RolePermissionsController, UserRolesController],
    providers: [
        // Repositories
        RoleRepository,
        PermissionRepository,
        UserRoleRepository,

        // Services
        RbacService,
        RbacPublicService,
        RbacPolicyService,
        UserRoleService,

        // Event handlers
        ...RbacEventHandlers,
    ],
    exports: [RbacPublicService],
})
export class RbacModule {}
