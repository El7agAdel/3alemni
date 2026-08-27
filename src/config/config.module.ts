import { Global, Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";

import { ConfigService } from "./config.service";
import configuration from "./configuration";
import { envSchema } from "./env.schema";

@Global()
@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [
                `.env.${process.env.NODE_ENV || "development"}.local`,
                `.env.${process.env.NODE_ENV || "development"}`,
                ".env.local",
                ".env",
            ],
            load: [configuration],
            validationSchema: envSchema,
            validationOptions: {
                allowUnknown: true,
                abortEarly: false,
            },
            expandVariables: true,
        }),
    ],
    providers: [ConfigService],
    exports: [ConfigService],
})
export class ConfigModule {}
