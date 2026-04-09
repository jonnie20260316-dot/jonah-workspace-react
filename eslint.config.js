import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import noSrcObjectWithoutPlay from './eslint-rules/no-srcobject-without-play.js'
import noPickModuleScope from './eslint-rules/no-pick-module-scope.js'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      local: {
        rules: {
          'no-srcobject-without-play': noSrcObjectWithoutPlay,
          'no-pick-module-scope': noPickModuleScope,
        },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'local/no-srcobject-without-play': 'warn',
      'local/no-pick-module-scope': 'error',
    },
  },
])
