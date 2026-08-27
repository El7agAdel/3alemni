import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiPaginatedResponse, ApiSuccessResponse } from "@infra/swagger";

import { Permissions } from "../constants";
import { RequirePermission } from "../decorators";
import { CreateRoleDto, RoleQueryDto, UpdateRoleDto } from "../dto/requests";
import { RoleDetailDto, RoleDto, RoleListDto } from "../dto/responses";
import { RbacService } from "../services";

@ApiTags("Roles")
@ApiBearerAuth()
@Controller("roles")
export class RolesController {
    constructor(private readonly rbacService: RbacService) {}

    @Get()
    @RequirePermission(Permissions.Role.READ)
    @Serialize(RoleListDto)
    @ApiOperation({ summary: "List all roles" })
    @ApiPaginatedResponse({
        description: "Roles retrieved successfully",
        type: [RoleListDto],
    })
    @ResponseMessage("Roles retrieved successfully")
    async listRoles(@Query() query: RoleQueryDto) {
        return this.rbacService.listRoles(query);
    }

    @Get(":id")
    @RequirePermission(Permissions.Role.READ)
    @Serialize(RoleDetailDto)
    @ApiOperation({ summary: "Get role details" })
    @ApiSuccessResponse({
        description: "Role retrieved successfully",
        type: RoleDetailDto,
    })
    @ResponseMessage("Role retrieved successfully")
    async getRole(@Param("id") id: string) {
        return this.rbacService.findByIdWithDetails(id);
    }

    @Post()
    @RequirePermission(Permissions.Role.CREATE)
    @Serialize(RoleDto)
    @ApiOperation({ summary: "Create a new role" })
    @ApiSuccessResponse({
        description: "Role created successfully",
        type: RoleDto,
        isCreated: true,
    })
    @ResponseMessage("Role created successfully")
    async createRole(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoleDto) {
        return this.rbacService.createRole(user, dto);
    }

    @Patch(":id")
    @RequirePermission(Permissions.Role.UPDATE)
    @Serialize(RoleDto)
    @ApiOperation({ summary: "Update role name or description" })
    @ApiSuccessResponse({
        description: "Role updated successfully",
        type: RoleDto,
    })
    @ResponseMessage("Role updated successfully")
    async updateRole(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateRoleDto) {
        return this.rbacService.updateRole(user, id, dto);
    }

    @Delete(":id")
    @RequirePermission(Permissions.Role.DELETE)
    @ApiOperation({ summary: "Delete a role" })
    @ApiSuccessResponse({ description: "Role deleted successfully" })
    @ResponseMessage("Role deleted successfully")
    async deleteRole(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
        await this.rbacService.deleteRole(user, id);
    }
}
