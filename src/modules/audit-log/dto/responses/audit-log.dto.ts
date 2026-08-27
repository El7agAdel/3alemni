import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

export class AuditActorDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    username: string;

    @Expose()
    @ApiProperty()
    email: string;

    @Expose()
    @ApiProperty()
    phone: string;

    @Expose()
    @ApiPropertyOptional()
    firstName?: string;

    @Expose()
    @ApiPropertyOptional()
    lastName?: string;
}

export class AuditLogListDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiPropertyOptional()
    actorId?: string;

    @Expose()
    @ApiProperty()
    resource: string;

    @Expose()
    @ApiProperty()
    action: string;

    @Expose()
    @ApiPropertyOptional()
    resourceId?: string;

    @Expose()
    @ApiPropertyOptional()
    ipAddress?: string;

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiPropertyOptional({ type: AuditActorDto })
    @Type(() => AuditActorDto)
    actor?: AuditActorDto;
}

export class AuditLogDetailDto extends AuditLogListDto {
    @Expose()
    @ApiPropertyOptional()
    details?: Record<string, unknown>;

    @Expose()
    @ApiPropertyOptional()
    requestId?: string;

    @Expose()
    @ApiPropertyOptional()
    userAgent?: string;
}
