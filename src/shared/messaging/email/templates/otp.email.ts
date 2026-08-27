import { appName } from "@common/constants";
import { OtpPurpose } from "@generated/client";

import { BaseEmail } from "./base-email";

/**
 * Inputs for whoever calls the email template.
 */
export interface OtpEmailInput {
    recipientName?: string;
    otp: string;
    expiryMinutes: number;
    purpose: OtpPurpose;
}

/**
 * Context passed to the HBS template.
 */
export interface OtpEmailContext extends OtpEmailInput {
    purposeHeading: string;
    preheader: string;
    purposeDescription: string;
    purposeIgnoreText: string;
}

type EmailOtpPurpose = "SIGNUP" | "PASSWORD_RESET" | "TWO_FACTOR" | "REAUTH" | "CHANGE_EMAIL" | "VERIFY_EMAIL";

interface OtpTemplate {
    subject: string;
    heading: string;
    description: string;
    ignoreText: string;
    preheader: string;
}

/**
 * Built per call rather than as a module constant so the app name is read
 * after the environment has been loaded.
 */
const otpTemplates = (): Record<EmailOtpPurpose, OtpTemplate> => ({
    SIGNUP: {
        subject: "Verify your account",
        heading: `Welcome to ${appName()}`,
        preheader: `Your ${appName()} verification code`,
        description: "Use the code below to verify your account and complete registration.",
        ignoreText: `If you didn't create an account with ${appName()}, you can safely ignore this email.`,
    },
    PASSWORD_RESET: {
        subject: "Reset your password",
        heading: "Password Reset Request",
        preheader: "Your password reset code",
        description: "Use the code below to reset your password.",
        ignoreText: "If you didn't request a password reset, your account is safe - ignore this email.",
    },
    TWO_FACTOR: {
        subject: "Your login verification code",
        heading: "Two-Factor Authentication",
        preheader: "Your login verification code",
        description: "Use the code below to complete your login.",
        ignoreText: "If you didn't try to log in, someone may have your password. Change it immediately.",
    },
    REAUTH: {
        subject: "Confirm your identity",
        heading: "Re-Authentication Required",
        description: "Use the code below to confirm your identity for this sensitive action.",
        preheader: "Your re-authentication code",
        ignoreText:
            "If you didn't initiate this action, your account may be compromised. Change your password immediately.",
    },
    CHANGE_EMAIL: {
        subject: "Verify your new email address",
        heading: "Email Change Verification",
        description: "Use the code below to confirm your new email address.",
        preheader: "Verify your new email address",
        ignoreText:
            "If you didn't request an email change, your account may be compromised. Change your password immediately.",
    },
    VERIFY_EMAIL: {
        subject: "Verify your email address",
        heading: "Email Verification",
        preheader: "Verify your email address",
        description: "Use the code below to verify your email address.",
        ignoreText: "If you didn't request this verification, you can safely ignore this email.",
    },
});

export class OtpEmail extends BaseEmail<OtpEmailContext> {
    readonly templateName = "otp";
    readonly subject: string;
    private readonly context: OtpEmailContext;

    constructor(private readonly input: OtpEmailInput) {
        super();

        const template = otpTemplates()[input.purpose as EmailOtpPurpose];

        if (!template) {
            throw new Error(
                `OtpEmail does not support purpose: ${input.purpose}. Only email eligible purposes are allowed.`,
            );
        }

        this.subject = template.subject;

        this.context = {
            ...input,
            purposeHeading: template.heading,
            purposeDescription: template.description,
            purposeIgnoreText: template.ignoreText,
            preheader: template.preheader,
        };
    }

    getContext(): OtpEmailContext {
        return this.context;
    }
}
