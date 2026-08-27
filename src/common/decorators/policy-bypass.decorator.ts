import { SetMetadata } from "@nestjs/common";

export const POLICY_BYPASS_KEY = "policy_bypass";

/**
 * Attaches extra permission-based bypass rules for a route's policies.
 */
export const PolicyBypass = (permissions?: string | string[]) => {
    return SetMetadata(POLICY_BYPASS_KEY, permissions ? [permissions].flat() : []);
};
