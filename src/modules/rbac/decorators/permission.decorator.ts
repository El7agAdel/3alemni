import { SetMetadata } from "@nestjs/common";

import { Permission } from "../interfaces";

export const PERMISSIONS_ALL_KEY = "permissions_all";
export const PERMISSIONS_ANY_KEY = "permissions_any";

type PermissionInput = Permission | string;

/**
 * Requires all provided permissions to access a route.
 */
export const RequirePermission = (...permissions: PermissionInput[]) => {
    const keys = permissions.map((p) => (typeof p === "string" ? p : p.key));

    return SetMetadata(PERMISSIONS_ALL_KEY, keys);
};

/**
 * Requires any one of the provided permissions to access a route.
 */
export const RequireAnyPermission = (...permissions: PermissionInput[]) => {
    const keys = permissions.map((p) => (typeof p === "string" ? p : p.key));

    return SetMetadata(PERMISSIONS_ANY_KEY, keys);
};
