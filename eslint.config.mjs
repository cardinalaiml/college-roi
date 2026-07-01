import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next@16 ships React-19 style rules. This project
    // is pinned to React 18 (see package.json) — the "setState in
    // useEffect on prop change" and "read external store in
    // useEffect" patterns flagged below are still idiomatic there.
    // Revisit if/when the app moves to React 19 + useSyncExternalStore.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
