import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsBoolean as IsBooleanValidator } from "class-validator";

/**
 * Reusable decorator for consistent boolean parsing to fix implicit boolean conversion issues.
 */
export function IsBoolean() {
    return applyDecorators(
        Transform(({ key, obj }) => {
            const source = obj as Record<string, unknown>;
            const value: unknown = source?.[key];

            if (typeof value === "boolean") return value;

            if (typeof value === "string") {
                if (["true", "1"].includes(value.toLowerCase())) return true;
                if (["false", "0"].includes(value.toLowerCase())) return false;
            }

            if (typeof value === "number") {
                if (value === 1) return true;
                if (value === 0) return false;
            }

            return value;
        }),

        IsBooleanValidator(),
    );
}
