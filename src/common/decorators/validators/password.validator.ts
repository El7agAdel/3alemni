import { applyDecorators } from "@nestjs/common";
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";

export function IsPassword() {
    return applyDecorators(
        IsNotEmpty(),
        IsString(),
        MinLength(8),
        MaxLength(40),
        Matches(/^[A-Za-z\d!@#$%^&*(),.?'"/:{}|<>]+$/, {
            message:
                "Password may only contain letters, numbers, and the following special characters: !@#$%^&*(),.?'\"/:{}|<>",
        }),
        Matches(/[a-z]/, {
            message: "Password must contain at least one lowercase letter",
        }),
        Matches(/[A-Z]/, {
            message: "Password must contain at least one uppercase letter",
        }),
        Matches(/\d/, { message: "Password must contain at least one number" }),
    );
}
