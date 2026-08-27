import { Injectable } from "@nestjs/common";
import axios, { AxiosError, AxiosInstance } from "axios";

import { ConfigService } from "@config";
import { LoggingService } from "@infra/logging";

import {
    WhatsAppApiErrorResponse,
    WhatsAppSendResponse,
    WhatsAppSendResult,
    WhatsAppTemplateComponent,
    WhatsAppTemplateParameter,
} from "../interfaces/communication.interfaces";

@Injectable()
export class WhatsAppProvider {
    private readonly enabled: boolean;
    private readonly client?: AxiosInstance;
    private readonly phoneNumberId?: string;

    constructor(
        private readonly config: ConfigService,
        private readonly logger: LoggingService,
    ) {
        this.logger.setContext(WhatsAppProvider.name);

        const { enabled, apiUrl, accessToken, phoneNumberId } = this.config.communication.whatsapp;

        this.enabled = enabled;

        if (!enabled) {
            this.logger.info("WhatsApp provider is disabled, skipping initialization");
            return;
        }

        this.phoneNumberId = phoneNumberId;

        this.client = axios.create({
            baseURL: apiUrl,
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
    }

    /**
     * Check if the WhatsApp provider is enabled and ready to send.
     */
    isAvailable(): boolean {
        return this.enabled;
    }

    /**
     * Send a WhatsApp template message.
     * Never contacts the real Meta API unless WhatsApp is explicitly enabled.
     */
    async sendTemplate(
        phoneNumber: string,
        templateName: string,
        variables: Record<string, unknown>,
        hasButton = false,
        languageCode = "en",
    ): Promise<WhatsAppSendResult> {
        if (!this.enabled || !this.client || !this.phoneNumberId) {
            throw new Error("WhatsApp provider is not enabled");
        }

        const components = this.buildComponents(variables, hasButton);

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: phoneNumber,
            type: "template",
            template: {
                name: templateName,
                language: { code: languageCode },
                components,
            },
        };

        try {
            const response = await this.client.post<WhatsAppSendResponse>(`/${this.phoneNumberId}/messages`, payload);

            const messageId = response.data?.messages?.[0]?.id ?? "unknown";

            this.logger.info("WhatsApp message sent", {
                messageId,
                to: phoneNumber,
                template: templateName,
            });

            return { messageId };
        } catch (error) {
            const axiosError = error as AxiosError<WhatsAppApiErrorResponse>;
            const errorData = axiosError.response?.data;

            this.logger.error("WhatsApp send failed", error, {
                to: phoneNumber,
                template: templateName,
                statusCode: axiosError.response?.status,
                errorCode: errorData?.error?.code,
                errorMessage: errorData?.error?.message,
            });

            throw new Error(`WhatsApp send failed: ${errorData?.error?.message ?? axiosError.message}`, {
                cause: error,
            });
        }
    }

    /**
     * Build template components from variables.
     */
    private buildComponents(variables: Record<string, unknown>, hasButton: boolean): WhatsAppTemplateComponent[] {
        const parameters: WhatsAppTemplateParameter[] = Object.values(variables).map((value) => ({
            type: "text",
            text: String(value),
        }));

        if (parameters.length === 0) return [];

        const components: WhatsAppTemplateComponent[] = [{ type: "body", parameters }];

        if (hasButton) {
            components.push({
                type: "button",
                sub_type: "url",
                index: "0",
                parameters,
            });
        }

        return components;
    }
}
