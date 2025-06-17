const globals = require('globals');
const tsParser = require('@typescript-eslint/parser');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import');
const mochaPlugin = require('eslint-plugin-mocha');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = [
    {
        ignores: ['node_modules/', 'test/'],
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: {
            '@typescript-eslint': typescriptEslint,
            prettier: prettier,
            import: importPlugin,
            mocha: mochaPlugin,
            'unused-imports': unusedImports,
        },
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
                ecmaFeatures: {
                    jsx: false,
                },
                tsconfigRootDir: '.',
                project: ['./tsconfig.json'],
                projectFolderIgnoreList: ['node_modules', 'dist', 'build', '.yarn', 'build-utils'],
                extraFileExtensions: ['.sol'],
            },
            globals: {
                ...globals.browser,
                ...globals.es6,
                ...globals.node,
                ...globals.mocha,
            },
        },
        rules: {
            ...prettierConfig.rules,
            'prettier/prettier': [
                'warn',
                {
                    endOfLine: 'auto',
                },
            ],
            ...typescriptEslint.configs['eslint-recommended'].rules,
            ...typescriptEslint.configs['recommended'].rules,
            ...typescriptEslint.configs['recommended-requiring-type-checking'].rules,
            ...importPlugin.configs.errors.rules,
            ...importPlugin.configs.warnings.rules,
            ...importPlugin.configs.typescript.rules,

            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-empty-function': 'warn',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'warn',
            'unused-imports/no-unused-imports': 'warn',
            'unused-imports/no-unused-vars': [
                'error',
                { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
            ],
            '@typescript-eslint/no-use-before-define': ['error'],
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-call': 'warn',
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-duplicate-enum-values': 'off',
            'prefer-destructuring': 'off',
            'no-param-reassign': 'error',
            'import/order': [
                'warn',
                {
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: true,
                    },
                    'newlines-between': 'always',
                },
            ],
            'no-duplicate-imports': 'off',
            'import/named': 'off',
            'import/namespace': 'off',
            'import/default': 'off',
            'import/no-named-as-default-member': 'error',
            'import/extensions': 'off',
            'import/no-unresolved': 'off',
            'import/prefer-default-export': 'off',
            'import/no-unused-modules': ['off'],
            'import/no-unassigned-import': 'off',
            'import/no-extraneous-dependencies': [
                'warn',
                {
                    devDependencies: true,
                    optionalDependencies: false,
                    peerDependencies: false,
                },
            ],
            'sort-keys': 'off',
            'comma-dangle': 'off',
            '@typescript-eslint/comma-dangle': ['off'],
            'no-use-before-define': 'off',
            'spaced-comment': 'warn',
            'max-len': 'off',
            indent: 'off',
            'no-console': 'off',
            'arrow-body-style': 'off',
            'no-multiple-empty-lines': 'warn',
            'no-restricted-globals': 'off',
            'eslint linebreak-style': 'off',
            'object-curly-newline': 'off',
            'no-shadow': 'off',
            'no-void': ['error', { allowAsStatement: true }],
        },
    },
    {
        files: ['*.test.ts', '*.test.tsx'],
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
];
