import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

import { IsOptionalNonNull } from "@common/decorators/validators";
import { StudyGroupStatus } from "@generated/enums";

import { CreateStudyGroupDto } from "./create-study-group.dto";

// skipNullProperties: false keeps rejecting null for fields whose column can't be null
export class UpdateStudyGroupDto extends PartialType(CreateStudyGroupDto, { skipNullProperties: false }) {
    @ApiPropertyOptional({ enum: StudyGroupStatus })
    @IsOptionalNonNull()
    @IsEnum(StudyGroupStatus)
    status?: StudyGroupStatus;
}
