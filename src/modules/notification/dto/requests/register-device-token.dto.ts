import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

import { DevicePlatform } from "@generated/enums";

export class RegisterDeviceTokenDto {
    @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    deviceId: string;

    @ApiProperty({ example: "fcm_token_xxxxxxxxxxxx" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(4096)
    token: string;

    @ApiProperty({ enum: DevicePlatform, example: DevicePlatform.IOS })
    @IsEnum(DevicePlatform)
    platform: DevicePlatform;

    @ApiPropertyOptional({ example: "John's iPhone" })
    @IsOptional()
    @IsString()
    @MaxLength(120)
    deviceName?: string;
}
