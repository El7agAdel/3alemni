import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { BroadcastStatus, NotificationChannelType } from "@generated/enums";

export class BroadcastDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    title: string;

    @Expose()
    @ApiProperty()
    body: string;

    @Expose()
    @ApiProperty({ enum: NotificationChannelType })
    channel: NotificationChannelType;

    @Expose()
    @ApiProperty()
    audience: string;

    @Expose()
    @ApiPropertyOptional()
    audienceParams: Record<string, unknown> | null;

    @Expose()
    @ApiProperty()
    persistAsNotification: boolean;

    @Expose()
    @ApiProperty({ enum: BroadcastStatus })
    status: BroadcastStatus;

    @Expose()
    @ApiPropertyOptional()
    audienceSize: number | null;

    @Expose()
    @ApiPropertyOptional()
    sentSuccessCount: number | null;

    @Expose()
    @ApiPropertyOptional()
    sentFailureCount: number | null;

    @Expose()
    @ApiProperty()
    createdBy: string;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiPropertyOptional()
    completedAt: Date | null;

    @Expose()
    @ApiPropertyOptional()
    failureReason: string | null;
}

export class BroadcastListDto extends BroadcastDto {}

export class AudiencePreviewDto {
    @Expose()
    @ApiProperty()
    audience: string;

    @Expose()
    @ApiProperty({ example: 1284 })
    size: number;
}
