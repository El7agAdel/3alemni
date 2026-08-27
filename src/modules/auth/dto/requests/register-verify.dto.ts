import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class RegisterVerifyDto {
    @ApiProperty({
        description: "Token received from the OTP request step",
    })
    @IsNotEmpty()
    @IsString()
    transactionalToken: string;

    @ApiProperty({ example: "123456", description: "6-digit verification code" })
    @IsNotEmpty()
    @IsString()
    @Length(6, 6, { message: "Code must be exactly 6 digits" })
    code: string;
}
