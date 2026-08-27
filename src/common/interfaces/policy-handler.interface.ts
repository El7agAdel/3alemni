import { ExecutionContext, Type } from "@nestjs/common";

/**
 * Evaluates a policy and returns a boolean.
 */
export interface IPolicyHandler {
    handle(context: ExecutionContext): Promise<boolean> | boolean;
}

/**
 * A policy handler can be either an instance of a class that implements IPolicyHandler,
 * a function that returns a boolean, or a class type resolved via ModuleRef.
 */
export type PolicyHandler =
    IPolicyHandler | ((context: ExecutionContext) => Promise<boolean> | boolean) | Type<IPolicyHandler>;
