/* Doctor Cares — ESLint configuration (v8 classic .eslintrc)
 *
 * Scope: TypeScript + React 18 + accessibility.
 * Prettier is intentionally NOT configured here — formatting lives in the
 * editor, not in the lint gate, so lint stays about correctness.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    // React 18 + TS already handle these; disabling noise:
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',

    // TS-friendly tweaks:
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-function': ['warn', { allow: ['arrowFunctions'] }],

    // Allow apostrophes etc in human copy without /&apos; noise:
    'react/no-unescaped-entities': 'off',

    // Hooks deps are a warning; the codebase has intentional cases.
    'react-hooks/exhaustive-deps': 'warn',

    // Supabase SDK + lucide-react types sometimes surface as `any`; downgrade:
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // Allow triple-slash reference and ambient module augmentation:
    '@typescript-eslint/triple-slash-reference': 'off',
  },
  ignorePatterns: [
    'dist/',
    'dev-dist/',
    'build/',
    'android/',
    'node_modules/',
    '*.config.js',
    '*.config.cjs',
    'scripts/',
    'brag-output*/',
    'walkthrough-output/',
    'full-walkthrough-output/',
    'design-review/',
  ],
};
