// https://docs.expo.dev/guides/using-eslint/ (SDK 54 pairing: eslint-config-expo ~10)
// Brings eslint-plugin-react-hooks (rules-of-hooks, exhaustive-deps) — the
// audit's top frontend gap: nothing caught bad dep arrays before a device did.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Build output, not source. All three are gitignored; eslint needs telling
    // separately, and without it `npm run lint` drowns in thousands of errors
    // from a web export and hides the real ones.
    ignores: ['node_modules/**', 'dist/**', 'android/**', 'ios/**'],
  },
  {
    rules: {
      // The app's voice uses natural punctuation ("you're", "couldn't") in JSX
      // copy everywhere; escaping to &apos; harms readability for zero runtime
      // benefit (React escapes text nodes itself). Decided at adoption, not to
      // dodge a failing gate.
      'react/no-unescaped-entities': 'off',

      // Icons come from src/components/icons. The lucide barrel re-exports
      // 1,745 icon modules and Metro does not tree-shake, so one barrel import
      // puts the whole library in the download (DEEP-06).
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'lucide-react-native',
              message: "Import icons from 'src/components/icons' instead: the barrel bundles all 1,745 icons.",
            },
          ],
        },
      ],
    },
  },
  {
    // Build-time scripts run under Node, never in the app bundle
    files: ['scripts/**'],
    languageOptions: {
      globals: {
        __dirname: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
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
