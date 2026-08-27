import { RequestMethod } from "@nestjs/common";
import { Params } from "nestjs-pino";

import { ConfigService } from "@config";

export function setupPino(config: ConfigService): Params {
    const isDev = config.isDev;

    return {
        exclude: [{ method: RequestMethod.ALL, path: "*" }],

        pinoHttp: {
            level: config.logger.level,

            // Disable auto logging - LoggingInterceptor logs once per request instead
            autoLogging: false,
            quietReqLogger: true,
            quietResLogger: true,

            messageKey: "message",
            errorKey: "error",
            customAttributeKeys: { reqId: "requestId" },

            // Redact sensitive data
            redact: {
                paths: [
                    "data.password",
                    "data.token",
                    "data.refreshToken",
                    "data.accessToken",
                    "data.otp",
                    "data.secret",
                    "data.apiKey",
                    "*.password",
                    "*.secret",
                ],
                censor: "[REDACTED]",
            },

            // Pretty print in development only
            transport: isDev
                ? {
                      target: "pino-pretty",
                      options: {
                          colorize: true,
                          singleLine: false,
                          translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
                          ignore: "pid,hostname",
                          messageKey: "message",
                          errorKey: "error",
                      },
                  }
                : undefined,
        },
    };
}
