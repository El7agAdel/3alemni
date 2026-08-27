import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { OtpChannel, UserStatus } from "@generated/enums";

export class AuthUserDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    username: string;

    @Expose()
    @ApiProperty()
    email: string;

    @Expose()
    @ApiProperty()
    phone: string;

    @Expose()
    @ApiProperty()
    displayName: string;

    @Expose()
    @ApiPropertyOptional()
    avatar?: string;

    @Expose()
    @ApiProperty()
    qrCode: string;

    @Expose()
    @ApiProperty()
    isTwoFactorOn: boolean;

    @Expose()
    @ApiProperty({ enum: OtpChannel })
    otpChannel: OtpChannel;

    @Expose()
    @ApiProperty({ enum: UserStatus })
    status: UserStatus;

    @Expose()
    @ApiProperty()
    language: string;

    @Expose()
    @ApiPropertyOptional()
    emailVerifiedAt?: Date;

    @Expose()
    @ApiPropertyOptional()
    phoneVerifiedAt?: Date;
}
