import { PrismaPg } from "@prisma/adapter-pg";
import chalk from "chalk";
import * as dotenv from "dotenv";

import { AllPermissions } from "../../src/modules/rbac";
import { PrismaClient } from "../generated/client";

import { ROLES } from "./data/roles.data";
import { USERS } from "./data/users.data";
import { createBootstrapAdmin } from "./seeders/bootstrap-admin.seeder";
import { createPermissions } from "./seeders/permission.seeder";
import { createRoles } from "./seeders/role.seeder";
import { createUsers } from "./seeders/user.seeder";

dotenv.config();

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

/**
 * Entry point for seeding the database.
 * Fully idempotent: permissions/roles are upserted, dev users (root/admin/test-user) are
 * only seeded outside NODE_ENV=production, and the bootstrap admin is only created when
 * BOOTSTRAP_ADMIN_* env vars are set and no matching user already exists.
 */
async function main() {
    console.log(chalk.green.bold("\n🚀  Starting database seeding...\n"));

    console.log(chalk.blue.bold("\n➡️  Permissions\n"));

    const permissions = await createPermissions(prisma, AllPermissions);

    console.log(chalk.green("✔"), chalk.green(`${permissions.created} permissions created`));
    console.log(chalk.yellow("↻"), chalk.yellow(`${permissions.updated} permissions updated`));

    console.log(chalk.blue.bold("\n➡️  Roles\n"));

    const roles = await createRoles(prisma, ROLES);

    console.log(chalk.green("✔"), chalk.green(`${roles.created} roles created`));
    console.log(chalk.yellow("↻"), chalk.yellow(`${roles.updated} roles updated`));

    if (process.env.NODE_ENV === "production") {
        console.log(chalk.blue.bold("\n➡️  Dev users\n"));
        console.log(chalk.gray("—"), chalk.gray("NODE_ENV=production, skipped (known-credential seed accounts)"));
    } else {
        console.log(chalk.blue.bold("\n➡️  Dev users\n"));

        const users = await createUsers(prisma, USERS);

        console.log(chalk.green("✔"), chalk.green(`${users.created} users created`));
        console.log(chalk.yellow("↻"), chalk.yellow(`${users.updated} users updated`));
    }

    console.log(chalk.blue.bold("\n➡️  Bootstrap admin\n"));

    const admin = await createBootstrapAdmin(prisma);

    if (admin.created) {
        console.log(chalk.green("✔"), chalk.green(`Bootstrap admin "${admin.username}" created`));
    } else if (admin.username) {
        console.log(chalk.yellow("↻"), chalk.yellow(`Bootstrap admin "${admin.username}" already exists, skipped`));
    } else {
        console.log(chalk.gray("—"), chalk.gray("BOOTSTRAP_ADMIN_* env vars not set, skipped"));
    }

    console.log(chalk.green.bold("\n\n🚀  Seeding completed successfully!"));
}

main()
    .catch((error) => {
        console.error(chalk.red.bold("\n❌  Seeding failed:"), error);
        process.exit(1);
    })
    .finally(() => {
        void prisma.$disconnect();
    });
