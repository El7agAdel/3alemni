import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { OtpChannel } from "@generated/client";

export class OtpSentDto {
    @Expose()
    @ApiProperty({ example: "em***@example.com", description: "Masked target" })
    target: string;

    @Expose()
    @ApiProperty({ enum: OtpChannel })
    channel: OtpChannel;

    @Expose()
    @ApiProperty({ example: 300, description: "Seconds until expiry" })
    expiresIn: number;
}

export class RegisterOtpSentDto extends OtpSentDto {
    @Expose()
    @ApiProperty({
        description: "Token to use in the register flow's next steps",
    })
    transactionalToken: string;
}

export class ForgotPasswordOtpSentDto extends OtpSentDto {
    @Expose()
    @ApiProperty({
        description: "Token to use in the forgot password flow's next steps",
    })
    transactionalToken: string;
}
