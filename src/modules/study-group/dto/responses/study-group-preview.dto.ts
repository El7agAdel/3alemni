import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";

import { PaymentScheduleType, RecurrenceFrequency, StudyGroupStatus } from "@generated/enums";

import { StudyGroupUserDto } from "./study-group-user.dto";

const toDateOnly = (value: unknown): string | null => (value instanceof Date ? value.toISOString().slice(0, 10) : null);

/**
 * What a student sees before asking to join, found by the join code.
 */
export class StudyGroupPreviewDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiPropertyOptional()
    subject?: string;

    @Expose()
    @ApiPropertyOptional()
    description?: string;

    @Expose()
    @ApiProperty({ enum: StudyGroupStatus })
    status: StudyGroupStatus;

    @Expose()
    @ApiProperty({ enum: RecurrenceFrequency })
    recurrence: RecurrenceFrequency;

    @Expose()
    @ApiProperty()
    recurrenceInterval: number;

    @Expose()
    @ApiProperty({ type: [Number], description: "0 = Sunday .. 6 = Saturday" })
    daysOfWeek: number[];

    @Expose()
    @ApiPropertyOptional({ example: "16:30" })
    startTime?: string;

    @Expose()
    @ApiPropertyOptional()
    durationMinutes?: number;

    @Expose()
    @ApiProperty({ example: "Africa/Cairo" })
    timezone: string;

    @Expose()
    @Transform(({ obj }) => toDateOnly(obj.startsOn))
    @ApiPropertyOptional({ example: "2026-10-01" })
    startsOn?: string;

    @Expose()
    @Transform(({ obj }) => toDateOnly(obj.endsOn))
    @ApiPropertyOptional({ example: "2027-06-30" })
    endsOn?: string;

    @Expose()
    @ApiProperty({ enum: PaymentScheduleType })
    paymentSchedule: PaymentScheduleType;

    @Expose()
    // Without a String target, class-transformer tries to rebuild the Prisma Decimal and throws
    @Type(() => String)
    @Transform(({ obj }) => obj.rate?.toFixed(2) ?? null)
    @ApiProperty({ example: "150.00" })
    rate: string;

    @Expose()
    @ApiProperty({ example: "EGP" })
    currency: string;

    @Expose()
    @Type(() => StudyGroupUserDto)
    @ApiProperty({ type: StudyGroupUserDto })
    owner: StudyGroupUserDto;
}
