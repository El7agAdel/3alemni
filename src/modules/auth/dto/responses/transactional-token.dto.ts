import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class TransactionalTokenDto {
    @Expose()
    @ApiProperty()
    transactionalToken: string;
}
