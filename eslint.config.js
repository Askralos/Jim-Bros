import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

// Lint léger : attrape le code mort (imports/variables inutilisés), les variables
// non définies et les erreurs classiques de hooks React. Lancer avec `pnpm lint`.
export default [
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "18.3" } },
    rules: {
      "no-unused-vars": ["warn", { args: "after-used" }],
      "no-undef": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "warn",
      "react/jsx-uses-vars": "warn",
      "react/jsx-key": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
