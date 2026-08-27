import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { DevicePlatform } from "@generated/enums";

export class DeviceTokenDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty({ enum: DevicePlatform })
    platform: DevicePlatform;

    @Expose()
    @ApiPropertyOptional()
    deviceName: string | null;

    @Expose()
    @ApiProperty()
    lastSeenAt: Date;

    @Expose()
    @ApiProperty()
    createdAt: Date;
}
