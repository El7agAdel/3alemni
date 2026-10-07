import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
    ArrayMaxSize,
    ArrayUnique,
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    MaxLength,
    Min,
} from "class-validator";

import { IsOptionalNonNull } from "@common/decorators/validators";
import { UploadUtil } from "@common/utils";
import { StudyMaterialType } from "@generated/enums";

import { MAX_ATTACHMENTS } from "../../constants";

/**
 * Optional fields use @IsOptional() when their column is nullable (null clears them),
 * and @IsOptionalNonNull() when it is not (null is rejected).
 */
export class CreateStudyMaterialDto {
    @ApiProperty({ example: "Chapter 3 - Derivatives", maxLength: 150 })
    @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name: string;

    @ApiProperty({ enum: StudyMaterialType })
    @IsEnum(StudyMaterialType)
    type: StudyMaterialType;

    @ApiPropertyOptional({ description: "For WRITTEN_CONTENT, this is the text itself", maxLength: 20000 })
    @IsOptional()
    @IsString()
    @MaxLength(20000)
    description?: string | null;

    @ApiPropertyOptional({ description: "Only for QUIZ, TEST and CHALLENGE", example: 20, maximum: 9999.99 })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(9999.99)
    maxScore?: number | null;

    @ApiPropertyOptional({ description: "A link, e.g. a YouTube or Google Drive video", maxLength: 2048 })
    @IsOptional()
    @IsUrl({ protocols: ["http", "https"], require_protocol: true })
    @MaxLength(2048)
    externalUrl?: string | null;

    @ApiPropertyOptional({ description: "Order in the list, smallest first", minimum: 0, default: 0 })
    @IsOptionalNonNull()
    @IsInt()
    @Min(0)
    @Max(100_000)
    position?: number;

    @ApiPropertyOptional({ description: "ISO date-time", example: "2026-10-15T20:00:00Z" })
    @IsOptional()
    @IsDateString()
    dueAt?: string | null;

    @ApiPropertyOptional({
        type: [String],
        description: `Upload keys (purpose STUDY_MATERIAL), at most ${MAX_ATTACHMENTS}. Full file URLs are accepted too`,
    })
    @IsOptionalNonNull()
    @Transform(({ value }: { value: unknown }) =>
        Array.isArray(value)
            ? (value as unknown[]).map((item) => (typeof item === "string" ? UploadUtil.extractKey(item) : item))
            : value,
    )
    @IsArray()
    @ArrayMaxSize(MAX_ATTACHMENTS)
    @ArrayUnique()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    attachments?: string[];
}
