import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, Length, MaxLength } from "class-validator";

import { JOIN_CODE_LENGTH } from "../../constants";

export class JoinStudyGroupDto {
    @ApiProperty({ description: "The join code the teacher shared", example: "K7Q2M9XA" })
    @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim().toUpperCase() : value))
    @IsString()
    @Length(JOIN_CODE_LENGTH, JOIN_CODE_LENGTH)
    code: string;

    @ApiPropertyOptional({ description: "A note for the teacher", maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    message?: string;
}
