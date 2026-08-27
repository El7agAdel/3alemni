import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

import { IsPassword } from "@common/decorators/validators";

export class ForgotPasswordResetDto {
    @ApiProperty({
        description: "Token received from forgot password verification step",
    })
    @IsNotEmpty()
    @IsString()
    transactionalToken: string;

    @ApiProperty({ example: "NewP@ssword123" })
    @IsPassword()
    newPassword: string;
}
