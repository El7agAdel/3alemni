import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

import { IsUploadKey, IsUsername } from "@common/decorators/validators";

export class AdminUpdateUserDto {
    @ApiPropertyOptional({
        example: "jsmith",
        description: "Must start with a letter, between 4-20 characters",
    })
    @IsUsername({ optional: true })
    username?: string;

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
    @IsUploadKey()
    @IsOptional()
    avatar?: string;
}
