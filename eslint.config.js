// Flat config. Type-aware linting is enabled for src/ and the Node side: the
// relevant rules (floating promises around worker RPC, unchecked `any` from the
// SDK's wire types) require the type checker.

import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist", "public", "node_modules"] },
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        files: ["src/**/*.{ts,tsx}"],
        languageOptions: { globals: { ...globals.browser, ...globals.worker } },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
        },
    },
    {
        files: ["vite.config.ts", "server/**/*.ts", "prepare.ts"],
        languageOptions: { globals: globals.node },
    },
    {
        // This config is the only plain JS file and no tsconfig covers it.
        files: ["**/*.js"],
        extends: [tseslint.configs.disableTypeChecked],
        languageOptions: { globals: globals.node },
    },
    {
        // Console output is the bench's run log.
        rules: { "no-console": "off" },
    },
);
