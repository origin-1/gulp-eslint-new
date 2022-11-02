'use strict';

const { createConfig } = require('@origin-1/eslint-config');

const config =
createConfig
(
    {
        files:      '*.js',
        jsVersion:  2020,
        env:        { node: true },
        extends:    'plugin:eslint-comments/recommended',
        rules:
        {
            'brace-style':                      ['error', '1tbs'],
            'curly':                            ['error', 'all'],
            'key-spacing':                      ['error', { mode: 'minimum' }],
            'indent':                           'error',
            'lines-around-comment':             'off',
            'n/prefer-global/process':          'off',
            'no-promise-executor-return':       'off',
            'no-throw-literal':                 'off',
            'no-unused-expressions':            'off',
            'object-shorthand':                 'off',
            'padded-blocks':                    'off',
            'padding-line-between-statements':  'off',
            'require-await':                    'off',
            'sort-imports':                     'off',
        },
    },
    {
        files:          '*.ts',
        tsVersion:      'latest',
        extends:        'plugin:eslint-comments/recommended',
        parserOptions:  { project: 'tsconfig.json' },
        plugins:        ['tsdoc'],
        rules:
        {
            '@typescript-eslint/brace-style':                       ['error', '1tbs'],
            '@typescript-eslint/consistent-type-exports':           'off',
            '@typescript-eslint/consistent-type-imports':           'off',
            '@typescript-eslint/explicit-function-return-type':     'off',
            '@typescript-eslint/indent':                            'error',
            '@typescript-eslint/member-delimiter-style':            'off',
            '@typescript-eslint/no-redundant-type-constituents':    'off',
            '@typescript-eslint/no-unsafe-return':                  'off',
            '@typescript-eslint/no-unused-expressions':             'off',
            '@typescript-eslint/padding-line-between-statements':   'off',
            '@typescript-eslint/require-await':                     'off',
            '@typescript-eslint/unified-signatures':                'off',
            'curly':                                                ['error', 'all'],
            'key-spacing':                                          ['error', { mode: 'minimum' }],
            'lines-around-comment':                                 'off',
            'n/prefer-global/process':                              'off',
            'no-throw-literal':                                     'off',
            'object-shorthand':                                     'off',
            'padded-blocks':                                        'off',
            'sort-imports':                                         'off',
            'tsdoc/syntax':                                         'error',
        },
    },
);

config.ignorePatterns = ['/coverage', '/example/demo'];

module.exports = config;
