import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiEndpoint, ApiSuccessResponse } from "@infra/swagger";
import { Permissions, RequirePermission } from "@modules/rbac";

import { JoinStudyGroupDto } from "../dto/requests";
import { JoinRequestDto, StudyGroupPreviewDto } from "../dto/responses";
import { GroupMemberService, JoinRequestService } from "../services";

/**
 * The student side of joining and leaving. The two code endpoints are rate limited
 * to slow down code guessing.
 */
@ApiTags("Study Groups - Join")
@ApiBearerAuth()
@Controller("study-groups")
export class JoinController {
    constructor(
        private readonly joinRequestService: JoinRequestService,
        private readonly groupMemberService: GroupMemberService,
    ) {}

    @Get("join/:code")
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @RequirePermission(Permissions.StudyGroup.JOIN)
    @Serialize(StudyGroupPreviewDto)
    @ApiEndpoint({
        summary: "Preview a study group by its join code",
        permission: Permissions.StudyGroup.JOIN.key,
    })
    @ApiSuccessResponse({ description: "Study group retrieved successfully", type: StudyGroupPreviewDto })
    @ResponseMessage("Study group retrieved successfully")
    preview(@Param("code") code: string) {
        return this.joinRequestService.preview(code);
    }

    @Post("join")
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @RequirePermission(Permissions.StudyGroup.JOIN)
    @Serialize(JoinRequestDto)
    @ApiEndpoint({
        summary: "Ask to join a study group",
        description: "Sends a PENDING request to the owner, who approves or rejects it",
        permission: Permissions.StudyGroup.JOIN.key,
    })
    @ApiSuccessResponse({ description: "Join request sent successfully", type: JoinRequestDto, isCreated: true })
    @ResponseMessage("Join request sent successfully")
    ask(@CurrentUser() user: AuthenticatedUser, @Body() dto: JoinStudyGroupDto) {
        return this.joinRequestService.ask(user, dto);
    }

    @Post(":groupId/leave")
    @HttpCode(HttpStatus.OK)
    @RequirePermission(Permissions.StudyGroup.JOIN)
    @ApiEndpoint({ summary: "Leave a study group I study in", permission: Permissions.StudyGroup.JOIN.key })
    @ApiSuccessResponse({ description: "Left the study group successfully" })
    @ResponseMessage("Left the study group successfully")
    async leave(@CurrentUser() user: AuthenticatedUser, @Param("groupId", ParseUUIDPipe) groupId: string) {
        await this.groupMemberService.leave(user, groupId);
    }
}
