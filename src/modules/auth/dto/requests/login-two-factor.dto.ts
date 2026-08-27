import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, Length } from "class-validator";

export class LoginTwoFactorDto {
    @ApiProperty({ description: "Token received from login response" })
    @IsNotEmpty()
    @IsString()
    transactionalToken: string;

    @ApiProperty({ example: "123456", description: "6-digit verification code" })
    @IsNotEmpty()
    @IsString()
    @Length(6, 6, { message: "Code must be exactly 6 digits" })
    code: string;

    @ApiPropertyOptional({
        example: "mobile",
        description: "Device type (mobile, web, tablet, etc)",
    })
    @IsOptional()
    @IsString()
    deviceType?: string;

    @ApiPropertyOptional({ example: "iPhone 15", description: "Device name" })
    @IsOptional()
    @IsString()
    deviceName?: string;
}
