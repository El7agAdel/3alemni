import { SetMetadata } from "@nestjs/common";

import { PolicyHandler } from "../interfaces";

export const POLICIES_KEY = "policies";

/**
 * Attaches policy handlers to a route; all policies must pass.
 * System-role users bypass all policies automatically.
 */
export const CheckPolicies = (...handlers: PolicyHandler[]) => {
    return SetMetadata(POLICIES_KEY, handlers);
};
