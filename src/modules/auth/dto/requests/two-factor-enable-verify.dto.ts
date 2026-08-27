import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString, Length } from "class-validator";

import { OtpChannel } from "@generated/enums";

export class TwoFactorEnableVerifyDto {
    @ApiProperty({ example: "123456", description: "6-digit verification code" })
    @IsNotEmpty()
    @IsString()
    @Length(6, 6, { message: "Code must be exactly 6 digits" })
    code: string;

    @ApiProperty({ enum: OtpChannel, example: OtpChannel.EMAIL })
    @IsNotEmpty()
    @IsEnum(OtpChannel)
    channel: OtpChannel;
}
