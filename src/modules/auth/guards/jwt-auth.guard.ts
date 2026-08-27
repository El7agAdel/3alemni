import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

import { IS_PUBLIC_KEY } from "@common/decorators";
import { AppExceptions } from "@common/exceptions";

/**
 * Global JWT authentication guard. Applies to all routes by default unless marked @Public().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) return true;

        return super.canActivate(context);
    }

    /**
     * Receive results from JwtStrategy.
     */
    handleRequest<TUser>(err: Error | null, user: TUser | false): TUser {
        if (err) throw err;

        if (!user) throw AppExceptions.tokenInvalid();

        return user;
    }
}
