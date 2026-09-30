import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

import { IsSearch } from "@common/decorators/validators";
import { BaseQueryDto } from "@common/dto";
import { EnrollmentStatus } from "@generated/enums";

export class GroupStudentQueryDto extends BaseQueryDto {
    @ApiPropertyOptional({ description: "Search by username or name" })
    @IsSearch()
    search?: string;

    @ApiPropertyOptional({
        enum: EnrollmentStatus,
        description: "Shows ACTIVE students when this is omitted",
    })
    @IsOptional()
    @IsEnum(EnrollmentStatus)
    status?: EnrollmentStatus;
}
