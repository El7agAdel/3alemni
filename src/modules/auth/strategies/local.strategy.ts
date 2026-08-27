import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";

import { AppExceptions } from "@common/exceptions";
import { ExtendedRequest } from "@common/interfaces";
import { User } from "@generated/client";

import { AuthService } from "../services";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService) {
        super({
            usernameField: "identifier",
            passwordField: "password",
            passReqToCallback: true,
        });
    }

    async validate(req: ExtendedRequest, identifier: string, password: string): Promise<User> {
        const normalizedIdentifier = identifier.trim().toLowerCase();

        const user = await this.authService.validateUser(normalizedIdentifier, password, req.clientIp);

        if (!user) throw AppExceptions.invalidCredentials();

        return user;
    }
}
