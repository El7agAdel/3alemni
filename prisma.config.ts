import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema",

    migrations: {
        path: "prisma/migrations",
        seed: process.env.NODE_ENV === "development" ? "tsx prisma/seeds/main.ts" : "node dist/prisma/seeds/main.js",
    },

    datasource: {
        url: process.env["DATABASE_URL"],
    },
});
