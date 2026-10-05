import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([
  {
    ignores: [
      "out/**",
      "out-admin/**",
      "out-site/**",
      "out-admingeral/**",
      ".next/**",
      "public/**",
      "scratch/**",
      "node_modules/**"
    ],
  },
  ...next,
  {
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-no-comment-textnodes": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "off",
    },
  },
]);
