import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class JoinCodeDto {
    @Expose()
    @ApiProperty({ example: "K7Q2M9XA" })
    joinCode: string;
}
