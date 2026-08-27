import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty } from "class-validator";

import { IsIdentifier } from "@common/decorators/validators";
import { OtpChannel } from "@generated/enums";

export class RegisterSendOtpDto {
    @ApiProperty({
        description: "Email address or phone number",
        examples: ["example@email.com", "+201234567890"],
    })
    @IsIdentifier()
    identifier: string;

    @ApiProperty({ enum: OtpChannel, example: OtpChannel.EMAIL })
    @IsNotEmpty()
    @IsEnum(OtpChannel)
    channel: OtpChannel;
}
