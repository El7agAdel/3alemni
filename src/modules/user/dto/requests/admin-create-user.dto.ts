import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

import { IsEmail, IsPassword, IsPhone, IsUploadKey, IsUsername } from "@common/decorators/validators";

export class AdminCreateUserDto {
    @ApiProperty({
        example: "jsmith",
        description: "Must start with a letter, between 4-20 characters",
    })
    @IsUsername()
    username: string;

    @ApiProperty({ example: "email@example.com" })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: "+201234567890",
        description: "Phone must be in E.164 format",
    })
    @IsPhone()
    phone: string;

    @ApiProperty({ example: "MyP@ssword123" })
    @IsPassword()
    password: string;

    @ApiPropertyOptional({
        description: "Display name / nickname",
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    displayName?: string;

    @ApiPropertyOptional({ maxLength: 50 })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    firstName?: string;

    @ApiPropertyOptional({ maxLength: 50 })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    lastName?: string;

    @ApiPropertyOptional({ description: "Avatar upload key" })
    @IsOptional()
    @IsUploadKey()
    avatar?: string;
}
