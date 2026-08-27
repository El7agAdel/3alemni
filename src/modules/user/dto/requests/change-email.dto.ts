import { ApiProperty } from "@nestjs/swagger";

import { IsEmail } from "@common/decorators/validators";

export class ChangeEmailDto {
    @ApiProperty({ description: "New email address" })
    @IsEmail()
    newEmail: string;
}
