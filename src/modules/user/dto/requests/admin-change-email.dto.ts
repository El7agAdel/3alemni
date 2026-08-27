import { ApiProperty } from "@nestjs/swagger";

import { IsEmail } from "@common/decorators/validators";

export class AdminChangeEmailDto {
    @ApiProperty({ description: "New email address" })
    @IsEmail()
    newEmail: string;
}
