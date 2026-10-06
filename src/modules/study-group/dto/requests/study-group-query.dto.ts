import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsIn, IsOptional } from "class-validator";

import { IsSearch } from "@common/decorators/validators";
import { BaseQueryDto } from "@common/dto";
import { StudyGroupStatus } from "@generated/enums";

import { GroupRole } from "../../constants";

export class StudyGroupQueryDto extends BaseQueryDto {
    @ApiPropertyOptional({ description: "Search by name or subject" })
    @IsSearch()
    search?: string;

    @ApiPropertyOptional({ enum: StudyGroupStatus })
    @IsOptional()
    @IsEnum(StudyGroupStatus)
    status?: StudyGroupStatus;

    @ApiPropertyOptional({
        enum: Object.values(GroupRole),
        description: "Only groups where I have this role",
    })
    @IsOptional()
    @IsIn(Object.values(GroupRole))
    role?: GroupRole;
}
