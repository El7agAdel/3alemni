import { ApiProperty } from "@nestjs/swagger";

import { IsEmail, IsPhone, IsUsername } from "@common/decorators/validators";

export class RegisterValidateDto {
    @ApiProperty({
        example: "jsmith",
        description: "Must start with a letter, between 4-20 characters",
    })
    @IsUsername()
    username: string;

    @ApiProperty({ example: "email@example.com" })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: "+201234567890",
        description: "Phone must be in E.164 format",
    })
    @IsPhone()
    phone: string;
}
