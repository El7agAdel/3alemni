import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { AppExceptions } from "@common/exceptions";
import { AuthenticatedUser } from "@common/interfaces";
import { RequestContextService } from "@common/services";
import { ConfigService } from "@config";
import { RbacPublicService } from "@modules/rbac";
import { UserPublicService } from "@modules/user";

import { JwtPayload } from "../interfaces/auth.interface";
import { TokenService } from "../services";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly config: ConfigService,
        private readonly requestContext: RequestContextService,
        private readonly tokenService: TokenService,
        private readonly userPublicService: UserPublicService,
        private readonly rbacPublicService: RbacPublicService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.auth.jwt.publicKey,
            algorithms: ["ES256"],
            issuer: config.auth.jwt.issuer,
            audience: config.auth.jwt.audience,
        });
    }

    async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
        const isBlacklisted = await this.tokenService.isAccessTokenBlacklisted(payload.sessionId);

        if (isBlacklisted) throw AppExceptions.tokenInvalid("Token has been revoked");

        const user = await this.userPublicService.findActiveById(payload.sub);

        if (!user) throw AppExceptions.invalidCredentials();

        const [permissions, roles] = await Promise.all([
            this.rbacPublicService.getUserPermissions(user.id),
            this.rbacPublicService.getUserRoles(user.id),
        ]);

        this.requestContext.set("userId", user.id);

        return {
            ...user,
            sessionId: payload.sessionId,
            permissions,
            roles: roles.map((role) => role.name),
            hasSystemRole: roles.some((role) => role.isSystem),
        };
    }
}
