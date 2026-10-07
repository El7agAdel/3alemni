import { ApiPropertyOptional } from "@nestjs/swagger";
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
 * Every field is optional: send only what changes.
 * Fields whose column is nullable use @IsOptional() (null clears them); the others use
 * @IsOptionalNonNull() (null is rejected).
 */
export class UpdateStudyMaterialDto {
    @ApiPropertyOptional({ example: "Chapter 3 - Derivatives (part 1)", maxLength: 150 })
    @IsOptionalNonNull()
    @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name?: string;

    @ApiPropertyOptional({
        enum: StudyMaterialType,
        description: "Changing to VIDEO or WRITTEN_CONTENT needs maxScore: null when a score is set",
    })
    @IsOptionalNonNull()
    @IsEnum(StudyMaterialType)
    type?: StudyMaterialType;

    @ApiPropertyOptional({
        description: "For WRITTEN_CONTENT, this is the text itself. null clears it",
        maxLength: 20000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(20000)
    description?: string | null;

    @ApiPropertyOptional({
        description: "Only for QUIZ, TEST and CHALLENGE. null clears it",
        example: 20,
        maximum: 9999.99,
    })
    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(9999.99)
    maxScore?: number | null;

    @ApiPropertyOptional({
        description: "A link, e.g. a YouTube or Google Drive video. null clears it",
        maxLength: 2048,
    })
    @IsOptional()
    @IsUrl({ protocols: ["http", "https"], require_protocol: true })
    @MaxLength(2048)
    externalUrl?: string | null;

    @ApiPropertyOptional({ description: "Order in the list, smallest first", minimum: 0 })
    @IsOptionalNonNull()
    @IsInt()
    @Min(0)
    @Max(100_000)
    position?: number;

    @ApiPropertyOptional({ description: "ISO date-time. null clears it", example: "2026-10-15T20:00:00Z" })
    @IsOptional()
    @IsDateString()
    dueAt?: string | null;

    @ApiPropertyOptional({
        type: [String],
        description:
            `Replaces the whole list: new keys are attached, files left out are deleted, [] removes all. ` +
            `Upload keys (purpose STUDY_MATERIAL), at most ${MAX_ATTACHMENTS}. Full file URLs are accepted too`,
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
