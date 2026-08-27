import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { PoliciesGuard } from "@common/guards";
import { ConfigService } from "@config";
import { PermissionGuard } from "@modules/rbac/guards";
import { RbacModule } from "@modules/rbac/rbac.module";
import { UserModule } from "@modules/user/user.module";
import { MessagingModule } from "@shared/messaging";
import { OtpModule } from "@shared/otp";

import { AuthController, ReAuthController, UserSessionsController } from "./controllers";
import { JwtAuthGuard } from "./guards";
import { AuthEventHandlers } from "./handlers";
import { SessionRepository } from "./repositories";
import { AuthService, LoginProtectionService, ReAuthService, SessionService, TokenService } from "./services";
import { JwtStrategy, LocalStrategy } from "./strategies";

@Module({
    imports: [
        OtpModule,
        MessagingModule,
        UserModule,
        RbacModule,
        PassportModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                privateKey: config.auth.jwt.privateKey,
                publicKey: config.auth.jwt.publicKey,
                signOptions: {
                    algorithm: "ES256",
                    expiresIn: config.auth.jwt.accessTokenExpirySeconds,
                    issuer: config.auth.jwt.issuer,
                    audience: config.auth.jwt.audience,
                },
                verifyOptions: {
                    algorithms: ["ES256"],
                    issuer: config.auth.jwt.issuer,
                    audience: config.auth.jwt.audience,
                },
            }),
        }),
    ],
    controllers: [AuthController, ReAuthController, UserSessionsController],
    providers: [
        // Repositories
        SessionRepository,

        // Services
        TokenService,
        SessionService,
        LoginProtectionService,
        AuthService,
        ReAuthService,

        // Strategies
        LocalStrategy,
        JwtStrategy,

        // Event handlers
        ...AuthEventHandlers,

        // Auth guard
        { provide: APP_GUARD, useClass: JwtAuthGuard },

        // RBAC guards
        { provide: APP_GUARD, useClass: PermissionGuard },
        { provide: APP_GUARD, useClass: PoliciesGuard },
    ],
})
export class AuthModule {}
