// @ts-check
import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["eslint.config.mjs", "dist/", "node_modules/", "prisma/generated/", "prisma.config.ts", "scripts/"],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    eslintPluginPrettierRecommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
            sourceType: "commonjs",
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        plugins: {
            "simple-import-sort": simpleImportSort,
        },
        rules: {
            // TypeScript
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-floating-promises": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { varsIgnorePattern: "^_", argsIgnorePattern: "^_", ignoreRestSiblings: true },
            ],

            // General
            "no-duplicate-imports": "error",
            "no-unused-expressions": "error",
            "prefer-const": "error",

            // Complexity
            "max-depth": ["error", 3],
            "max-lines-per-function": ["error", { max: 150, skipBlankLines: true, skipComments: true }],
            "complexity": ["error", 20],

            // Import sorting
            "simple-import-sort/imports": [
                "error",
                {
                    groups: [
                        // Side effect imports
                        ["^\\u0000"],
                        // Node.js builtins
                        ["^node:"],
                        // External packages
                        ["^@(?!(generated|common|modules|shared|config|infra|tasks)(/|$))\\w", "^\\w"],
                        // Internal aliases
                        ["^@(generated|common|modules|shared|config|infra|tasks)"],
                        // Parent imports
                        ["^\\.\\."],
                        // Same folder imports
                        ["^\\."],
                    ],
                },
            ],
            "simple-import-sort/exports": "error",

            // Prettier
            "prettier/prettier": ["error", { endOfLine: "auto" }],
        },
    },
    {
        files: ["src/**/dto/responses/**/*.ts"],
        rules: {
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
        },
    },
);
