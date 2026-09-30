import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiEndpoint, ApiPaginatedResponse, ApiSuccessResponse } from "@infra/swagger";
import { Permissions, RequirePermission } from "@modules/rbac";

import { DecideRequestDto, JoinRequestQueryDto } from "../dto/requests";
import { JoinRequestDto } from "../dto/responses";
import { JoinRequestService } from "../services";

@ApiTags("Study Groups - Join Requests")
@ApiBearerAuth()
@Controller("study-groups/:groupId/join-requests")
export class JoinRequestController {
    constructor(private readonly joinRequestService: JoinRequestService) {}

    @Get()
    @RequirePermission(Permissions.Enrollment.APPROVE)
    @Serialize(JoinRequestDto)
    @ApiEndpoint({
        summary: "List the group's join requests",
        description: "Owner only. Shows PENDING requests unless a status is given",
        permission: Permissions.Enrollment.APPROVE.key,
    })
    @ApiPaginatedResponse({ description: "Join requests retrieved successfully", type: [JoinRequestDto] })
    @ResponseMessage("Join requests retrieved successfully")
    list(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Query() query: JoinRequestQueryDto,
    ) {
        return this.joinRequestService.listForGroup(user, groupId, query);
    }

    @Post(":requestId/approve")
    @HttpCode(HttpStatus.OK)
    @RequirePermission(Permissions.Enrollment.APPROVE)
    @Serialize(JoinRequestDto)
    @ApiEndpoint({
        summary: "Approve a join request",
        description: "Owner only. The student becomes an ACTIVE student of the group",
        permission: Permissions.Enrollment.APPROVE.key,
    })
    @ApiSuccessResponse({ description: "Join request approved successfully", type: JoinRequestDto })
    @ResponseMessage("Join request approved successfully")
    approve(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Param("requestId", ParseUUIDPipe) requestId: string,
        @Body() dto: DecideRequestDto,
    ) {
        return this.joinRequestService.approve(user, groupId, requestId, dto);
    }

    @Post(":requestId/reject")
    @HttpCode(HttpStatus.OK)
    @RequirePermission(Permissions.Enrollment.APPROVE)
    @Serialize(JoinRequestDto)
    @ApiEndpoint({
        summary: "Reject a join request",
        description: "Owner only. The student can ask again later",
        permission: Permissions.Enrollment.APPROVE.key,
    })
    @ApiSuccessResponse({ description: "Join request rejected successfully", type: JoinRequestDto })
    @ResponseMessage("Join request rejected successfully")
    reject(
        @CurrentUser() user: AuthenticatedUser,
        @Param("groupId", ParseUUIDPipe) groupId: string,
        @Param("requestId", ParseUUIDPipe) requestId: string,
        @Body() dto: DecideRequestDto,
    ) {
        return this.joinRequestService.reject(user, groupId, requestId, dto);
    }
}
