import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class ReAuthPasswordDto {
    @ApiProperty({ description: "Current password" })
    @IsNotEmpty()
    @IsString()
    password: string;
}

export class ReAuthOtpDto {
    @ApiProperty({ example: "123456", description: "6-digit verification code" })
    @IsNotEmpty()
    @IsString()
    @Length(6, 6, { message: "Code must be exactly 6 digits" })
    code: string;
}
