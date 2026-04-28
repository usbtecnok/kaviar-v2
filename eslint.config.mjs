import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  // Ignore build artifacts, dependencies, and frontend-app (JSX needs separate parser)
  { ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.expo/**', 'backend/generated/**', 'frontend-app/**'] },

  // Base JS rules (recommended, downgraded to warn)
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': 'off', // handled by TS rule below
      'no-undef': 'off',       // TypeScript handles this
      'no-empty': 'warn',
    },
  },

  // TypeScript rules (conservative)
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),

  // Override: everything as warn, never error
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'no-debugger': 'warn',
      'no-empty': 'warn',
      'no-useless-assignment': 'warn',
      'prefer-const': 'warn',
      'eqeqeq': ['warn', 'smart'],
    },
  },
];
