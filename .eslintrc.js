module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['plugin:@typescript-eslint/recommended'],
  rules: {
    "semi": ["error", "always"],
    "no-trailing-spaces": "error",
    "@typescript-eslint/no-use-before-define": ["error", { functions: false }]
  }
}