// This is a workaround for https://github.com/eslint/eslint/issues/3458
// require('@rushstack/eslint-config/patch/modern-module-resolution');

 
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: [
    "@typescript-eslint"
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  ignorePatterns: [ "**/dist", "**/build", "**/deploy", "**/node_modules", "**/*.spec.ts" ] ,
  rules: {
    "no-underscore-dangle": "off",
    "no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars-experimental": "error"
  }
};

