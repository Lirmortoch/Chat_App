import globals from 'globals';
import js from '@eslint/js';
// import stylisticJs from '@stylistic/eslint-plugin';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'module' },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  // {
  //   plugins: {
  //     '@stylistic/js': stylisticJs,
  //   },
  //   rules: {
  //     '@stylistic/js/indent': 'off',
  //     '@stylistic/js/linebreak-style': ['error', 'unix'],
  //     '@stylistic/js/quotes': 'off',
  //     '@stylistic/js/semi': 'off',
  //   },
  // },
  // {
  //   ignores: ['dist/**'],
  // },
  // {
  //   rules: {
  //     eqeqeq: 'error',
  //     'no-trailing-spaces': 'warn',
  //     'object-curly-spacing': ['error', 'always'],
  //     'arrow-spacing': ['error', { before: true, after: true }],
  //     'no-console': 'off',
  //   }
  // },
]);
