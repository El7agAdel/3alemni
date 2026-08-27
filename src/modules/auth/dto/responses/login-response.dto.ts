import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { OtpChannel } from "@generated/enums";

import { AuthUserDto } from "./auth-user.dto";

export class LoginResponseDto {
    @Expose()
    @ApiProperty({
        description: "True if 2FA is required for the login process",
        default: false,
    })
    twoFactorRequired: boolean;

    @Expose()
    @ApiProperty({
        description: "True if the account was restored from pending deletion during this login",
        default: false,
    })
    accountRestored: boolean;

    @Expose()
    @ApiPropertyOptional({ type: AuthUserDto })
    @Type(() => AuthUserDto)
    user?: AuthUserDto;

    @Expose()
    @ApiPropertyOptional()
    accessToken?: string;

    @Expose()
    @ApiPropertyOptional()
    refreshToken?: string;

    @Expose()
    @ApiPropertyOptional()
    transactionalToken?: string;

    @Expose()
    @ApiPropertyOptional({ enum: OtpChannel })
    channel?: OtpChannel;
}
