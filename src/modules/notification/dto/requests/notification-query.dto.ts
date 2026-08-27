import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

import { IsBoolean } from "@common/decorators/validators";
import { BaseQueryDto } from "@common/dto";

export class NotificationQueryDto extends BaseQueryDto {
    @ApiPropertyOptional({
        description: "Filter by read state. Omit to return all read and unread",
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    read?: boolean;
}
