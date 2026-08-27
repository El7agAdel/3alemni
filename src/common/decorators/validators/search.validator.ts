import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export function IsSearch() {
    return applyDecorators(
        Transform(({ value }: { value: string }) => value.trim()),
        IsOptional(),
        IsString(),
        IsNotEmpty(),
    );
}
