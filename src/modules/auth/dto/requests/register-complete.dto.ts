import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

import { IsPassword } from "@common/decorators/validators";

export class RegisterCompleteDto {
    @ApiProperty({ description: "Token received from register verification" })
    @IsNotEmpty()
    @IsString()
    transactionalToken: string;

    @ApiProperty({ example: "MyP@ssword123" })
    @IsPassword()
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
