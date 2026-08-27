import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser, Public, ResponseMessage, Serialize } from "@common/decorators";
import type { AuthenticatedUser, ExtendedRequest } from "@common/interfaces";
import { ApiSuccessResponse } from "@infra/swagger";

import { ReAuth } from "../decorators/reauth.decorator";
import {
    ForgotPasswordRequestDto,
    ForgotPasswordResetDto,
    ForgotPasswordVerifyDto,
    LoginDto,
    LoginTwoFactorDto,
    LogoutDto,
    RefreshTokenDto,
    RegisterCompleteDto,
    RegisterSendOtpDto,
    RegisterValidateDto,
    RegisterVerifyDto,
    TwoFactorEnableDto,
    TwoFactorEnableVerifyDto,
} from "../dto/requests";
import {
    AuthTokensDto,
    ForgotPasswordOtpSentDto,
    LoginResponseDto,
    OtpSentDto,
    RegisterOtpSentDto,
    SessionDto,
    TokensDto,
    TransactionalTokenDto,
} from "../dto/responses";
import { LocalAuthGuard } from "../guards";
import { AuthService } from "../services";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // ==================================================
    // Registration
    // ==================================================

    @Public()
    @Post("register/validate")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Validate signup data for uniqueness" })
    @ApiSuccessResponse({ description: "Validation successful" })
    @ResponseMessage("Validation successful")
    async registerValidate(@Body() dto: RegisterValidateDto) {
        await this.authService.registerValidate(dto);
    }

    @Public()
    @Post("register/send-otp")
    @HttpCode(HttpStatus.OK)
    @Serialize(RegisterOtpSentDto)
    @ApiOperation({ summary: "Send registration verification OTP" })
    @ApiSuccessResponse({
        description: "Verification code sent",
        type: RegisterOtpSentDto,
    })
    @ResponseMessage("Verification code sent")
    async registerSendOtp(@Body() dto: RegisterSendOtpDto) {
        return this.authService.registerSendOtp(dto);
    }

    @Public()
    @Post("register/verify")
    @HttpCode(HttpStatus.OK)
    @Serialize(TransactionalTokenDto)
    @ApiOperation({ summary: "Verify registration OTP" })
    @ApiSuccessResponse({
        description: "Verification completed",
        type: TransactionalTokenDto,
    })
    @ResponseMessage("Verification completed")
    async registerVerify(@Body() dto: RegisterVerifyDto) {
        return this.authService.registerVerify(dto);
    }

    @Public()
    @Post("register/complete")
    @Serialize(AuthTokensDto)
    @ApiOperation({ summary: "Complete registration and create the new account" })
    @ApiSuccessResponse({
        isCreated: true,
        description: "Account created successfully",
        type: AuthTokensDto,
    })
    @ResponseMessage("Account created successfully")
    async registerComplete(@Req() req: ExtendedRequest, @Body() dto: RegisterCompleteDto) {
        const metadata = {
            deviceType: dto.deviceType,
            deviceName: dto.deviceName,
            ipAddress: req.clientIp,
            userAgent: req.userAgent,
        };

        return this.authService.registerComplete(dto, metadata);
    }

    // ==================================================
    // Login
    // ==================================================

    @Public()
    @UseGuards(LocalAuthGuard)
    @Post("login")
    @HttpCode(HttpStatus.OK)
    @Serialize(LoginResponseDto)
    @ApiOperation({ summary: "Login with credentials" })
    @ApiSuccessResponse({
        description: "Login successful",
        type: LoginResponseDto,
    })
    @ResponseMessage("Login successful")
    async login(@Req() req: ExtendedRequest, @Body() dto: LoginDto) {
        const metadata = {
            deviceType: dto.deviceType,
            deviceName: dto.deviceName,
            ipAddress: req.clientIp,
            userAgent: req.userAgent,
        };

        return this.authService.login(req.user!, metadata);
    }

    @Public()
    @Post("login/two-factor")
    @HttpCode(HttpStatus.OK)
    @Serialize(LoginResponseDto)
    @ApiOperation({ summary: "Complete 2FA during login" })
    @ApiSuccessResponse({
        description: "Two factor challenge completed",
        type: LoginResponseDto,
    })
    @ResponseMessage("Two factor challenge completed")
    async loginTwoFactor(@Req() req: ExtendedRequest, @Body() dto: LoginTwoFactorDto) {
        const metadata = {
            deviceType: dto.deviceType,
            deviceName: dto.deviceName,
            ipAddress: req.clientIp,
            userAgent: req.userAgent,
        };

        return this.authService.loginTwoFactor(dto, metadata);
    }

    // ==================================================
    // Session Management
    // ==================================================
    @Public()
    @Post("refresh")
    @HttpCode(HttpStatus.OK)
    @Serialize(TokensDto)
    @ApiOperation({ summary: "Refresh access token" })
    @ApiSuccessResponse({
        description: "Token refreshed successfully",
        type: TokensDto,
    })
    @ResponseMessage("Token refreshed successfully")
    refreshToken(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshToken(dto.refreshToken);
    }

    @Post("logout")
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Logout of current session" })
    @ApiSuccessResponse({ description: "Logged out successfully" })
    @ResponseMessage("Logged out successfully")
    async logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: LogoutDto) {
        await this.authService.logout(user.id, dto.refreshToken);
    }

    @Post("logout/all")
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Logout from all devices" })
    @ApiSuccessResponse({ description: "Logged out from all devices" })
    @ResponseMessage("Logged out from all devices")
    async logoutAll(@CurrentUser() user: AuthenticatedUser) {
        await this.authService.logoutAll(user.id);
    }

    @Get("sessions")
    @ApiBearerAuth()
    @Serialize(SessionDto)
    @ApiOperation({ summary: "List active sessions for the user" })
    @ApiSuccessResponse({
        description: "Sessions retrieved successfully",
        type: [SessionDto],
    })
    @ResponseMessage("Sessions retrieved successfully")
    async listSessions(@CurrentUser() user: AuthenticatedUser) {
        return this.authService.listSessions(user.id, user.sessionId);
    }

    @Delete("sessions/:id")
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Revoke a specific session" })
    @ApiSuccessResponse({ description: "Session revoked successfully" })
    @ResponseMessage("Session revoked successfully")
    async revokeSession(@CurrentUser() user: AuthenticatedUser, @Param("id") sessionId: string) {
        await this.authService.revokeSession(user.id, sessionId);
    }

    // ==================================================
    // Password Reset
    // ==================================================

    @Public()
    @Post("forgot-password/request")
    @HttpCode(HttpStatus.OK)
    @Serialize(ForgotPasswordOtpSentDto)
    @ApiOperation({ summary: "Request a password reset OTP" })
    @ApiSuccessResponse({
        description: "Password reset code sent",
        type: ForgotPasswordOtpSentDto,
    })
    @ResponseMessage("Password reset code sent")
    async forgotPasswordRequest(@Body() dto: ForgotPasswordRequestDto) {
        return this.authService.forgotPasswordRequest(dto);
    }

    @Public()
    @Post("forgot-password/verify")
    @HttpCode(HttpStatus.OK)
    @Serialize(TransactionalTokenDto)
    @ApiOperation({ summary: "Verify password reset OTP" })
    @ApiSuccessResponse({
        description: "Verification completed",
        type: TransactionalTokenDto,
    })
    @ResponseMessage("Verification completed")
    async forgotPasswordVerify(@Body() dto: ForgotPasswordVerifyDto) {
        return this.authService.forgotPasswordVerify(dto);
    }

    @Public()
    @Post("forgot-password/reset")
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: "Reset password with new password" })
    @ApiSuccessResponse({ description: "Password reset successfully" })
    @ResponseMessage("Password reset successfully")
    async forgotPasswordReset(@Body() dto: ForgotPasswordResetDto): Promise<void> {
        await this.authService.forgotPasswordReset(dto);
    }

    // ==================================================
    // Two Factor Management
    // ==================================================

    @Post("two-factor/enable")
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @Serialize(OtpSentDto)
    @ApiOperation({ summary: "Start 2FA process and send verification OTP" })
    @ApiSuccessResponse({
        description: "Verification code sent",
        type: OtpSentDto,
    })
    @ResponseMessage("Verification code sent")
    async enableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorEnableDto) {
        return this.authService.enableTwoFactorRequest(user.id, dto.channel);
    }

    @Post("two-factor/enable/verify")
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Confirm two-factor authentication enabling" })
    @ApiSuccessResponse({ description: "Two-factor authentication enabled" })
    @ResponseMessage("Two-factor authentication enabled")
    async enableTwoFactorVerify(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorEnableVerifyDto) {
        await this.authService.enableTwoFactorVerify(user.id, dto.code, dto.channel);
    }

    @Post("two-factor/disable")
    @ReAuth()
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: "Disable two-factor authentication" })
    @ApiSuccessResponse({ description: "Two-factor authentication disabled" })
    @ResponseMessage("Two-factor authentication disabled")
    async disableTwoFactor(@CurrentUser() user: AuthenticatedUser) {
        await this.authService.disableTwoFactor(user.id);
    }
}
