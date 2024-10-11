/** @type {import("prettier").Config} */
const config = {
  printWidth: 150,
  tabWidth: 2,
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  overrides: [
    {
      files: ['.eslintrc'],
      options: {
        trailingComma: 'none',
      },
    },
  ],
};

export default config;
