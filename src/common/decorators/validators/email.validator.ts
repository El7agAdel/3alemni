import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsEmail as IsEmailValidator, IsNotEmpty, IsOptional } from "class-validator";

export function IsEmail({ optional = false }: { optional?: boolean } = {}) {
    return applyDecorators(
        optional ? IsOptional() : IsNotEmpty(),
        IsEmailValidator(),
        Transform(({ value }: { value: string }) => value.trim().toLowerCase()),
    );
}
