import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

import { IsBoolean, IsSearch } from "@common/decorators/validators";
import { BaseQueryDto } from "@common/dto";
import { StudyMaterialType } from "@generated/enums";

export class StudyMaterialQueryDto extends BaseQueryDto {
    @ApiPropertyOptional({ description: "Search by name" })
    @IsSearch()
    search?: string;

    @ApiPropertyOptional({ enum: StudyMaterialType })
    @IsOptional()
    @IsEnum(StudyMaterialType)
    type?: StudyMaterialType;

    @ApiPropertyOptional({
        description: "Staff only: published (true) or drafts (false). Students always get published",
    })
    @IsOptional()
    @IsBoolean()
    published?: boolean;
}
