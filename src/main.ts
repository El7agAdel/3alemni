import { VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { join } from "path";

import { ConfigService } from "@config";
import { BullBoardConfig } from "@infra/queue";
import { SwaggerConfig } from "@infra/swagger";

import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        bufferLogs: true,
    });

    const config = app.get(ConfigService);
    const logger = app.get(Logger);

    // Make sure the real client IP is used
    if (!config.isDev) app.set("trust proxy", 1);

    // Security headers
    app.use(helmet());

    // CORS
    if (config.security.cors.enabled) {
        const origins = config.security.cors.origins;
        const allowAll = origins.includes("*");

        app.enableCors({
            origin: allowAll ? true : origins,
            methods: ["GET", "PUT", "PATCH", "POST", "DELETE"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true,
            maxAge: 86400,
        });
    }

    // Limit request body size
    app.useBodyParser("json", { limit: config.security.request.bodyLimit });
    app.useBodyParser("urlencoded", {
        limit: config.security.request.bodyLimit,
        extended: true,
    });

    // Global API prefix and versioning
    app.setGlobalPrefix(config.api.prefix, { exclude: ["health"] });
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: config.api.version,
    });

    // Serve uploaded files in development
    if (config.isDev) {
        app.useStaticAssets(join(process.cwd(), config.storage.local.basePath), {
            prefix: new URL(config.storage.baseUrl).pathname,
        });
    }

    // Enable graceful shutdown hooks
    app.enableShutdownHooks();

    // Set the custom logger as the main logger
    app.useLogger(logger);

    // Swagger documentation
    SwaggerConfig.setup(app);

    // Set up BullBoard
    BullBoardConfig.setup(app);

    await app.listen(config.app.port);

    logger.log(`Server running at ${config.appURL}`);

    logger.log(`API available at ${config.apiURL}`);

    if (config.api.swagger.enabled) {
        logger.log(`Swagger docs available at ${config.appURL}/${config.api.prefix}/${config.api.swagger.path}`);
    }

    if (config.queue.bullBoard.enabled) {
        logger.log(`Bull Board available at ${config.appURL}/${config.queue.bullBoard.path}`);
    }
}

bootstrap().catch((err) => {
    console.error("Failed to start application:", err);
    process.exit(1);
});
