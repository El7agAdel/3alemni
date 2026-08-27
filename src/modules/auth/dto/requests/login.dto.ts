import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

import { IsIdentifier } from "@common/decorators/validators";

export class LoginDto {
    @ApiProperty({
        description: "Username or email address",
        examples: ["jsmith", "example@email.com"],
    })
    @IsIdentifier()
    identifier: string;

    @ApiProperty({ example: "MyP@ssword123" })
    @IsNotEmpty()
    @IsString()
    password: string;

    @ApiPropertyOptional({
        example: "mobile",
        description: "Device type (mobile, desktop, tablet, etc)",
    })
    @IsOptional()
    @IsString()
    deviceType?: string;

    @ApiPropertyOptional({
        example: "iPhone 15",
        description: "Device name (iPhone 15, Samsung S24, Windows 10, etc)",
    })
    @IsOptional()
    @IsString()
    deviceName?: string;
}
