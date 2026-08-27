import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class VerifyCodeDto {
    @ApiProperty({ example: "123456", description: "6-digit verification code" })
    @IsNotEmpty()
    @IsString()
    @Length(6, 6, { message: "Code must be exactly 6 digits" })
    code: string;
}
