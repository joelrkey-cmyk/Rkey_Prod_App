import react from "eslint-plugin-react";
import globals from "globals";

export default [
  {
    files: ["**/*.jsx", "**/*.js"],
    plugins: {
      react,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-undef": "error",
      "react/jsx-no-undef": "error",
    },
  },
];
