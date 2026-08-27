import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";

import { OtpChannel } from "@generated/enums";

export class TwoFactorEnableDto {
    @ApiProperty({ enum: OtpChannel, example: OtpChannel.EMAIL })
    @IsNotEmpty()
    @IsEnum(OtpChannel)
    channel: OtpChannel;
}
