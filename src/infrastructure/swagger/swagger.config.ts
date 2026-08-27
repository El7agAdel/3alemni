import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import basicAuth from "express-basic-auth";
import { Logger } from "nestjs-pino";

import { ConfigService } from "@config";

/**
 * Swagger documentation setup.
 */
export class SwaggerConfig {
    static setup(app: INestApplication): void {
        const config = app.get(ConfigService);
        const logger = app.get(Logger);

        const swaggerConfig = config.api.swagger;

        if (!swaggerConfig.enabled) return;

        if (swaggerConfig.auth.enabled) {
            if (!swaggerConfig.auth.username || !swaggerConfig.auth.password) {
                logger.warn("Swagger auth enabled but credentials are missing. Swagger will be disabled");
                return;
            }

            app.use(
                `/${config.api.prefix}/${swaggerConfig.path}`,
                basicAuth({
                    challenge: true,
                    users: { [swaggerConfig.auth.username]: swaggerConfig.auth.password },
                }),
            );

            logger.debug("Swagger docs protected with basic auth");
        }

        const builder = new DocumentBuilder()
            .setTitle(swaggerConfig.title)
            .setDescription(swaggerConfig.description)
            .setVersion(swaggerConfig.version)
            .addBearerAuth(
                {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    name: "Authorization",
                    in: "header",
                },
                "access-token",
            );

        for (const server of swaggerConfig.servers) {
            builder.addServer(server.url, server.description);
        }

        const document = SwaggerModule.createDocument(app, builder.build());

        const options = {
            explorer: true,
            useGlobalPrefix: true,
            swaggerOptions: {
                tryItOutEnabled: true,
                persistAuthorization: true,
                displayRequestDuration: true,
                docExpansion: "none",
                filter: true,
            },
            customSiteTitle: swaggerConfig.title,
        };

        SwaggerModule.setup(swaggerConfig.path, app, document, options);
    }
}
