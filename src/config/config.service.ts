import { Injectable } from "@nestjs/common";
import { ConfigService as NestConfigService } from "@nestjs/config";

import type { Configuration } from "./configuration";
import type {
    ApiConfig,
    AppConfig,
    AuthConfig,
    CacheConfig,
    CommunicationConfig,
    DatabaseConfig,
    LoggerConfig,
    NotificationConfig,
    QueueConfig,
    RedisConfig,
    SecurityConfig,
    StorageConfig,
} from "./namespaces";

@Injectable()
export class ConfigService {
    constructor(private configService: NestConfigService<Configuration, true>) {}

    get app(): AppConfig {
        return this.configService.get("app");
    }

    get api(): ApiConfig {
        return this.configService.get("api");
    }

    get security(): SecurityConfig {
        return this.configService.get("security");
    }

    get database(): DatabaseConfig {
        return this.configService.get("database");
    }

    get redis(): RedisConfig {
        return this.configService.get("redis");
    }

    get logger(): LoggerConfig {
        return this.configService.get("logger");
    }

    get cache(): CacheConfig {
        return this.configService.get("cache");
    }

    get queue(): QueueConfig {
        return this.configService.get("queue");
    }

    get communication(): CommunicationConfig {
        return this.configService.get("communication");
    }

    get storage(): StorageConfig {
        return this.configService.get("storage");
    }

    get auth(): AuthConfig {
        return this.configService.get("auth");
    }

    get notification(): NotificationConfig {
        return this.configService.get("notification");
    }

    get isDev(): boolean {
        return this.app.environment === "development";
    }

    get isStaging(): boolean {
        return this.app.environment === "staging";
    }

    get isProduction(): boolean {
        return this.app.environment === "production";
    }

    get appURL(): string {
        const { url, port } = this.app;

        return this.isDev ? `${url}:${port}` : url;
    }

    get apiURL(): string {
        const { prefix, version } = this.api;

        return `${this.appURL}/${prefix}/v${version}`;
    }
}
