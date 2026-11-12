import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next.js 16: eslint-config-next ships flat configs, so no compatibility layer is needed.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // New in Next.js 16 (React Compiler guidance). The existing code predates them and works; they stay
    // visible as warnings and are cleaned up as each component is next changed.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts", "docs/**", "out/**", "build/**"]),
]);
