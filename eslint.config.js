// Flat config. Type-aware linting is enabled everywhere TypeScript is: the
// relevant rules (floating promises around worker RPC, unchecked `any` from the
// SDK's wire types) require the type checker.

import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
    globalIgnores(["dist", "public", "node_modules"]),
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
            "@typescript-eslint/switch-exhaustiveness-check": "error",
            "eqeqeq": ["error", "always"],
        },
    },
    {
        files: ["src/**/*.{ts,tsx}"],
        extends: [reactHooks.configs.flat["recommended-latest"], reactRefresh.configs.vite],
        languageOptions: { globals: { ...globals.browser, ...globals.worker } },
    },
    {
        files: ["vite.config.ts", "server/**/*.ts", "scripts/**/*.ts", "test/**/*.ts"],
        languageOptions: { globals: globals.node },
    },
    {
        files: ["test/**/*.ts"],
        rules: {
            // node:test's `describe`/`it` return promises the runner tracks itself.
            "@typescript-eslint/no-floating-promises": ["error", {
                allowForKnownSafeCalls: [{ from: "package", package: "node:test", name: ["describe", "it"] }],
            }],
        },
    },
    {
        // This config is the only plain JS file and no tsconfig covers it.
        files: ["**/*.js"],
        extends: [tseslint.configs.disableTypeChecked],
        languageOptions: { globals: globals.node },
    },
);
