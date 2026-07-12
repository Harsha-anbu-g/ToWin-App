// https://docs.expo.dev/guides/using-eslint/ (SDK 54 pairing: eslint-config-expo ~10)
// Brings eslint-plugin-react-hooks (rules-of-hooks, exhaustive-deps) — the
// audit's top frontend gap: nothing caught bad dep arrays before a device did.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['node_modules/**'],
  },
  {
    rules: {
      // The app's voice uses natural punctuation ("you're", "couldn't") in JSX
      // copy everywhere; escaping to &apos; harms readability for zero runtime
      // benefit (React escapes text nodes itself). Decided at adoption, not to
      // dodge a failing gate.
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    // Jest globals for the test suite and its setup file
    files: ['__tests__/**', 'jest.setup.js'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        // Tests run under Node via Jest
        Buffer: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        process: 'readonly',
      },
    },
  },
]);
