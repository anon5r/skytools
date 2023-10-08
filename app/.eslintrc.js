module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.eslint.json',
    tsconfigRootDir: __dirname,
    // extraFileExtensions: ['.vue'],
  },
  env: {
    browser: true,
    node: true,
    commonjs: true,
  },
  extends: [
    'plugin:vue/base',
    'plugin:nuxt/recommended',
    'plugin:prettier/recommended',
    'airbnb-base',
    'airbnb-typescript/base',
    'prettier',
  ],
  plugins: ['@typescript-eslint', 'vue', 'prettier'],
  rules: {
    'import/prefer-default-export': 'off',
    '@typescript-eslint/quotes': ['warn', 'single'],
  },
  ignorePatterns: ['node_modules', '.nuxt', 'dist'],
}