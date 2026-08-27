import { Controller, Get, Param } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { ResponseMessage, Serialize } from "@common/decorators";
import { ApiSuccessResponse } from "@infra/swagger";
import { Permissions, RequirePermission } from "@modules/rbac";

import { SessionDto } from "../dto/responses";
import { SessionService } from "../services";

@ApiTags("User Sessions")
@ApiBearerAuth()
@Controller("users/:userId/sessions")
export class UserSessionsController {
    constructor(private readonly sessionService: SessionService) {}

    @Get()
    @RequirePermission(Permissions.User.READ)
    @Serialize(SessionDto)
    @ApiOperation({ summary: "List user's active sessions" })
    @ApiSuccessResponse({
        description: "Sessions retrieved successfully",
        type: [SessionDto],
    })
    @ResponseMessage("Sessions retrieved successfully")
    async listUserSessions(@Param("userId") userId: string) {
        return this.sessionService.listActive(userId);
    }
}
