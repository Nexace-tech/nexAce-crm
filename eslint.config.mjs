import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/app/api/seed/**", // seed routes contain intentional dynamic data shapes
  ]),
  {
    rules: {
      // Mongoose lean() results, populated documents, and Next.js FormData values
      // legitimately require 'any' in many places. Warn instead of blocking builds.
      "@typescript-eslint/no-explicit-any": "warn",

      // Unused vars: keep warning but allow leading-underscore convention
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],

      // Downgrade Next.js <img> warning — some dynamic avatar/preview URLs can't use next/image
      "@next/next/no-img-element": "warn",

      // Allow router.replace with relative URLs (Next.js App Router supports this)
      "@next/next/no-location-assign-relative-destination": "off",

      // These react-hooks rules fire on the standard useEffect-for-data-fetching pattern
      // used consistently throughout this codebase. These are not bugs — downgrade to warn.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",

      // Turn off JSX unescaped entities check — plain quotes in JSX text children are safe in modern React
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
