import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class SessionDto {
    @ApiProperty()
    @Expose()
    id: string;

    @Expose()
    @ApiPropertyOptional()
    deviceType?: string;

    @Expose()
    @ApiPropertyOptional()
    deviceName?: string;

    @Expose()
    @ApiPropertyOptional()
    ipAddress?: string;

    @Expose()
    @ApiProperty()
    lastActiveAt: Date;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty({
        description: "True if this is the current session the user is using",
    })
    isCurrent: boolean;
}
