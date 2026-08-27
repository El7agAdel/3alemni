import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import { type AuthenticatedUser } from "@common/interfaces";
import { ApiEndpoint, ApiSuccessResponse } from "@infra/swagger";

import { RegisterDeviceTokenDto } from "../dto/requests";
import { DeviceTokenDto } from "../dto/responses";
import { DeviceTokenService } from "../services";

@ApiTags("Device Tokens")
@ApiBearerAuth()
@Controller("me/device-tokens")
export class DeviceTokenController {
    constructor(private readonly deviceTokenService: DeviceTokenService) {}

    @Get()
    @Serialize(DeviceTokenDto)
    @ApiEndpoint({
        summary: "List my push tokens",
        description: "List the current user's registered push tokens",
    })
    @ApiSuccessResponse({
        description: "Push tokens retrieved successfully",
        type: [DeviceTokenDto],
    })
    @ResponseMessage("Push tokens retrieved successfully")
    async list(@CurrentUser() user: AuthenticatedUser) {
        return this.deviceTokenService.listForUser(user.id);
    }

    @Post()
    @Serialize(DeviceTokenDto)
    @ApiEndpoint({
        summary: "Register my push token",
        description: "Register or refresh a push token for the current user",
    })
    @ApiSuccessResponse({
        description: "Push token registered successfully",
        type: DeviceTokenDto,
        isCreated: true,
    })
    @ResponseMessage("Push token registered successfully")
    async register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterDeviceTokenDto) {
        return this.deviceTokenService.register(user.id, dto);
    }

    @Delete(":id")
    @ApiEndpoint({
        summary: "Unregister my push token",
        description: "Unregister a push token for the current user",
    })
    @ApiSuccessResponse({ description: "Push token unregistered successfully" })
    @ResponseMessage("Push token unregistered successfully")
    async unregister(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string): Promise<void> {
        await this.deviceTokenService.unregister(user.id, id);
    }
}
