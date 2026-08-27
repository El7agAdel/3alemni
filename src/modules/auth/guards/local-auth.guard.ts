import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

import { AppExceptions } from "@common/exceptions";
import { User } from "@generated/client";

/**
 * Local authentication guard for login. Uses LocalStrategy to validate credentials.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard("local") {
    /**
     * Receive results from LocalStrategy.
     */
    handleRequest<TUser = User>(error: Error | null, user: TUser | false): TUser {
        if (error) throw error;

        if (!user) throw AppExceptions.invalidCredentials();

        return user;
    }
}
