import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

import { SUPPORTED_LANGUAGES } from "@common/constants";
import { IsBoolean, IsUploadKey } from "@common/decorators/validators";

export class UpdateProfileDto {
    @ApiPropertyOptional({
        description: "Display name / nickname",
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    displayName?: string;

    @ApiPropertyOptional({ description: "First name", maxLength: 50 })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    firstName?: string;

    @ApiPropertyOptional({ description: "Last name", maxLength: 50 })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    lastName?: string;

    @ApiPropertyOptional({ description: "Avatar upload key" })
    @IsOptional()
    @IsUploadKey()
    avatar?: string;

    @ApiPropertyOptional({
        description: "Preferred language",
        enum: SUPPORTED_LANGUAGES,
    })
    @IsOptional()
    @IsIn(SUPPORTED_LANGUAGES)
    language?: string;

    @ApiPropertyOptional({
        description: "Whether the user is subscribed to the newsletter",
    })
    @IsOptional()
    @IsBoolean()
    isNewsletterSubscribed?: boolean;
}
