import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";

import { AppModule } from "./../src/app.module";

describe("Health (e2e)", () => {
    let app: INestApplication<App> | undefined;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        // Guarded: if bootstrapping threw, app is undefined and the real
        // failure would otherwise be masked by a TypeError here.
        await app?.close();
    });

    it("GET /health reports every dependency as up", async () => {
        const response = await request(app!.getHttpServer()).get("/health").expect(200);

        expect(response.body).toMatchObject({
            success: true,
            data: {
                status: "ok",
                checks: {
                    database: { status: "up" },
                    cache: { status: "up" },
                    queue: { status: "up" },
                },
            },
        });
    });
});
