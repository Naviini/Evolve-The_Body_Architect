// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['refactor.js', 'scripts/**/*.js', 'scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    files: ['**/BodyModel3DCanvas.native.tsx', '**/BodyModel3DCanvas.web.tsx'],
    rules: {
      'react/no-unknown-property': 'off',
    },
  },
  {
    files: [
      'app/(tabs)/workout-session.tsx',
      'app/workout-session.tsx',
    ],
    rules: {
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    files: ['**/BodyModel3D.native.tsx'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
