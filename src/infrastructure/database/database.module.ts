import { Global, Module } from "@nestjs/common";

import { PrismaService } from "./prisma.service";

/**
 * Provides the Prisma client to the entire application.
 * Marked as Global so it doesn't need to be imported in every module.
 */
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class DatabaseModule {}
