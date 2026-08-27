import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";

import { UploadUtil } from "@common/utils";
import { OtpChannel, UserStatus } from "@generated/enums";

export class UserDto {
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
    @ApiPropertyOptional()
    displayName?: string;

    @Expose()
    @ApiPropertyOptional()
    firstName?: string;

    @Expose()
    @ApiPropertyOptional()
    lastName?: string;

    @Expose()
    @Transform(({ obj }) => UploadUtil.resolveUrl(obj.avatar))
    @ApiPropertyOptional()
    avatar?: string;

    @Expose()
    @ApiProperty()
    language: string;

    @Expose()
    @ApiProperty()
    isNewsletterSubscribed: boolean;

    @Expose()
    @ApiProperty()
    qrCode: string;

    @Expose()
    @ApiProperty({ enum: UserStatus })
    status: UserStatus;

    @Expose()
    @ApiProperty()
    isTwoFactorOn: boolean;

    @Expose()
    @ApiProperty({ enum: OtpChannel })
    otpChannel: OtpChannel;

    @Expose()
    @ApiPropertyOptional()
    emailVerifiedAt?: Date;

    @Expose()
    @ApiPropertyOptional()
    phoneVerifiedAt?: Date;

    @Expose()
    @ApiPropertyOptional()
    deletionRequestedAt?: Date;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty()
    updatedAt: Date;
}
