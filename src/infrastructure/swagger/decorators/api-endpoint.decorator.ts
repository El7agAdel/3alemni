import { ApiOperation, type ApiOperationOptions } from "@nestjs/swagger";

interface ApiEndpointOptions extends ApiOperationOptions {
    permission?: string;
    anyPermission?: string[];
}

export const ApiEndpoint = (options: ApiEndpointOptions): MethodDecorator => {
    const { permission, anyPermission, description, ...rest } = options;

    const blocks: string[] = [];

    if (permission) blocks.push(`**Required permission:** \`${permission}\``);

    if (anyPermission?.length) {
        const list = anyPermission.map((p) => `\`${p}\``).join(", ");
        blocks.push(`**Required permissions (any of):** ${list}`);
    }

    const finalDescription = [blocks.join("\n\n"), description].filter(Boolean).join("\n\n");

    return ApiOperation({ ...rest, description: finalDescription || undefined });
};
