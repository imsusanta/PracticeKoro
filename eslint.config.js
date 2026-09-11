import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Generated artifacts and non-app runtimes are not linted here.
  { ignores: ["dist", "coverage", "android", "supabase/.temp", "practicekoro_student"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Ratchet: warn (not error) until the legacy `any` baseline is gone.
      // CI enforces `--max-warnings <floor>` (see ci.yml) so no NEW
      // violations can land. Lower the floor as cleanups merge.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
