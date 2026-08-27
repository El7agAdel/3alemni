import { ApiProperty } from "@nestjs/swagger";

import { IsPhone } from "@common/decorators/validators";

export class AdminChangePhoneDto {
    @ApiProperty({
        example: "+201234567890",
        description: "New phone must be in E.164 format",
    })
    @IsPhone()
    newPhone: string;
}
