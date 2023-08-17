module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['**/dist', '**/build', '**/deploy', '**/node_modules', '**/*.spec.ts'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
    'no-prototype-builtins': 'off',
    'no-underscore-dangle': 'off',
    'no-unused-vars': 'off',
    'sort-imports': [
      'error',
      {
        ignoreCase: true,
        ignoreDeclarationSort: true,
        ignoreMemberSort: true,
        allowSeparatedGroups: false,
      },
    ],
  },
};
