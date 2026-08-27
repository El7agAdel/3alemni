import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiSuccessResponse } from "@infra/swagger";

import { Permissions } from "../constants";
import { RequirePermission } from "../decorators";
import { AssignRoleDto } from "../dto/requests";
import { RoleDto } from "../dto/responses";
import { UserRoleService } from "../services";

@ApiTags("User Roles")
@ApiBearerAuth()
@Controller("users/:userId/roles")
export class UserRolesController {
    constructor(private readonly userRoleService: UserRoleService) {}

    @Get()
    @RequirePermission(Permissions.Role.READ)
    @Serialize(RoleDto)
    @ApiOperation({ summary: "List user's roles" })
    @ApiSuccessResponse({
        description: "User roles retrieved successfully",
        type: [RoleDto],
    })
    @ResponseMessage("User roles retrieved successfully")
    async listRoles(@Param("userId") userId: string) {
        return this.userRoleService.getUserRoles(userId);
    }

    @Post()
    @RequirePermission(Permissions.Role.ASSIGN)
    @Serialize(RoleDto)
    @ApiOperation({ summary: "Add roles to user" })
    @ApiSuccessResponse({
        description: "Roles added successfully",
        type: [RoleDto],
    })
    @ResponseMessage("Roles added successfully")
    async addRoles(
        @CurrentUser() user: AuthenticatedUser,
        @Param("userId") userId: string,
        @Body() dto: AssignRoleDto,
    ) {
        return this.userRoleService.addUserRoles(user, userId, dto.roleIds);
    }

    @Put()
    @RequirePermission(Permissions.Role.ASSIGN)
    @Serialize(RoleDto)
    @ApiOperation({ summary: "Replace all user roles" })
    @ApiSuccessResponse({
        description: "User roles updated successfully",
        type: [RoleDto],
    })
    @ResponseMessage("User roles updated successfully")
    async setRoles(
        @CurrentUser() user: AuthenticatedUser,
        @Param("userId") userId: string,
        @Body() dto: AssignRoleDto,
    ) {
        return this.userRoleService.setUserRoles(user, userId, dto.roleIds);
    }

    @Delete(":roleId")
    @RequirePermission(Permissions.Role.ASSIGN)
    @ApiOperation({ summary: "Remove a role from user" })
    @ApiSuccessResponse({ description: "Role removed successfully" })
    @ResponseMessage("Role removed successfully")
    async removeRole(
        @CurrentUser() user: AuthenticatedUser,
        @Param("userId") userId: string,
        @Param("roleId") roleId: string,
    ) {
        await this.userRoleService.removeUserRole(user, userId, roleId);
    }
}
