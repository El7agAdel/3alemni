import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "is_public";

/**
 * Marks a route as excluded from global authentication.
 * Checked by JwtAuthGuard.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
