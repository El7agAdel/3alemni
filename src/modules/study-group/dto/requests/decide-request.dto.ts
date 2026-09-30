import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class DecideRequestDto {
    @ApiPropertyOptional({ description: "A note for the student, e.g. why the request was rejected", maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    note?: string;
}
