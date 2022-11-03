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
            'brace-style':      ['error', '1tbs'],
            'curly':            ['error', 'all'],
            'indent':           'error',
            'no-throw-literal': 'off',
            'padded-blocks':    'off',
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
            '@typescript-eslint/brace-style':   ['error', '1tbs'],
            '@typescript-eslint/indent':        'error',
            'curly':                            ['error', 'all'],
            'no-throw-literal':                 'off',
            'padded-blocks':                    'off',
            'tsdoc/syntax':                     'error',
        },
    },
);

config.ignorePatterns = ['/coverage', '/example/demo'];

module.exports = config;
