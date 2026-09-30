import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
    ArrayMaxSize,
    ArrayUnique,
    IsArray,
    IsDateString,
    IsEnum,
    IsInt,
    IsISO4217CurrencyCode,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsTimeZone,
    Matches,
    Max,
    MaxLength,
    Min,
} from "class-validator";

import { IsOptionalNonNull } from "@common/decorators/validators";
import { PaymentMethod, PaymentScheduleType, RecurrenceFrequency } from "@generated/enums";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

/**
 * Optional fields use @IsOptional() when their column is nullable (null clears them),
 * and @IsOptionalNonNull() when it is not (null is rejected).
 */
export class CreateStudyGroupDto {
    @ApiProperty({ example: "Math - 3rd secondary", maxLength: 100 })
    @Transform(trim)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({ example: "Mathematics", maxLength: 100 })
    @IsOptional()
    @Transform(trim)
    @IsString()
    @MaxLength(100)
    subject?: string | null;

    @ApiPropertyOptional({ maxLength: 2000 })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string | null;

    @ApiPropertyOptional({ enum: RecurrenceFrequency, default: RecurrenceFrequency.WEEKLY })
    @IsOptionalNonNull()
    @IsEnum(RecurrenceFrequency)
    recurrence?: RecurrenceFrequency;

    @ApiPropertyOptional({ description: "Every N weeks/months/days", minimum: 1, maximum: 12, default: 1 })
    @IsOptionalNonNull()
    @IsInt()
    @Min(1)
    @Max(12)
    recurrenceInterval?: number;

    @ApiPropertyOptional({ type: [Number], description: "0 = Sunday .. 6 = Saturday", example: [0, 3] })
    @IsOptionalNonNull()
    @IsArray()
    @ArrayMaxSize(7)
    @ArrayUnique()
    @IsInt({ each: true })
    @Min(0, { each: true })
    @Max(6, { each: true })
    daysOfWeek?: number[];

    @ApiPropertyOptional({ description: "HH:mm (24h) in the group's timezone", example: "16:30" })
    @IsOptional()
    @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "startTime must be in HH:mm (24h) format" })
    startTime?: string | null;

    @ApiPropertyOptional({ minimum: 15, maximum: 720, example: 90 })
    @IsOptional()
    @IsInt()
    @Min(15)
    @Max(720)
    durationMinutes?: number | null;

    @ApiPropertyOptional({ description: "IANA time zone", example: "Africa/Cairo", default: "UTC" })
    @IsOptionalNonNull()
    @IsTimeZone()
    timezone?: string;

    @ApiPropertyOptional({ description: "First day of the group", example: "2026-10-01" })
    @IsOptional()
    @IsDateString()
    startsOn?: string | null;

    @ApiPropertyOptional({ description: "Last day of the group, not before startsOn", example: "2027-06-30" })
    @IsOptional()
    @IsDateString()
    endsOn?: string | null;

    @ApiPropertyOptional({ enum: PaymentScheduleType, default: PaymentScheduleType.PER_SESSION })
    @IsOptionalNonNull()
    @IsEnum(PaymentScheduleType)
    paymentSchedule?: PaymentScheduleType;

    @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
    @IsOptionalNonNull()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @ApiProperty({ description: "Default price, per the payment schedule", example: 150 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(99_999_999.99)
    rate: number;

    @ApiPropertyOptional({ description: "ISO 4217 code", example: "EGP", default: "EGP" })
    @IsOptionalNonNull()
    @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
    @IsISO4217CurrencyCode()
    currency?: string;
}
