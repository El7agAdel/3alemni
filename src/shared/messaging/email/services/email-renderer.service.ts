import { Injectable, OnModuleInit } from "@nestjs/common";
import fs from "fs";
import Handlebars from "handlebars";
import { join, resolve } from "path";

import { DATE_LOCALE } from "@common/constants";
import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";

/**
 * Responsible for rendering email templates with Handlebars.
 * Loads templates from the views directory at startup.
 * View templates must be copied to the dist directory during the build process.
 */
@Injectable()
export class EmailRendererService implements OnModuleInit {
    private readonly viewsDir: string;
    private readonly layoutsDir: string;
    private readonly partialsDir: string;
    private layoutTemplate: Handlebars.TemplateDelegate | null = null;
    private readonly templates = new Map<string, Handlebars.TemplateDelegate>();

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
    ) {
        this.logger.setContext(EmailRendererService.name);

        const baseDir = resolve(__dirname, "..", "views");

        this.viewsDir = baseDir;
        this.layoutsDir = join(baseDir, "layouts");
        this.partialsDir = join(baseDir, "partials");
    }

    onModuleInit() {
        this.loadLayout();
        this.loadPartials();
        this.loadTemplates();
        this.registerHelpers();
    }

    /**
     * Render a template by name with context data and return the rendered HTML.
     */
    render(templateName: string, context: object): string {
        const template = this.templates.get(templateName);

        if (!template) {
            throw new Error(`Template not found: ${templateName}. Available: ${[...this.templates.keys()].join(", ")}`);
        }

        const body = template(context);

        if (this.layoutTemplate) return this.layoutTemplate({ ...context, body });

        return body;
    }

    /**
     * Check if a template exists.
     */
    hasTemplate(templateName: string): boolean {
        return this.templates.has(templateName);
    }

    private loadLayout(): void {
        const layoutPath = join(this.layoutsDir, "default.hbs");

        if (fs.existsSync(layoutPath)) {
            try {
                const layout = fs.readFileSync(layoutPath, "utf-8");
                this.layoutTemplate = Handlebars.compile(layout);

                this.logger.debug("Layout loaded", { path: "layouts/default.hbs" });
            } catch (error) {
                this.logger.error("Failed to compile layout template", error);
            }
        }
    }

    private loadPartials(): void {
        if (!fs.existsSync(this.partialsDir)) return;

        const files = fs.readdirSync(this.partialsDir);

        for (const file of files) {
            if (file.endsWith(".hbs")) {
                const name = file.replace(".hbs", "");

                try {
                    const partial = fs.readFileSync(join(this.partialsDir, file), "utf-8");
                    Handlebars.registerPartial(name, partial);

                    this.logger.debug("Partial loaded", { name });
                } catch (error) {
                    this.logger.error("Failed to load partial", error, { name });
                }
            }
        }
    }

    private loadTemplates(): void {
        if (!fs.existsSync(this.viewsDir)) {
            this.logger.warn("Views directory not found", { path: this.viewsDir });

            return;
        }

        const files = fs.readdirSync(this.viewsDir);
        let loadedCount = 0;
        let failedCount = 0;

        for (const file of files) {
            if (file.endsWith(".hbs")) {
                const name = file.replace(".hbs", "");

                try {
                    const source = fs.readFileSync(join(this.viewsDir, file), "utf-8");
                    this.templates.set(name, Handlebars.compile(source));

                    this.logger.debug("Template loaded", { name });

                    loadedCount++;
                } catch (error) {
                    this.logger.error("Failed to compile template", error, { name });

                    failedCount++;
                }
            }
        }

        this.logger.info("Email templates loaded", {
            loaded: loadedCount,
            failed: failedCount,
            total: this.templates.size,
        });
    }

    private registerHelpers(): void {
        Handlebars.registerHelper("uppercase", (str: string) => str.toUpperCase());
        Handlebars.registerHelper("capitalize", (str: string) => {
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        });
        Handlebars.registerHelper("year", () => new Date().getFullYear());
        Handlebars.registerHelper("formatDate", (date: Date) => {
            if (!date) return "";

            return new Date(date).toLocaleDateString(DATE_LOCALE, { dateStyle: "long" });
        });
        Handlebars.registerHelper("equal", (a: unknown, b: unknown) => a === b);
        Handlebars.registerHelper("appName", () => this.config.app.name);
        Handlebars.registerHelper(
            "supportEmail",
            () => this.config.communication.mailer.accounts[0]?.fromAddress ?? "",
        );
    }
}
