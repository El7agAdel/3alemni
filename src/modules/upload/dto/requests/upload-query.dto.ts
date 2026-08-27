import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

import { IsSearch } from "@common/decorators/validators";
import { BaseQueryDto } from "@common/dto";

import { UploadPurpose } from "../../constants";

export class UploadQueryDto extends BaseQueryDto {
    @ApiPropertyOptional({ description: "Search by original filename" })
    @IsSearch()
    search?: string;

    @ApiPropertyOptional({ enum: UploadPurpose })
    @IsOptional()
    @IsEnum(UploadPurpose)
    purpose?: UploadPurpose;

    @ApiPropertyOptional({ description: "Filter by uploader" })
    @IsOptional()
    @IsUUID()
    uploadedBy?: string;
}
