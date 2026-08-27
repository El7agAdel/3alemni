import { appName, appSlug, appSnake, appUpper, slugify } from "./app.constant";

describe("app identity", () => {
    const original = { name: process.env.APP_NAME, slug: process.env.APP_SLUG };

    afterEach(() => {
        process.env.APP_NAME = original.name;
        process.env.APP_SLUG = original.slug;
    });

    describe("slugify", () => {
        it.each([
            ["My App", "my-app"],
            ["  My   App  ", "my-app"],
            ["Café Déjà", "cafe-deja"],
            ["My_App 2!", "my-app-2"],
            ["-My App-", "my-app"],
        ])("turns %j into %j", (input, expected) => {
            expect(slugify(input)).toBe(expected);
        });
    });

    it("reads the display name from APP_NAME", () => {
        process.env.APP_NAME = "  My App  ";

        expect(appName()).toBe("My App");
    });

    it("falls back to a default when APP_NAME is unset or blank", () => {
        delete process.env.APP_NAME;
        expect(appName()).toBe("App");

        process.env.APP_NAME = "   ";
        expect(appName()).toBe("App");
    });

    it("derives every identifier form from APP_NAME alone", () => {
        process.env.APP_NAME = "My App";
        delete process.env.APP_SLUG;

        expect(appSlug()).toBe("my-app");
        expect(appSnake()).toBe("my_app");
        expect(appUpper()).toBe("MY-APP");
    });

    it("prefers an explicit APP_SLUG over the derived one", () => {
        process.env.APP_NAME = "My App";
        process.env.APP_SLUG = "legacy-prefix";

        expect(appSlug()).toBe("legacy-prefix");
        expect(appName()).toBe("My App");
    });
});
