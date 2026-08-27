import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CheckPolicies, CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { NotSelfPolicy } from "@common/policies";
import { ApiPaginatedResponse, ApiSuccessResponse } from "@infra/swagger";
import { RequirePermission } from "@modules/rbac";
import { Permissions } from "@modules/rbac/constants";

import {
    AdminChangeEmailDto,
    AdminChangePhoneDto,
    AdminCreateUserDto,
    AdminUpdateUserDto,
    UserQueryDto,
} from "../dto/requests";
import { UserDetailDto, UserDto, UserListDto } from "../dto/responses";
import { UserService } from "../services";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get()
    @RequirePermission(Permissions.User.READ)
    @Serialize(UserListDto)
    @ApiOperation({ summary: "List users with search and filters" })
    @ApiPaginatedResponse({
        description: "Users retrieved successfully",
        type: [UserListDto],
    })
    @ResponseMessage("Users retrieved successfully")
    async listUsers(@Query() query: UserQueryDto) {
        return this.userService.list(query);
    }

    @Get(":id")
    @RequirePermission(Permissions.User.READ)
    @Serialize(UserDetailDto)
    @ApiOperation({ summary: "Get user details" })
    @ApiSuccessResponse({
        description: "User retrieved successfully",
        type: UserDetailDto,
    })
    @ResponseMessage("User retrieved successfully")
    async findUserById(@Param("id") id: string) {
        return this.userService.findByIdWithDetails(id);
    }

    @Post()
    @RequirePermission(Permissions.User.CREATE)
    @Serialize(UserDto)
    @ApiOperation({ summary: "Create a new user" })
    @ApiSuccessResponse({
        description: "User created successfully",
        type: UserDto,
        isCreated: true,
    })
    @ResponseMessage("User created successfully")
    async createUser(@Body() dto: AdminCreateUserDto) {
        return this.userService.create(dto);
    }

    @Patch(":id")
    @RequirePermission(Permissions.User.UPDATE)
    @Serialize(UserDto)
    @ApiOperation({ summary: "Update user profile fields" })
    @ApiSuccessResponse({
        description: "User updated successfully",
        type: UserDto,
    })
    @ResponseMessage("User updated successfully")
    async updateUser(
        @CurrentUser() actor: AuthenticatedUser,
        @Param("id") id: string,
        @Body() dto: AdminUpdateUserDto,
    ) {
        return this.userService.update(actor, id, dto);
    }

    @Patch(":id/email")
    @RequirePermission(Permissions.User.UPDATE)
    @CheckPolicies(new NotSelfPolicy())
    @Serialize(UserDto)
    @ApiOperation({
        summary: "Override user email. Clears verification and may disable 2FA",
    })
    @ApiSuccessResponse({
        description: "User email changed successfully",
        type: UserDto,
    })
    @ResponseMessage("User email changed successfully")
    async changeUserEmail(
        @CurrentUser() actor: AuthenticatedUser,
        @Param("id") id: string,
        @Body() dto: AdminChangeEmailDto,
    ) {
        return this.userService.changeEmail(actor, id, dto);
    }

    @Patch(":id/phone")
    @RequirePermission(Permissions.User.UPDATE)
    @CheckPolicies(new NotSelfPolicy())
    @Serialize(UserDto)
    @ApiOperation({
        summary: "Override user phone. Clears verification and may disable 2FA",
    })
    @ApiSuccessResponse({
        description: "User phone changed successfully",
        type: UserDto,
    })
    @ResponseMessage("User phone changed successfully")
    async changeUserPhone(
        @CurrentUser() actor: AuthenticatedUser,
        @Param("id") id: string,
        @Body() dto: AdminChangePhoneDto,
    ) {
        return this.userService.changePhone(actor, id, dto);
    }

    @Post(":id/suspend")
    @HttpCode(HttpStatus.OK)
    @RequirePermission(Permissions.User.SUSPEND)
    @CheckPolicies(new NotSelfPolicy())
    @Serialize(UserDto)
    @ApiOperation({ summary: "Suspend user and revoke all their sessions" })
    @ApiSuccessResponse({
        description: "User suspended successfully",
        type: UserDto,
    })
    @ResponseMessage("User suspended successfully")
    async suspendUser(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
        return this.userService.suspend(actor, id);
    }

    @Post(":id/unsuspend")
    @HttpCode(HttpStatus.OK)
    @RequirePermission(Permissions.User.SUSPEND)
    @CheckPolicies(new NotSelfPolicy())
    @Serialize(UserDto)
    @ApiOperation({ summary: "Unsuspend user" })
    @ApiSuccessResponse({
        description: "User unsuspended successfully",
        type: UserDto,
    })
    @ResponseMessage("User unsuspended successfully")
    async unsuspendUser(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
        return this.userService.unsuspend(actor, id);
    }

    @Post(":id/force-logout")
    @HttpCode(HttpStatus.OK)
    @RequirePermission(Permissions.User.SUSPEND)
    @CheckPolicies(new NotSelfPolicy())
    @ApiOperation({ summary: "Force logout user from all devices" })
    @ApiSuccessResponse({ description: "User logged out successfully" })
    @ResponseMessage("User logged out successfully")
    async forceLogoutUser(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
        await this.userService.forceLogout(actor, id);
    }

    @Delete(":id")
    @RequirePermission(Permissions.User.DELETE)
    @CheckPolicies(new NotSelfPolicy())
    @ApiOperation({
        summary: "Delete a user immediately, skipping the grace period",
    })
    @ApiSuccessResponse({ description: "User deleted successfully" })
    @ResponseMessage("User deleted successfully")
    async deleteUser(@CurrentUser() actor: AuthenticatedUser, @Param("id") id: string) {
        await this.userService.delete(actor, id);
    }
}
