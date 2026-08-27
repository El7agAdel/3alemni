import { Global, Module } from "@nestjs/common";

import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";

import { STORAGE_PROVIDER } from "./constants/storage.constant";
import { StorageProvider } from "./interfaces/storage.interfaces";
import { LocalStorageProvider } from "./providers";

@Global()
@Module({
    providers: [
        {
            provide: STORAGE_PROVIDER,
            inject: [ConfigService, LoggingService],
            useFactory: (config: ConfigService, logger: LoggingService): StorageProvider => {
                const provider = config.storage.provider;

                switch (provider) {
                    case "local":
                        return new LocalStorageProvider(config, logger);
                    default:
                        throw new Error(`Unsupported storage provider: ${provider as string}`);
                }
            },
        },
    ],
    exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
