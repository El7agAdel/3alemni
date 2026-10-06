import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

import { IsSearch } from "@common/decorators/validators";
import { BaseQueryDto } from "@common/dto";
import { StudyGroupStatus } from "@generated/enums";

export class AllStudyGroupsQueryDto extends BaseQueryDto {
    @ApiPropertyOptional({ description: "Search by name or subject" })
    @IsSearch()
    search?: string;

    @ApiPropertyOptional({ enum: StudyGroupStatus })
    @IsOptional()
    @IsEnum(StudyGroupStatus)
    status?: StudyGroupStatus;

    @ApiPropertyOptional({ description: "Only the groups of this teacher" })
    @IsOptional()
    @IsUUID()
    ownerId?: string;
}
