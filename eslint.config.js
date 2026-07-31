import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // React hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Relax rules that would be too noisy on existing codebase
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/triple-slash-reference": "off",
      "no-empty": "warn",
      "no-case-declarations": "warn",
      "no-control-regex": "warn",
      "prefer-const": "warn",
    },
  },
  {
    // Build-time Node scripts. `npm run lint` only covers src/, but these are still
    // linted when eslint is pointed at the repo root, and they run on Node globals
    // that the default browser-ish environment doesn't declare.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        fetch: "readonly",
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        AbortSignal: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
  },
  {
    ignores: [
      "dist/",
      ".astro/",
      "node_modules/",
      "checkly/",
      "scripts/validate-deployment/",
    ],
  }
);
