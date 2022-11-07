'use strict';

const { createConfig } = require('@origin-1/eslint-config');

const config =
createConfig
(
    {
        files:      '*.js',
        jsVersion:  2020,
        rules:
        {
            'brace-style':      ['error', '1tbs'],
            'indent':           'error',
        },
    },
    {
        files:          '*.ts',
        tsVersion:      'latest',
        parserOptions:  { project: 'tsconfig.json' },
        plugins:        ['tsdoc'],
        rules:
        {
            '@typescript-eslint/brace-style':   ['error', '1tbs'],
            '@typescript-eslint/indent':        'error',
            'tsdoc/syntax':                     'error',
        },
    },
    {
        files:      ['*.js', '*.ts'],
        env:        { node: true },
        extends:    'plugin:eslint-comments/recommended',
        rules:
        {
            'curly':            ['error', 'all'],
            'no-throw-literal': 'off',
            'padded-blocks':    'off',
        },
    },
);

config.ignorePatterns = ['/coverage', '/example/demo'];

module.exports = config;
