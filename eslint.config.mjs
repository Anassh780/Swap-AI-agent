import { FlatCompat } from '@eslint/eslintrc';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nextVitals from 'eslint-config-next/core-web-vitals.js';
import nextTypeScript from 'eslint-config-next/typescript.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  ...compat.config(nextVitals),
  ...compat.config(nextTypeScript),
  {
    ignores: ['.next/**', 'coverage/**', 'node_modules/**'],
  },
  {
    files: ['next-env.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
];

export default config;
