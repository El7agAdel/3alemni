import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";

import { NotificationCategory } from "@generated/enums";

import { NotificationColor, NotificationIcon } from "../../constants";

export class NotificationDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    type: string;

    @Expose()
    @ApiProperty()
    title: string;

    @Expose()
    @ApiProperty()
    body: string;

    @Expose()
    @ApiProperty({ enum: NotificationIcon })
    icon: NotificationIcon;

    @Expose()
    @ApiProperty({ enum: NotificationColor })
    color: NotificationColor;

    @Expose()
    @ApiProperty({ enum: NotificationCategory })
    category: NotificationCategory;

    @Expose()
    @ApiPropertyOptional()
    targetType: string | null;

    @Expose()
    @ApiPropertyOptional()
    targetId: string | null;

    @Expose()
    @ApiPropertyOptional()
    readAt: Date | null;

    @Expose()
    @ApiProperty()
    createdAt: Date;
}

export class NotificationListDto extends NotificationDto {}

export class UnreadCountDto {
    @Expose()
    @ApiProperty({ example: 3 })
    count: number;
}

export class MarkAllReadDto {
    @Expose()
    @ApiProperty({ example: 12 })
    marked: number;
}
