import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', '.generated/**', 'node_modules/**', 'lore/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.worker } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^https?:\\/\\//]",
          message: 'No absolute external URLs in source: MERIDIAN has no external connectivity.',
        },
      ],
    },
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.*'],
    rules: { 'no-restricted-syntax': 'off' },
  },
);
