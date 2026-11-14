import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Regras adicionais/alteradas em relação ao preset do Next.
 *
 * O ESLint 9 exige que uma regra "plugin/regra" seja declarada no MESMO objeto de
 * configuração em que o plugin correspondente está registrado. Por isso estas regras
 * são mescladas no objeto do `eslint-config-next` que declara os plugins (react,
 * react-hooks, @next/next), em vez de ficarem num objeto de configuração separado.
 */
const overrides = {
  "react-hooks/immutability": "off",
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/purity": "off",
  "react-hooks/preserve-manual-memoization": "off",
  "react-hooks/exhaustive-deps": "warn",
  "react/jsx-no-comment-textnodes": "off",
  "react/no-unescaped-entities": "off",
  "@next/next/no-img-element": "off",
};

const nextConfigs = (Array.isArray(next) ? next : [next]).map((entry) =>
  // Só o objeto que registra `react-hooks` também registra `react` e `@next/next`.
  entry && typeof entry === "object" && entry.plugins?.["react-hooks"]
    ? { ...entry, rules: { ...entry.rules, ...overrides } }
    : entry
);

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
  ...nextConfigs,
]);
