import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiSuccessResponse } from "@infra/swagger";

import { Permissions } from "../constants";
import { RequirePermission } from "../decorators";
import { SetPermissionDto } from "../dto/requests";
import { PermissionDto } from "../dto/responses";
import { RbacService } from "../services";

@ApiTags("Role Permissions")
@ApiBearerAuth()
@Controller("roles/:roleId/permissions")
export class RolePermissionsController {
    constructor(private readonly rbacService: RbacService) {}

    @Get()
    @RequirePermission(Permissions.Role.READ)
    @Serialize(PermissionDto)
    @ApiOperation({ summary: "List role's permissions" })
    @ApiSuccessResponse({
        description: "Role permissions retrieved successfully",
        type: [PermissionDto],
    })
    @ResponseMessage("Role permissions retrieved successfully")
    async listPermissions(@Param("roleId") roleId: string) {
        return this.rbacService.getRolePermissions(roleId);
    }

    @Post()
    @RequirePermission(Permissions.Role.UPDATE)
    @Serialize(PermissionDto)
    @ApiOperation({ summary: "Add permissions to a role" })
    @ApiSuccessResponse({
        description: "Permissions added successfully",
        type: [PermissionDto],
    })
    @ResponseMessage("Permissions added successfully")
    async addPermissions(
        @CurrentUser() user: AuthenticatedUser,
        @Param("roleId") roleId: string,
        @Body() dto: SetPermissionDto,
    ) {
        return this.rbacService.addRolePermissions(user, roleId, dto.permissionKeys);
    }

    @Put()
    @RequirePermission(Permissions.Role.UPDATE)
    @Serialize(PermissionDto)
    @ApiOperation({ summary: "Replace all role permissions" })
    @ApiSuccessResponse({
        description: "Role permissions updated successfully",
        type: [PermissionDto],
    })
    @ResponseMessage("Role permissions updated successfully")
    async setPermissions(
        @CurrentUser() user: AuthenticatedUser,
        @Param("roleId") roleId: string,
        @Body() dto: SetPermissionDto,
    ) {
        return this.rbacService.setRolePermissions(user, roleId, dto.permissionKeys);
    }

    @Delete(":permissionKey")
    @RequirePermission(Permissions.Role.UPDATE)
    @ApiOperation({ summary: "Remove a permission from role" })
    @ApiSuccessResponse({ description: "Permission removed successfully" })
    @ResponseMessage("Permission removed successfully")
    async removePermission(
        @CurrentUser() user: AuthenticatedUser,
        @Param("roleId") roleId: string,
        @Param("permissionKey") permissionKey: string,
    ) {
        await this.rbacService.removeRolePermission(user, roleId, permissionKey);
    }
}
