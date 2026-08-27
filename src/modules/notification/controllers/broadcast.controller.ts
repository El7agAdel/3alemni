import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiEndpoint, ApiPaginatedResponse, ApiSuccessResponse } from "@infra/swagger";
import { Permissions, RequirePermission } from "@modules/rbac";

import { AudienceSelectionDto, BroadcastQueryDto, CreateBroadcastDto } from "../dto/requests";
import { AudiencePreviewDto, BroadcastDto, BroadcastListDto } from "../dto/responses";
import { BroadcastService } from "../services";

@ApiTags("Broadcasts")
@ApiBearerAuth()
@Controller("broadcasts")
export class BroadcastController {
    constructor(private readonly broadcastService: BroadcastService) {}

    @Get()
    @RequirePermission(Permissions.Broadcast.READ)
    @Serialize(BroadcastListDto)
    @ApiEndpoint({
        summary: "List broadcasts",
        permission: Permissions.Broadcast.READ.key,
    })
    @ApiPaginatedResponse({
        description: "Broadcasts retrieved successfully",
        type: [BroadcastListDto],
    })
    @ResponseMessage("Broadcasts retrieved successfully")
    async list(@Query() query: BroadcastQueryDto) {
        return this.broadcastService.list(query);
    }

    @Post("audience/preview")
    @RequirePermission(Permissions.Broadcast.CREATE)
    @Serialize(AudiencePreviewDto)
    @ApiEndpoint({
        summary: "Preview audience size",
        permission: Permissions.Broadcast.CREATE.key,
    })
    @ApiSuccessResponse({
        description: "Audience size retrieved successfully",
        type: AudiencePreviewDto,
    })
    @ResponseMessage("Audience size retrieved successfully")
    async previewAudience(@CurrentUser() user: AuthenticatedUser, @Body() dto: AudienceSelectionDto) {
        return this.broadcastService.previewAudience(user, dto.audience, dto.audienceParams);
    }

    @Get(":id")
    @RequirePermission(Permissions.Broadcast.READ)
    @Serialize(BroadcastDto)
    @ApiEndpoint({
        summary: "Get a broadcast by ID",
        permission: Permissions.Broadcast.READ.key,
    })
    @ApiSuccessResponse({
        description: "Broadcast retrieved successfully",
        type: BroadcastDto,
    })
    @ResponseMessage("Broadcast retrieved successfully")
    async findOne(@Param("id", ParseUUIDPipe) id: string) {
        return this.broadcastService.findByIdOrFail(id);
    }

    @Post()
    @RequirePermission(Permissions.Broadcast.CREATE)
    @Serialize(BroadcastDto)
    @ApiEndpoint({
        summary: "Send a broadcast",
        permission: Permissions.Broadcast.CREATE.key,
    })
    @ApiSuccessResponse({
        description: "Broadcast queued for delivery",
        type: BroadcastDto,
        isCreated: true,
    })
    @ResponseMessage("Broadcast queued for delivery")
    async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBroadcastDto) {
        return this.broadcastService.create(user, dto);
    }
}
