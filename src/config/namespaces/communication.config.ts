export interface SmtpAccount {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
    fromAddress: string;
    fromName: string;
}

export interface CommunicationConfig {
    devMode: boolean;
    mailer: {
        accounts: SmtpAccount[];
    };
    whatsapp: {
        enabled: boolean;
        apiUrl: string;
        accessToken: string;
        phoneNumberId: string;
    };
    fcm: {
        enabled: boolean;
        projectId: string;
        privateKey: string;
        clientEmail: string;
    };
}
