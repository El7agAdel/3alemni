import { ApiProperty } from "@nestjs/swagger";

import { IsIdentifier } from "@common/decorators/validators";

export class AddAssistantDto {
    @ApiProperty({
        description: "Username, email, or phone of the user to add. They need the Teaching Assistant role",
        example: "jsmith",
    })
    @IsIdentifier()
    identifier: string;
}
