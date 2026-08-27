import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { AuthUserDto } from "./auth-user.dto";

export class AuthTokensDto {
    @Expose()
    @ApiProperty({ type: AuthUserDto })
    @Type(() => AuthUserDto)
    user: AuthUserDto;

    @Expose()
    @ApiProperty()
    accessToken: string;

    @Expose()
    @ApiProperty()
    refreshToken: string;
}
