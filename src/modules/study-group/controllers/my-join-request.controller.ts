import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiEndpoint, ApiPaginatedResponse, ApiSuccessResponse } from "@infra/swagger";
import { Permissions, RequirePermission } from "@modules/rbac";

import { JoinRequestQueryDto } from "../dto/requests";
import { JoinRequestDto } from "../dto/responses";
import { JoinRequestService } from "../services";

@ApiTags("Study Groups - Join")
@ApiBearerAuth()
@Controller("join-requests")
export class MyJoinRequestController {
    constructor(private readonly joinRequestService: JoinRequestService) {}

    @Get("me")
    @RequirePermission(Permissions.StudyGroup.JOIN)
    @Serialize(JoinRequestDto)
    @ApiEndpoint({ summary: "List my join requests", permission: Permissions.StudyGroup.JOIN.key })
    @ApiPaginatedResponse({ description: "Join requests retrieved successfully", type: [JoinRequestDto] })
    @ResponseMessage("Join requests retrieved successfully")
    list(@CurrentUser() user: AuthenticatedUser, @Query() query: JoinRequestQueryDto) {
        return this.joinRequestService.listMine(user, query);
    }

    @Post(":id/cancel")
    @HttpCode(HttpStatus.OK)
    @RequirePermission(Permissions.StudyGroup.JOIN)
    @Serialize(JoinRequestDto)
    @ApiEndpoint({
        summary: "Cancel my join request",
        description: "Only while it is PENDING",
        permission: Permissions.StudyGroup.JOIN.key,
    })
    @ApiSuccessResponse({ description: "Join request cancelled successfully", type: JoinRequestDto })
    @ResponseMessage("Join request cancelled successfully")
    cancel(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
        return this.joinRequestService.cancel(user, id);
    }
}
