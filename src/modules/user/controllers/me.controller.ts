import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser, ResponseMessage, Serialize } from "@common/decorators";
import type { AuthenticatedUser } from "@common/interfaces";
import { ApiSuccessResponse } from "@infra/swagger";
import { ReAuth } from "@modules/auth";

import { ChangeEmailDto, ChangePasswordDto, ChangePhoneDto, UpdateProfileDto, VerifyCodeDto } from "../dto/requests";
import { DeletionRequestedDto, OtpSentDto, ProfileDto } from "../dto/responses";
import { MeService } from "../services";

@ApiTags("Me")
@ApiBearerAuth()
@Controller("me")
export class MeController {
    constructor(private readonly meService: MeService) {}

    @Get()
    @Serialize(ProfileDto)
    @ApiOperation({ summary: "Get my profile" })
    @ApiSuccessResponse({
        description: "Profile retrieved successfully",
        type: ProfileDto,
    })
    @ResponseMessage("Profile retrieved successfully")
    async getProfile(@CurrentUser() user: AuthenticatedUser) {
        const profile = await this.meService.getProfile(user.id);

        return { ...profile, roles: user.roles, permissions: user.permissions };
    }

    @Patch()
    @Serialize(ProfileDto)
    @ApiOperation({ summary: "Update my profile" })
    @ApiSuccessResponse({
        description: "Profile updated successfully",
        type: ProfileDto,
    })
    @ResponseMessage("Profile updated successfully")
    updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
        return this.meService.updateProfile(user.id, dto);
    }

    @Post("change-password")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Change my password" })
    @ApiSuccessResponse({ description: "Password changed successfully" })
    @ResponseMessage("Password changed successfully")
    async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
        await this.meService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    }

    @Post("/email/change")
    @HttpCode(HttpStatus.OK)
    @ReAuth()
    @Serialize(OtpSentDto)
    @ApiOperation({ summary: "Request email change (requires re-auth)" })
    @ApiSuccessResponse({
        description: "Verification code sent to the new email",
        type: OtpSentDto,
    })
    @ResponseMessage("Verification code sent to the new email")
    changeEmail(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangeEmailDto) {
        return this.meService.changeEmail(user.id, dto.newEmail);
    }

    @Post("/email/change/confirm")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Verify email change with OTP" })
    @ApiSuccessResponse({ description: "Email changed successfully" })
    @ResponseMessage("Email changed successfully")
    async confirmEmailChange(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyCodeDto) {
        await this.meService.confirmEmailChange(user.id, dto.code);
    }

    @Post("/phone/change")
    @HttpCode(HttpStatus.OK)
    @ReAuth()
    @Serialize(OtpSentDto)
    @ApiOperation({ summary: "Request phone change (requires re-auth)" })
    @ApiSuccessResponse({
        description: "Verification code sent to the new phone",
        type: OtpSentDto,
    })
    @ResponseMessage("Verification code sent to the new phone")
    changePhone(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePhoneDto) {
        return this.meService.changePhone(user.id, dto.newPhone);
    }

    @Post("/phone/change/confirm")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Verify phone change with OTP" })
    @ApiSuccessResponse({ description: "Phone changed successfully" })
    @ResponseMessage("Phone changed successfully")
    async confirmPhoneChange(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyCodeDto) {
        await this.meService.confirmPhoneChange(user.id, dto.code);
    }

    @Post("/email/verify")
    @HttpCode(HttpStatus.OK)
    @Serialize(OtpSentDto)
    @ApiOperation({ summary: "Send OTP to verify current email" })
    @ApiSuccessResponse({
        description: "Verification code sent to the current email",
        type: OtpSentDto,
    })
    @ResponseMessage("Verification code sent to the current email")
    verifyEmail(@CurrentUser() user: AuthenticatedUser) {
        return this.meService.verifyEmail(user.id);
    }

    @Post("/email/verify/confirm")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Confirm email verification with OTP" })
    @ApiSuccessResponse({ description: "Email verified successfully" })
    @ResponseMessage("Email verified successfully")
    async confirmEmailVerification(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyCodeDto) {
        await this.meService.confirmEmailVerification(user.id, dto.code);
    }

    @Post("/phone/verify")
    @HttpCode(HttpStatus.OK)
    @Serialize(OtpSentDto)
    @ApiOperation({ summary: "Send OTP to verify current phone" })
    @ApiSuccessResponse({
        description: "Verification code sent to the current phone",
        type: OtpSentDto,
    })
    @ResponseMessage("Verification code sent to the current phone")
    verifyPhone(@CurrentUser() user: AuthenticatedUser) {
        return this.meService.verifyPhone(user.id);
    }

    @Post("/phone/verify/confirm")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Confirm phone verification with OTP" })
    @ApiSuccessResponse({ description: "Phone verified successfully" })
    @ResponseMessage("Phone verified successfully")
    async confirmPhoneVerification(@CurrentUser() user: AuthenticatedUser, @Body() dto: VerifyCodeDto) {
        await this.meService.confirmPhoneVerification(user.id, dto.code);
    }

    @Delete()
    @ReAuth()
    @Serialize(DeletionRequestedDto)
    @ApiOperation({
        summary: "Request account deletion, with a configurable grace period before permanent deletion",
    })
    @ApiSuccessResponse({
        description: "Account deletion requested successfully",
        type: DeletionRequestedDto,
    })
    @ResponseMessage("Account deletion requested successfully")
    deleteProfileRequest(@CurrentUser() user: AuthenticatedUser) {
        return this.meService.requestDeletion(user.id);
    }
}
