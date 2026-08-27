import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

import { IsBoolean, IsSearch } from "@common/decorators/validators";
import { BaseQueryDto } from "@common/dto";

export class RoleQueryDto extends BaseQueryDto {
    @ApiPropertyOptional({
        description: "Search by name or description",
        example: "admin",
    })
    @IsSearch()
    search?: string;

    @ApiPropertyOptional({ description: "Filter by system roles", example: true })
    @IsOptional()
    @IsBoolean()
    isSystem?: boolean;
}
