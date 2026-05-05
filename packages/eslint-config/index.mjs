import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

/** Base ESLint config for TypeScript packages. */
export const base = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: ["**/dist/", "**/coverage/", "**/node_modules/"],
  }
);

export default base;
