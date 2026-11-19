import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
  {
    ignores: ["**/node_modules/**", "**/coverage/**", "frontend/.expo/**", "frontend/dist/**", "frontend/web-build/**"],
  },
  {
    files: ["backend/**/*.js"],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
  },
  {
    // `const { campo, ...resto } = objeto` saca un campo a propósito, y `_nombre` marca algo que no se usa.
    files: ["**/*.js"],
    rules: {
      "no-unused-vars": ["error", { ignoreRestSiblings: true, varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    },
  },
  {
    // Los tests del backend importan describe, it y expect de @jest/globals; igual se declaran por si alguno no lo hace.
    files: ["backend/test/**/*.js"],
    languageOptions: { globals: globals.jest },
  },
  {
    files: ["frontend/**/*.js"],
    extends: [js.configs.recommended, react.configs.flat.recommended, react.configs.flat["jsx-runtime"]],
    plugins: { "react-hooks": reactHooks },
    // Fija, igual a la de frontend/package.json: "detect" busca react en la raíz, donde no está instalado.
    settings: { react: { version: "19.3" } },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      // React Native ofrece fetch, setTimeout y console como el navegador; `process.env.EXPO_PUBLIC_*` lo reemplaza Expo.
      globals: { ...globals.browser, process: "readonly", __DEV__: "readonly" },
    },
    rules: {
      // Solo las dos reglas clásicas de hooks; las del React Compiler (v6 en adelante) no aplican a este proyecto.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Sin TypeScript ni PropTypes: las props se documentan con comentarios.
      "react/prop-types": "off",
    },
  },
  {
    // jest-expo declara describe, it y expect como globales (los tests del frontend no los importan).
    files: ["frontend/**/*.test.js"],
    languageOptions: { globals: { ...globals.jest, global: "readonly" } },
  },
  // Al final: apaga las reglas de estilo que se pisan con Prettier.
  prettier,
]);
