import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { OtpChannel } from "@generated/enums";

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
