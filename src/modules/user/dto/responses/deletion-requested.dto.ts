import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class DeletionRequestedDto {
    @Expose()
    @ApiProperty({ description: "When the account will be permanently deleted" })
    scheduledAt: Date;
}
