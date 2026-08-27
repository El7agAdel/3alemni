import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from "class-validator";

import { AudienceParams, BroadcastAudience, PARAMETERIZED_AUDIENCES } from "../constants";

/**
 * Cross-field validator that checks certain audiences must have a parameter, and any
 * other audience can't have any. Ensures the resolver always receives the right params.
 */
@ValidatorConstraint({ name: "broadcastAudienceParams", async: false })
export class BroadcastAudienceParamsValidator implements ValidatorConstraintInterface {
    validate(_value: unknown, args: ValidationArguments): boolean {
        const { audience, audienceParams } = args.object as {
            audience?: BroadcastAudience;
            audienceParams?: AudienceParams;
        };

        if (!audience) return true;

        const hasSelector = Boolean(audienceParams?.userIds?.length || audienceParams?.roleIds?.length);

        return PARAMETERIZED_AUDIENCES.has(audience) ? hasSelector : !hasSelector;
    }

    defaultMessage(args: ValidationArguments): string {
        const audience = (args.object as { audience?: BroadcastAudience }).audience;

        if (audience && PARAMETERIZED_AUDIENCES.has(audience)) {
            return `Audience ${audience} requires at least one of userIds or roleIds`;
        }

        return "audienceParams is not allowed for this audience";
    }
}
