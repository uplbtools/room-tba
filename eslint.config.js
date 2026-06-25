// eslint.config.js

import prettier from "eslint-config-prettier";
import js from "@eslint/js";
import svelte from "eslint-plugin-svelte";
import eslintPluginAstro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  ...svelte.configs.recommended,
  {
    files: ["**/*.svelte"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "svelte/no-dom-manipulating": "off",
      "svelte/prefer-svelte-reactivity": "off",
    },
  },
  {
    files: ["**/*.ts", "**/*.astro"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  prettier,
  ...svelte.configs.prettier,
];
