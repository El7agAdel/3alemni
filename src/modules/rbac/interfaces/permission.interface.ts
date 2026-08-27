export interface Permission {
    readonly key: string;
    readonly resource: string;
    readonly action: string;
    readonly displayName: string;
    readonly description: string;
    readonly group: string;
}
