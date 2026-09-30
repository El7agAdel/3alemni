import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

import { BaseQueryDto } from "@common/dto";
import { JoinRequestStatus } from "@generated/enums";

export class JoinRequestQueryDto extends BaseQueryDto {
    @ApiPropertyOptional({
        enum: JoinRequestStatus,
        description: "The owner's list shows PENDING requests when this is omitted",
    })
    @IsOptional()
    @IsEnum(JoinRequestStatus)
    status?: JoinRequestStatus;
}
