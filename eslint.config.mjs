// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.config.{js,mjs,cjs,ts}', '.changeset/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // The v2 standard (docs/v2-migration/06-standards.md): no escape hatch.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
