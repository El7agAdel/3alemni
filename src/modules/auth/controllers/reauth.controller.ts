import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import type { AuthenticatedUser } from "@common/interfaces";
import { ApiSuccessResponse } from "@infra/swagger";

import { ReAuthOtpDto, ReAuthPasswordDto } from "../dto/requests";
import { OtpSentDto } from "../dto/responses";
import { ReAuthService } from "../services";

@ApiTags("Authentication")
@ApiBearerAuth()
@Controller("auth/reauth")
export class ReAuthController {
    constructor(private readonly reAuthService: ReAuthService) {}

    @Post("request-otp")
    @HttpCode(HttpStatus.OK)
    @Serialize(OtpSentDto)
    @ApiOperation({ summary: "Request OTP for re-authentication" })
    @ApiSuccessResponse({
        description: "Re-authentication OTP sent successfully",
        type: OtpSentDto,
    })
    @ResponseMessage("Re-authentication OTP sent successfully")
    async requestOtp(@CurrentUser() user: AuthenticatedUser) {
        return this.reAuthService.requestOtp(user.id);
    }

    @Post("verify/password")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Verify re-authentication with password" })
    @ApiSuccessResponse({ description: "Re-authentication successful" })
    @ResponseMessage("Re-authentication successful")
    async verifyWithPassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReAuthPasswordDto) {
        await this.reAuthService.verifyWithPassword(user.id, dto.password);
    }

    @Post("verify/otp")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Verify re-authentication with OTP" })
    @ApiSuccessResponse({ description: "Re-authentication successful" })
    @ResponseMessage("Re-authentication successful")
    async verifyWithOtp(@CurrentUser() user: AuthenticatedUser, @Body() dto: ReAuthOtpDto) {
        await this.reAuthService.verifyWithOtp(user.id, dto.code);
    }
}
